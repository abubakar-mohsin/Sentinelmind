package com.sentinelmind.orchestrator;

import com.sentinelmind.agents.AgentFactory;
import com.sentinelmind.api.WebSocketGateway;
import com.sentinelmind.audit.Incident;
import com.sentinelmind.audit.IncidentRepository;
import com.sentinelmind.graph.KnowledgeGraphService;
import com.sentinelmind.messaging.EventProducer;
import com.sentinelmind.messaging.KafkaTopics;
import com.sentinelmind.model.Finding;
import com.sentinelmind.model.IncidentReport;
import com.sentinelmind.model.SecurityEvent;
import com.sentinelmind.model.WebSocketMessage;
import com.sentinelmind.llm.GroqClient;
import com.sentinelmind.orchestrator.handlers.AbstractEventHandler;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

/**
 * OrchestratorAgent — the brain of SentinelMind.
 *
 * Implements a ReAct (Reason + Act) loop:
 *   1. Receive raw event from Kafka
 *   2. Query Neo4j for context (known-bad IP? user baseline?)
 *   3. Dispatch agents in sequence: Anomaly → ThreatIntel → Classifier
 *   4. Collect findings and compute weighted confidence score
 *   5. If confidence >= 0.92: authorize IncidentResponder
 *   6. Persist incident to PostgreSQL, broadcast status to React dashboard
 *
 * The Orchestrator never ANALYZES events itself — it only decides which agents
 * to call and whether combined evidence is strong enough to authorize a response.
 *
 * Uses the Factory pattern (AgentFactory) to obtain agents and the Builder pattern
 * (IncidentReport.Builder) to assemble the final incident report step by step.
 */
@Component
public class OrchestratorAgent {

    private static final Logger log = LoggerFactory.getLogger(OrchestratorAgent.class);

    /**
     * System prompt for the Orchestrator's ReAct reasoning steps.
     * Instructs the model to return one of six decisions in strict JSON format.
     * The Orchestrator uses the "decision" field to decide whether to continue,
     * gather more intel, or dismiss the event as a false positive.
     */
    private static final String ORCHESTRATOR_SYSTEM_PROMPT = """
            You are an elite autonomous cybersecurity orchestrator AI — SentinelMind.
            You reason like a senior SOC analyst and produce detailed, multi-step forensic reasoning.

            You MUST respond ONLY with valid JSON in this exact format — no markdown, no prose:
            {
                "decision": "INVESTIGATE_ANOMALY" | "INVESTIGATE_THREAT_INTEL" |
                            "CLASSIFY_ATTACK" | "AUTHORIZE_RESPONSE" |
                            "DISMISS" | "GATHER_MORE_INTEL",
                "confidence": 0.0-1.0,
                "reasoning": "<multi-line detailed reasoning here>",
                "urgency": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
            }

            CRITICAL: The "reasoning" field MUST be a detailed, multi-step analysis.
            Write 4-6 lines covering ALL of these points (use actual numbers from the input):
              Step 1 — Behavioral analysis: cite the exact z-score, explain what it means statistically
                        (e.g. how many standard deviations from baseline, session count context).
              Step 2 — Geolocation & temporal analysis: comment on the source country vs typical country,
                        the login hour vs typical hours, what this combination implies.
              Step 3 — Technical indicators: analyse the login latency (robotic < 500ms?), any Tor/proxy
                        indicators, feed count if available.
              Step 4 — Threat intelligence context: tie the IP reputation to known attack campaigns if data
                        is provided; explain significance of the feed count.
              Step 5 — Confidence & decision rationale: state the combined confidence percentage,
                        explain precisely why you are making this decision (not just what it is).
            Use specific numbers. Sound like an expert. Do NOT be vague or generic.

            Decision guide:
            - INVESTIGATE_ANOMALY: check if behavior deviates from baseline
            - INVESTIGATE_THREAT_INTEL: check IP/domain reputation feeds
            - CLASSIFY_ATTACK: map findings to MITRE ATT&CK techniques
            - AUTHORIZE_RESPONSE: confidence is high enough, take automated action
            - DISMISS: this is a false positive, stop investigating
            - GATHER_MORE_INTEL: need more information before deciding
            """;

    // Per-agent blocking queues — findings arrive asynchronously via onFinding()
    // and are routed here so the ReAct loop can wait for each one.
    private final BlockingQueue<Finding> anomalyQueue     = new LinkedBlockingQueue<>();
    private final BlockingQueue<Finding> threatIntelQueue = new LinkedBlockingQueue<>();
    private final BlockingQueue<Finding> classifierQueue  = new LinkedBlockingQueue<>();

    private final AgentFactory           agentFactory;
    private final EventProducer          eventProducer;
    private final KnowledgeGraphService  graphService;
    private final ConfidenceCalculator   confidenceCalc;
    private final WebSocketGateway       wsGateway;
    private final IncidentRepository     incidentRepo;
    private final AbstractEventHandler   handlerChain;
    private final GroqClient             groqClient;   // nullable-safe: isConfigured() checked before use

    @Value("${sentinelmind.confidence-threshold:0.92}")
    private double confidenceThreshold;

    @Value("${sentinelmind.react-max-iterations:5}")
    private int maxIterations;

    public OrchestratorAgent(AgentFactory agentFactory,
                             EventProducer eventProducer,
                             KnowledgeGraphService graphService,
                             ConfidenceCalculator confidenceCalc,
                             WebSocketGateway wsGateway,
                             IncidentRepository incidentRepo,
                             AbstractEventHandler handlerChain,
                             GroqClient groqClient) {
        this.agentFactory   = agentFactory;
        this.eventProducer  = eventProducer;
        this.graphService   = graphService;
        this.confidenceCalc = confidenceCalc;
        this.wsGateway      = wsGateway;
        this.incidentRepo   = incidentRepo;
        this.handlerChain   = handlerChain;
        this.groqClient     = groqClient;
    }

    /**
     * Entry point: raw security event arrives from the Kafka raw-events topic.
     * This kicks off the full ReAct reasoning loop.
     */
    @KafkaListener(topics = KafkaTopics.RAW_EVENTS, groupId = "orchestrator-group")
    public void onEvent(SecurityEvent event) {
        String incidentId = UUID.randomUUID().toString();
        long   startMs    = System.currentTimeMillis();

        log.info("[ORCHESTRATOR] ═══ New event received — incidentId={} actor={} ip={}",
                incidentId, event.getActor(), event.getSourceIp());

        // Broadcast: Orchestrator woke up
        wsGateway.broadcast(WebSocketMessage.agentActivated(incidentId, "OrchestratorAgent"));

        // --- REASON: Query Neo4j for context (parameterized — no string concatenation) ---
        // Also reads incidentCount so we can warn if this IP has attacked before.
        Map<String, Object> ipContext = graphService.queryOne(
            "MATCH (ip:IP {address: $address}) " +
            "RETURN ip.isTorNode AS isTorNode, ip.feedCount AS feedCount, " +
            "ip.reputation AS reputation, ip.incidentCount AS incidentCount, " +
            "ip.lastIncidentId AS lastIncidentId",
            Map.of("address", event.getSourceIp())
        );
        if (ipContext != null) {
            Object prevCount = ipContext.get("incidentCount");
            if (prevCount != null && ((Number) prevCount).intValue() > 0) {
                log.warn("[ORCHESTRATOR] REPEAT ATTACKER: ip={} seen in {} previous incident(s). Last incidentId={}",
                    event.getSourceIp(), prevCount, ipContext.get("lastIncidentId"));
            } else {
                log.info("[ORCHESTRATOR] Graph context — ip={} reputation={} isTorNode={} feedCount={}",
                    event.getSourceIp(), ipContext.get("reputation"),
                    ipContext.get("isTorNode"), ipContext.get("feedCount"));
            }
        } else {
            log.info("[ORCHESTRATOR] ip={} not found in knowledge graph — new or unknown attacker",
                event.getSourceIp());
        }

        // ═══ GRAPH ENRICHMENT STEP 1 — Create Incident node, link to user ═══
        try {
            graphService.createIncidentNode(incidentId, "INVESTIGATING", 0.0, "OPEN");
            if (event.getActor() != null) {
                graphService.linkIncidentToUser(incidentId, event.getActor());
            }
            if (event.getSourceIp() != null) {
                graphService.linkIncidentToIp(incidentId, event.getSourceIp());
            }
            // Broadcast batch graph update to frontend
            wsGateway.broadcast(WebSocketMessage.graphUpdated(incidentId, "INCIDENT_CREATED",
                List.of(
                    Map.of("id", incidentId, "type", "Incident", "label", incidentId.substring(0, 8),
                           "props", Map.of("severity", "INVESTIGATING", "status", "OPEN"))
                ),
                buildInitialEdges(incidentId, event.getActor(), event.getSourceIp())
            ));
        } catch (Exception e) {
            log.warn("[ORCHESTRATOR] Graph enrichment step 1 failed: {}", e.getMessage());
        }

        // Build the incident report incrementally using the Builder pattern
        IncidentReport.Builder reportBuilder = new IncidentReport.Builder()
                .incidentId(incidentId)
                .triggeringEvent(event);

        // ═══════════════════════════════════════════════
        // ITERATION 1 — Anomaly Detection
        // ═══════════════════════════════════════════════
        wsGateway.broadcast(WebSocketMessage.agentActivated(incidentId, "AnomalyDetectionAgent"));
        eventProducer.publishToAgent(KafkaTopics.AGENT_ANOMALY, event);

        Finding anomalyFinding = waitForFinding(anomalyQueue, "AnomalyDetectionAgent", 5);
        if (anomalyFinding == null) {
            log.warn("[ORCHESTRATOR] Anomaly agent timed out — using default finding");
            anomalyFinding = Finding.builder().agentName("AnomalyDetectionAgent")
                    .severity("MEDIUM").zScore(3.0).confidence(0.30).summary("Timeout").build();
        }

        wsGateway.broadcast(WebSocketMessage.findingCreated(incidentId, anomalyFinding));
        handlerChain.handle(anomalyFinding);
        reportBuilder.anomalyScore(anomalyFinding.getZScore());
        
        double currentConfidence = confidenceCalc.calculatePartial(anomalyFinding.getZScore(), null, null);
        wsGateway.broadcast(WebSocketMessage.confidenceUpdated(incidentId, currentConfidence));

        // Run severity chain on anomaly finding to decide whether to escalate
        if (anomalyFinding.getSeverityLevel() < AbstractEventHandler.MEDIUM) {
            log.info("[ORCHESTRATOR] Anomaly LOW — not escalating further");
            return;
        }

        // ═══════════════════════════════════════════════
        // ReAct REASONING STEP 1 — Should we investigate threat intel?
        // Groq reasons over the anomaly evidence and returns a structured decision.
        // Falls back to "CONTINUE" (proceed with pipeline) when Groq is not configured.
        // ═══════════════════════════════════════════════
        StringBuilder eventContext = new StringBuilder();
        if (event.getFailedAttempts() != null) eventContext.append(String.format(" | Failed Attempts: %d", event.getFailedAttempts()));
        if (event.getFilesAccessed() != null) eventContext.append(String.format(" | Files Accessed: %d", event.getFilesAccessed()));
        if (event.getDataVolumeGB() != null) eventContext.append(String.format(" | Data Volume: %d GB", event.getDataVolumeGB()));
        if (event.getPreviousLoginCountry() != null) eventContext.append(String.format(" | Prev Country: %s (%d mins ago)", event.getPreviousLoginCountry(), event.getMinutesSincePreviousLogin()));
        if (event.getUserAgent() != null) eventContext.append(String.format(" | User Agent: %s", event.getUserAgent()));
        if (event.getTargetUser() != null) eventContext.append(String.format(" | Target User: %s", event.getTargetUser()));

        String situation1 = String.format(
                "SECURITY EVENT RECEIVED — Actor: %s | Source IP: %s\n" +
                "Action: %s | Country: %s | Hour: %d:00 UTC | Login latency: %dms%s\n\n" +
                "ANOMALY AGENT REPORT:\n" +
                "  Z-score: %.2f (%s)\n" +
                "  Severity: %s\n" +
                "  Summary: %s\n\n" +
                "QUESTION: Should I escalate to threat intelligence reputation feed analysis on IP %s?",
                event.getActor() != null ? event.getActor() : "unknown",
                event.getSourceIp(),
                event.getAction() != null ? event.getAction() : "LOGIN",
                event.getCountry() != null ? event.getCountry() : "UNKNOWN",
                event.getHour(),
                event.getLoginLatencyMs(),
                eventContext.toString(),
                anomalyFinding.getZScore(),
                anomalyFinding.getBaselineSummary() != null ? anomalyFinding.getBaselineSummary() : "user baseline: 245 recorded sessions, typical login PK 09:00-18:00",
                anomalyFinding.getSeverity(),
                anomalyFinding.getSummary() != null ? anomalyFinding.getSummary() : "No additional summary",
                event.getSourceIp()
        );
        String decision1 = askGroq(situation1, incidentId);
        log.info("[ORCHESTRATOR] AI decision after anomaly: {}", decision1);

        if ("DISMISS".equals(decision1)) {
            log.info("[ORCHESTRATOR] AI dismissed this event as low risk after anomaly review");
            long elapsed1 = System.currentTimeMillis() - startMs;
            wsGateway.broadcast(WebSocketMessage.incidentContained(incidentId, elapsed1, 0));
            return;
        }

        // ═══════════════════════════════════════════════
        // ITERATION 2 — Threat Intelligence
        // ═══════════════════════════════════════════════
        wsGateway.broadcast(WebSocketMessage.agentActivated(incidentId, "ThreatIntelAgent"));
        eventProducer.publishToAgent(KafkaTopics.AGENT_THREATINTEL, event);

        Finding threatFinding = waitForFinding(threatIntelQueue, "ThreatIntelAgent", 5);
        if (threatFinding == null) {
            log.warn("[ORCHESTRATOR] ThreatIntel agent timed out — using default finding");
            threatFinding = Finding.builder().agentName("ThreatIntelAgent")
                    .severity("CLEAN").feedCount(0).confidence(0.0).summary("Timeout").build();
        }

        wsGateway.broadcast(WebSocketMessage.findingCreated(incidentId, threatFinding));
        handlerChain.handle(threatFinding);
        reportBuilder.threatIntelResult(threatFinding.getSummary());

        // ═══ GRAPH ENRICHMENT STEP 2 — IP reputation confirmed ═══
        try {
            if (threatFinding.isMalicious() && event.getSourceIp() != null) {
                // No new nodes needed — IP already exists. Broadcast edge confirmation.
                wsGateway.broadcast(WebSocketMessage.graphUpdated(incidentId, "THREAT_INTEL_CONFIRMED",
                    List.of(), // no new nodes
                    List.of(Map.of("source", "ip-" + event.getSourceIp(), "target",
                            event.getActor() != null ? "user-" + event.getActor() : incidentId,
                            "type", "TARGETED", "props", Map.of("confirmed", true)))
                ));
            }
        } catch (Exception e) {
            log.warn("[ORCHESTRATOR] Graph enrichment step 2 failed: {}", e.getMessage());
        }

        currentConfidence = confidenceCalc.calculatePartial(anomalyFinding.getZScore(), threatFinding.getFeedCount(), null);
        wsGateway.broadcast(WebSocketMessage.confidenceUpdated(incidentId, currentConfidence));

        // ═══════════════════════════════════════════════
        // ReAct REASONING STEP 2 — Should we classify and authorize response?
        // Combined evidence: anomaly z-score + threat feed hits + Tor node status.
        // ═══════════════════════════════════════════════
        String situation2 = String.format(
                "CUMULATIVE EVIDENCE SUMMARY — Actor: %s | IP: %s\n\n" +
                "ANOMALY AGENT (complete):\n" +
                "  Summary: %s\n" +
                "  Verdict: %s deviation from 245-session baseline\n\n" +
                "THREAT INTELLIGENCE AGENT (complete):\n" +
                "  IP %s reputation: %s\n" +
                "  Flagged by %d independent threat intelligence feeds\n" +
                "  Is Tor exit node: %s\n" +
                "  %s\n\n" +
                "Weighted confidence formula: (anomaly×0.30) + (threatIntel×0.40) + (classifier×0.30)\n" +
                "Current partial score: anomaly=%.3f×0.30=%.3f | threatIntel=%.3f×0.40=%.3f\n" +
                "Running total before classification: %.3f\n\n" +
                "QUESTION: Should I proceed to MITRE ATT&CK classification and authorize automated containment?",
                event.getActor() != null ? event.getActor() : "unknown",
                event.getSourceIp(),
                anomalyFinding.getSummary() != null ? anomalyFinding.getSummary() : "No additional summary",
                anomalyFinding.getSeverity(),
                event.getSourceIp(),
                threatFinding.isMalicious() ? "MALICIOUS" : "CLEAN",
                threatFinding.getFeedCount(),
                threatFinding.isTorNode() ? "YES — confirmed Tor exit node" : "NO",
                threatFinding.isMalicious() ? "This IP was previously used in credential stuffing campaigns targeting financial institutions." : "No prior campaign association found.",
                Math.min(anomalyFinding.getZScore() / 10.0, 1.0),
                0.30,
                Math.min(anomalyFinding.getZScore() / 10.0, 1.0) * 0.30,
                threatFinding.getFeedCount() >= 1 ? 1.0 : 0.0,
                0.40,
                threatFinding.getFeedCount() >= 1 ? 1.0 : 0.0,
                Math.min(anomalyFinding.getZScore() / 10.0, 1.0) * 0.30
                + (threatFinding.getFeedCount() >= 1 ? 1.0 : 0.0) * 0.40
        );
        String decision2 = askGroq(situation2, incidentId);
        log.info("[ORCHESTRATOR] AI decision after threat intel: {}", decision2);

        if ("DISMISS".equals(decision2)) {
            log.info("[ORCHESTRATOR] AI dismissed after threat intel — likely false positive");
            long elapsed2 = System.currentTimeMillis() - startMs;
            wsGateway.broadcast(WebSocketMessage.incidentContained(incidentId, elapsed2, 0));
            return;
        }

        // ═══════════════════════════════════════════════
        // ITERATION 3 — Threat Classification
        // ═══════════════════════════════════════════════
        wsGateway.broadcast(WebSocketMessage.agentActivated(incidentId, "ThreatClassifierAgent"));
        eventProducer.publishToAgent(KafkaTopics.AGENT_CLASSIFIER, event);

        Finding classifierFinding = waitForFinding(classifierQueue, "ThreatClassifierAgent", 5);
        if (classifierFinding == null) {
            log.warn("[ORCHESTRATOR] Classifier agent timed out — using default finding");
            classifierFinding = Finding.builder().agentName("ThreatClassifierAgent")
                    .severity("HIGH").ruleMatched(false).confidence(0.3).summary("Timeout").build();
        }

        wsGateway.broadcast(WebSocketMessage.findingCreated(incidentId, classifierFinding));

        List<String> mitreIds   = classifierFinding.getMitreIds()   != null ? classifierFinding.getMitreIds()   : List.of();
        List<String> mitreNames = classifierFinding.getMitreNames() != null ? classifierFinding.getMitreNames() : List.of();
        String firstId   = mitreIds.isEmpty()   ? "UNKNOWN" : mitreIds.get(0);
        String firstName = mitreNames.isEmpty() ? "Unknown" : mitreNames.get(0);
        reportBuilder.mitreMapping(firstId, firstName);

        // ═══ GRAPH ENRICHMENT STEP 3 — Link MITRE techniques ═══
        try {
            List<Map<String, Object>> techNodes = new ArrayList<>();
            List<Map<String, Object>> techEdges = new ArrayList<>();
            for (int i = 0; i < mitreIds.size(); i++) {
                String techId   = mitreIds.get(i);
                String techName = i < mitreNames.size() ? mitreNames.get(i) : techId;
                graphService.linkIncidentToTechnique(incidentId, techId);
                techNodes.add(Map.of("id", techId, "type", "AttackTechnique",
                        "label", techId + " · " + techName, "props", Map.of("name", techName)));
                techEdges.add(Map.of("source", incidentId, "target", techId,
                        "type", "USES_TECHNIQUE", "props", Map.of()));
            }
            wsGateway.broadcast(WebSocketMessage.graphUpdated(incidentId, "MITRE_CLASSIFIED",
                    techNodes, techEdges));
        } catch (Exception e) {
            log.warn("[ORCHESTRATOR] Graph enrichment step 3 failed: {}", e.getMessage());
        }

        // ═══════════════════════════════════════════════
        // REASON: Compute combined confidence score
        // ═══════════════════════════════════════════════
        double confidence = confidenceCalc.calculate(
                anomalyFinding.getZScore(),
                threatFinding.getFeedCount(),
                classifierFinding.isRuleMatched()
        );

        String finalSeverity = determineSeverity(confidence);
        reportBuilder.confidenceScore(confidence).severity(finalSeverity);

        // Update incident node with final severity/confidence
        try {
            graphService.createIncidentNode(incidentId, finalSeverity, confidence, "CLASSIFIED");
        } catch (Exception e) {
            log.warn("[ORCHESTRATOR] Graph incident update failed: {}", e.getMessage());
        }

        log.info("[ORCHESTRATOR] Confidence={} threshold={} severity={}",
                String.format("%.3f", confidence), confidenceThreshold, finalSeverity);

        wsGateway.broadcast(WebSocketMessage.incidentClassified(
                incidentId, finalSeverity, confidence, mitreIds, mitreNames, event.getActor(), event.getSourceIp()));

        // ═══════════════════════════════════════════════
        // Persist to PostgreSQL
        // ═══════════════════════════════════════════════
        saveIncident(incidentId, event, confidence, finalSeverity,
                mitreIds, mitreNames, classifierFinding.getReason());

        // ═══════════════════════════════════════════════
        // ACT: If confidence >= threshold → authorize Incident Responder
        // ═══════════════════════════════════════════════
        if (confidence >= confidenceThreshold) {
            log.info("[ORCHESTRATOR] Confidence {} >= {} — AUTHORIZING RESPONSE",
                    String.format("%.3f", confidence), confidenceThreshold);

            wsGateway.broadcast(WebSocketMessage.agentActivated(incidentId, "IncidentResponderAgent"));
            // Stamp the incidentId onto the event so IncidentResponderAgent uses the same UUID
            // that was saved to the incidents table — ensuring AuditEntry FK integrity.
            event.setIncidentId(incidentId);
            eventProducer.publishToAgent(KafkaTopics.AGENT_RESPONDER, event);

        } else {
            log.info("[ORCHESTRATOR] Confidence below threshold — flagging for human review");
            long elapsed = System.currentTimeMillis() - startMs;
            wsGateway.broadcast(WebSocketMessage.incidentContained(incidentId, elapsed, 0));
        }

        // Write attack evidence back to the knowledge graph so it grows with every demo run:
        // incidentCount increments on the IP node, ATTACKED edges accumulate per incident,
        // and USED_TECHNIQUE edges link this IP to the matched MITRE AttackTechnique nodes.
        writeIncidentToGraph(incidentId, event, confidence, mitreIds,
                System.currentTimeMillis() - startMs);
    }

    /**
     * Receives findings from all agents.
     * Routes each finding to the right per-agent BlockingQueue so the ReAct loop
     * can pick it up with waitForFinding().
     */
    @KafkaListener(topics = KafkaTopics.FINDINGS, groupId = "orchestrator-findings-group")
    public void onFinding(Finding finding) {
        if (finding == null || finding.getAgentName() == null) return;

        log.debug("[ORCHESTRATOR] Received finding from {}", finding.getAgentName());

        switch (finding.getAgentName()) {
            case "AnomalyDetectionAgent"   -> anomalyQueue.offer(finding);
            case "ThreatIntelAgent"        -> threatIntelQueue.offer(finding);
            case "ThreatClassifierAgent"   -> classifierQueue.offer(finding);
            default -> log.debug("[ORCHESTRATOR] Ignoring finding from {}", finding.getAgentName());
        }
    }

    /**
     * Ask Groq what to do next in the ReAct reasoning loop.
     *
     * This is the "Reason" step of ReAct: given the current situation (expressed as a
     * natural-language string), the AI decides which action to take next.
     * The returned decision string (e.g. "INVESTIGATE_THREAT_INTEL", "DISMISS") drives
     * whether the Orchestrator continues, skips steps, or stops early.
     *
     * Falls back to "CONTINUE" (always proceed) when Groq is not configured,
     * so the pipeline degrades gracefully to fully rule-based behaviour in demo/mock mode.
     */
    private String askGroq(String situation, String incidentId) {
        if (!groqClient.isConfigured()) {
            log.debug("[ORCHESTRATOR] Groq not configured — skipping AI reasoning, using CONTINUE");
            broadcastAiReasoning(
                    incidentId,
                    "RULE_BASED",
                    "RULE_BASED_DECISION",
                    "Rule-based fallback: Groq API not configured. Proceeding automatically based on the confidence threshold calculation. This is not AI reasoning.",
                    situation
            );
            return "CONTINUE";
        }

        try {
            String response = groqClient.chat(ORCHESTRATOR_SYSTEM_PROMPT, situation);

            // Extract the "decision" field from the JSON response
            String clean = response.trim();
            if (clean.startsWith("```")) {
                clean = clean.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
            }
            int start = clean.indexOf('{');
            int end   = clean.lastIndexOf('}') + 1;
            if (start == -1 || end == 0) {
                broadcastAiReasoning(
                        incidentId,
                        "RULE_BASED",
                        "RULE_BASED_FALLBACK",
                        "Groq returned an unparseable response. Falling back to the rule-based investigation pipeline. This is not AI reasoning.",
                        situation
                );
                return "CONTINUE";
            }

            // Use lenient mapper — Groq's verbose reasoning field contains literal newlines
            ObjectMapper mapper = new ObjectMapper()
                    .configure(com.fasterxml.jackson.core.JsonParser.Feature.ALLOW_UNQUOTED_CONTROL_CHARS, true);
            JsonNode root = mapper.readTree(clean.substring(start, end));
            String decision = root.path("decision").asText("CONTINUE");
            String reasoning = root.path("reasoning").asText("");
            log.info("[ORCHESTRATOR] Groq decision='{}' reasoning='{}'", decision, reasoning);

            broadcastAiReasoning(
                    incidentId,
                    "GROQ_AI",
                    decision,
                    reasoning,
                    situation
            );

            return decision;

        } catch (Exception e) {
            log.error("[ORCHESTRATOR] askGroq failed: {} — defaulting to CONTINUE", e.getMessage());
            broadcastAiReasoning(
                    incidentId,
                    "RULE_BASED",
                    "RULE_BASED_FALLBACK",
                    "Groq API unavailable. Falling back to a rule-based decision and continuing the investigation pipeline. This is not AI reasoning.",
                    situation
            );
            return "CONTINUE";
        }
    }

    private void broadcastAiReasoning(String incidentId, String dataSource, String status,
                                      String message, String summary) {
        wsGateway.broadcast(WebSocketMessage.builder()
                .type("AI_REASONING")
                .incidentId(incidentId)
                .timestamp(Instant.now().toString())
                .agentName("OrchestratorAgent")
                .dataSource(dataSource)
                .agentStatus(status)
                .message(message)
                .summary(summary)
                .build());
    }

    /** Block until a finding arrives or timeout expires. Returns null on timeout. */
    private Finding waitForFinding(BlockingQueue<Finding> queue, String agentName, int timeoutSeconds) {
        try {
            Finding f = queue.poll(timeoutSeconds, TimeUnit.SECONDS);
            if (f == null) log.warn("[ORCHESTRATOR] Timed out waiting for {}", agentName);
            return f;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("[ORCHESTRATOR] Interrupted while waiting for {}", agentName);
            return null;
        }
    }

    private String determineSeverity(double confidence) {
        if (confidence >= 0.92) return "CRITICAL";
        if (confidence >= 0.70) return "HIGH";
        if (confidence >= 0.40) return "MEDIUM";
        return "LOW";
    }

    /**
     * Write the results of this incident back to Neo4j.
     *
     * Three writes per incident:
     *   1. SET on IP node — increments incidentCount, stamps lastIncidentId + lastTechnique
     *   2. CREATE ATTACKED relationship — one edge per incident with full evidence properties
     *   3. MERGE USED_TECHNIQUE edges — idempotent link from IP to MITRE AttackTechnique nodes
     *
     * "contained" is true only when confidence >= threshold (i.e. the responder was authorized).
     * Wrapped in try/catch so a Neo4j outage never kills the main pipeline.
     */
    private void writeIncidentToGraph(String incidentId, SecurityEvent event, double confidence,
                                      List<String> mitreIds, long elapsedMs) {
        String  timestamp  = Instant.now().toString();
        String  mitreIdStr = String.join(",", mitreIds);
        boolean contained  = confidence >= confidenceThreshold;

        try {
            // WRITE 1 — Update the attacker IP node with the latest incident data.
            graphService.runCypher(
                "MATCH (ip:IP {address: $sourceIp}) " +
                "SET ip.lastSeen        = $timestamp, " +
                "    ip.incidentCount   = coalesce(ip.incidentCount, 0) + 1, " +
                "    ip.lastIncidentId  = $incidentId, " +
                "    ip.lastTechnique   = $mitreIds",
                Map.of(
                    "sourceIp",   event.getSourceIp(),
                    "timestamp",  timestamp,
                    "incidentId", incidentId,
                    "mitreIds",   mitreIdStr
                )
            );

            // WRITE 2 — Create an ATTACKED relationship capturing the full incident context.
            // One new edge per incident — historical record of every attack attempt.
            graphService.runCypher(
                "MATCH (ip:IP {address: $sourceIp}) " +
                "MATCH (u:User {email: $actor}) " +
                "CREATE (ip)-[:ATTACKED {" +
                "    incidentId:    $incidentId, " +
                "    timestamp:     $timestamp, " +
                "    technique:     $mitreIds, " +
                "    confidence:    $confidence, " +
                "    contained:     $contained, " +
                "    responseTimeMs: $responseTimeMs" +
                "}]->(u)",
                Map.of(
                    "sourceIp",       event.getSourceIp(),
                    "actor",          event.getActor(),
                    "incidentId",     incidentId,
                    "timestamp",      timestamp,
                    "mitreIds",       mitreIdStr,
                    "confidence",     confidence,
                    "contained",      contained,
                    "responseTimeMs", elapsedMs
                )
            );

            // WRITE 3 — MERGE USED_TECHNIQUE edges from this IP to matched MITRE nodes.
            // MERGE (not CREATE) so repeated demo runs produce one edge per technique, not N.
            if (!mitreIds.isEmpty()) {
                graphService.runCypher(
                    "MATCH (tech:AttackTechnique) WHERE tech.id IN $mitreIdsList " +
                    "MATCH (ip:IP {address: $sourceIp}) " +
                    "MERGE (ip)-[:USED_TECHNIQUE]->(tech)",
                    Map.of(
                        "mitreIdsList", mitreIds,
                        "sourceIp",     event.getSourceIp()
                    )
                );
            }

            log.info("[ORCHESTRATOR] Knowledge graph updated — incidentId={} ip={} techniques={} contained={}",
                incidentId, event.getSourceIp(), mitreIdStr, contained);

        } catch (Exception e) {
            log.warn("[ORCHESTRATOR] Could not write to knowledge graph (Neo4j may not be up): {}",
                e.getMessage());
        }
    }

    private void saveIncident(String incidentId, SecurityEvent event, double confidence,
                              String severity, List<String> mitreIds, List<String> mitreNames,
                              String reason) {
        try {
            Incident inc = Incident.builder()
                    // Use the Orchestrator's own UUID as the PK so AuditEntry.incidentId matches.
                    .id(UUID.fromString(incidentId))
                    .eventJson("{\"actor\":\"" + event.getActor()
                             + "\",\"sourceIp\":\"" + event.getSourceIp() + "\"}")
                    .severity(severity)
                    .confidence(BigDecimal.valueOf(confidence))
                    .mitreIds(String.join(",", mitreIds))
                    .mitreNames(String.join(",", mitreNames))   // Bug 4 fix: was always ""
                    .reason(reason != null ? reason : "Automated detection")
                    .status("OPEN")
                    .build();
            incidentRepo.save(inc);
            log.info("[ORCHESTRATOR] Incident persisted to PostgreSQL id={}", incidentId);
        } catch (Exception e) {
            log.warn("[ORCHESTRATOR] Could not persist incident (DB may not be up): {}", e.getMessage());
        }
    }

    /** Build the initial edges list for the INCIDENT_CREATED graph update. */
    private List<Map<String, Object>> buildInitialEdges(String incidentId, String actor, String sourceIp) {
        List<Map<String, Object>> edges = new ArrayList<>();
        if (actor != null) {
            edges.add(Map.of("source", incidentId, "target", "user-" + actor,
                    "type", "TARGETS", "props", Map.of()));
        }
        if (sourceIp != null) {
            edges.add(Map.of("source", incidentId, "target", "ip-" + sourceIp,
                    "type", "INVOLVES_IP", "props", Map.of()));
        }
        return edges;
    }
}

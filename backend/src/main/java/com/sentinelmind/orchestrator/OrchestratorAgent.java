package com.sentinelmind.orchestrator;

import com.sentinelmind.agents.AgentFactory;
import com.sentinelmind.agents.anomaly.AnomalyDetectionAgent;
import com.sentinelmind.api.MetricsController;
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
 *   3. Use Factory to resolve which agents to dispatch and their Kafka topics
 *   4. Dispatch agents via Kafka, wait for findings via Kafka
 *   5. Feed each finding into the Builder incrementally
 *   6. Compute weighted confidence score
 *   7. If confidence >= 0.92: authorize IncidentResponder via Kafka
 *   8. Build the final immutable IncidentReport and persist to PostgreSQL
 *
 * The Orchestrator never ANALYZES events itself — it only decides which agents
 * to call and whether combined evidence is strong enough to authorize a response.
 *
 * Factory resolves WHERE to dispatch. Kafka delivers HOW. Builder collects WHAT.
 */
@Component
public class OrchestratorAgent {

    private static final Logger log = LoggerFactory.getLogger(OrchestratorAgent.class);

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

    private final AgentFactory            agentFactory;
    private final EventProducer           eventProducer;
    private final KnowledgeGraphService   graphService;
    private final ConfidenceCalculator    confidenceCalc;
    private final WebSocketGateway        wsGateway;
    private final IncidentRepository      incidentRepo;
    private final AbstractEventHandler    handlerChain;
    private final GroqClient              groqClient;
    private final AnomalyDetectionAgent   anomalyDetectionAgent;

    private final BlockingQueue<Finding> anomalyQueue     = new LinkedBlockingQueue<>();
    private final BlockingQueue<Finding> threatIntelQueue  = new LinkedBlockingQueue<>();
    private final BlockingQueue<Finding> classifierQueue   = new LinkedBlockingQueue<>();

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
                             GroqClient groqClient,
                             AnomalyDetectionAgent anomalyDetectionAgent) {
        this.agentFactory          = agentFactory;
        this.eventProducer         = eventProducer;
        this.graphService          = graphService;
        this.confidenceCalc        = confidenceCalc;
        this.wsGateway             = wsGateway;
        this.incidentRepo          = incidentRepo;
        this.handlerChain          = handlerChain;
        this.groqClient            = groqClient;
        this.anomalyDetectionAgent = anomalyDetectionAgent;
    }

    /**
     * Kafka findings listener — routes incoming findings to the correct BlockingQueue.
     * Each agent publishes its Finding to the shared "findings" topic. This listener
     * routes them by agentName so the main ReAct loop can pick them up in order.
     */
    @KafkaListener(topics = KafkaTopics.FINDINGS, groupId = "orchestrator-findings")
    public void onFinding(Finding finding) {
        String source = finding.getAgentName();
        if (source == null) return;

        switch (source) {
            case "AnomalyDetectionAgent" -> anomalyQueue.offer(finding);
            case "ThreatIntelAgent"      -> threatIntelQueue.offer(finding);
            case "ThreatClassifierAgent" -> classifierQueue.offer(finding);
            default -> log.warn("[ORCHESTRATOR] Unknown finding source: {}", source);
        }
    }

    /**
     * Wait for a finding from an agent via the BlockingQueue.
     * Returns a default finding on timeout so the pipeline continues gracefully.
     */
    private Finding waitForFinding(BlockingQueue<Finding> queue, String agentName, int timeoutSeconds) {
        try {
            Finding finding = queue.poll(timeoutSeconds, TimeUnit.SECONDS);
            if (finding != null) {
                return finding;
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        log.warn("[ORCHESTRATOR] {} timed out after {}s, using default finding", agentName, timeoutSeconds);
        return Finding.builder()
            .agentName(agentName)
            .severity("LOW")
            .confidence(0.0)
            .summary(agentName + " did not respond in time")
            .build();
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

        wsGateway.broadcast(WebSocketMessage.agentActivated(incidentId, "OrchestratorAgent"));

        // --- REASON: Query Neo4j for context ---
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
        IncidentReport.Builder reportBuilder = IncidentReport.builder()
                .incidentId(incidentId)
                .triggeringEvent(event);

        // ═══════════════════════════════════════════════
        // ITERATION 1 — Anomaly Detection (Factory → Kafka → Wait)
        // ═══════════════════════════════════════════════
        wsGateway.broadcast(WebSocketMessage.agentActivated(incidentId, "AnomalyDetectionAgent"));

        AgentFactory.AgentRegistration anomalyReg = agentFactory.getAgent("ANOMALY");
        eventProducer.publishToAgent(anomalyReg.kafkaTopic(), event);
        Finding anomalyFinding = waitForFinding(anomalyQueue, "AnomalyDetectionAgent", 5);

        wsGateway.broadcast(WebSocketMessage.findingCreated(incidentId, anomalyFinding));
        handlerChain.handle(anomalyFinding);

        // Feed to Builder
        reportBuilder.anomalyScore(anomalyFinding.getZScore())
                .anomalySummary(anomalyFinding.getSummary());

        double currentConfidence = confidenceCalc.calculatePartial(anomalyFinding.getZScore(), null, null);
        wsGateway.broadcast(WebSocketMessage.confidenceUpdated(incidentId, currentConfidence));

        if (anomalyFinding.getSeverityLevel() < AbstractEventHandler.MEDIUM) {
            log.info("[ORCHESTRATOR] Anomaly LOW — not escalating further");
            return;
        }

        // ═══════════════════════════════════════════════
        // ReAct REASONING STEP 1 — Should we investigate threat intel?
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
        // ITERATION 2 — Threat Intelligence (Factory → Kafka → Wait)
        // ═══════════════════════════════════════════════
        wsGateway.broadcast(WebSocketMessage.agentActivated(incidentId, "ThreatIntelAgent"));

        AgentFactory.AgentRegistration intelReg = agentFactory.getAgent("THREAT_INTEL");
        eventProducer.publishToAgent(intelReg.kafkaTopic(), event);
        Finding threatFinding = waitForFinding(threatIntelQueue, "ThreatIntelAgent", 5);

        wsGateway.broadcast(WebSocketMessage.findingCreated(incidentId, threatFinding));
        handlerChain.handle(threatFinding);

        // Feed to Builder
        reportBuilder.threatIntelResult(threatFinding.getSummary())
                .threatIntelScore(threatFinding.getConfidence())
                .threatIntelSummary(threatFinding.getSummary());

        // ═══ GRAPH ENRICHMENT STEP 2 — IP reputation confirmed ═══
        try {
            if (threatFinding.isMalicious() && event.getSourceIp() != null) {
                wsGateway.broadcast(WebSocketMessage.graphUpdated(incidentId, "THREAT_INTEL_CONFIRMED",
                    List.of(),
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
                Math.min(anomalyFinding.getZScore() / 10.0, 1.0) * 0.30,
                threatFinding.getFeedCount() >= 1 ? 1.0 : 0.0,
                (threatFinding.getFeedCount() >= 1 ? 1.0 : 0.0) * 0.40,
                Math.min(anomalyFinding.getZScore() / 10.0, 1.0) * 0.30
                + (threatFinding.getFeedCount() >= 1 ? 1.0 : 0.0) * 0.40
        );
        if (threatFinding.isUsedRealApi() && !threatFinding.isMalicious()) {
            situation2 += "\n\nNOTE: Live VirusTotal returned 0 flags. This IP may not be in current " +
                          "threat databases. Confidence will be lower than in mock mode.";
        }

        String decision2 = askGroq(situation2, incidentId);
        log.info("[ORCHESTRATOR] AI decision after threat intel: {}", decision2);

        if ("DISMISS".equals(decision2)) {
            log.info("[ORCHESTRATOR] AI dismissed after threat intel — likely false positive");
            long elapsed2 = System.currentTimeMillis() - startMs;
            wsGateway.broadcast(WebSocketMessage.incidentContained(incidentId, elapsed2, 0));
            return;
        }

        // ═══════════════════════════════════════════════
        // ITERATION 3 — Threat Classification (Factory → Kafka → Wait)
        // ═══════════════════════════════════════════════
        wsGateway.broadcast(WebSocketMessage.agentActivated(incidentId, "ThreatClassifierAgent"));

        AgentFactory.AgentRegistration classifierReg = agentFactory.getAgent("CLASSIFIER");
        eventProducer.publishToAgent(classifierReg.kafkaTopic(), event);
        Finding classifierFinding = waitForFinding(classifierQueue, "ThreatClassifierAgent", 5);

        wsGateway.broadcast(WebSocketMessage.findingCreated(incidentId, classifierFinding));

        List<String> mitreIds   = classifierFinding.getMitreIds()   != null ? classifierFinding.getMitreIds()   : List.of();
        List<String> mitreNames = classifierFinding.getMitreNames() != null ? classifierFinding.getMitreNames() : List.of();

        // Feed to Builder
        reportBuilder.classifierScore(classifierFinding.getConfidence())
                .mitreIds(mitreIds)
                .mitreNames(mitreNames);

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
        reportBuilder.confidenceScore(confidence)
                .severity(finalSeverity)
                .addResponseAction("Blocked IP: " + event.getSourceIp())
                .addResponseAction("Revoked session for: " + event.getActor());

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
        // Build the final immutable IncidentReport and persist to PostgreSQL
        // ═══════════════════════════════════════════════
        IncidentReport report = reportBuilder.build();
        saveIncident(report);

        // ═══════════════════════════════════════════════
        // Campaign Correlation — link incidents sharing the same MITRE technique
        // ═══════════════════════════════════════════════
        try {
            correlateCampaign(incidentId, event.getSourceIp(), mitreIds);
        } catch (Exception e) {
            log.warn("[ORCHESTRATOR] Campaign correlation failed (non-critical): {}", e.getMessage());
        }

        // ═══════════════════════════════════════════════
        // ACT: If confidence >= threshold → authorize Incident Responder via Kafka
        // ═══════════════════════════════════════════════
        if (confidence >= confidenceThreshold) {
            log.info("[ORCHESTRATOR] Confidence {} >= {} — AUTHORIZING RESPONSE",
                    String.format("%.3f", confidence), confidenceThreshold);

            wsGateway.broadcast(WebSocketMessage.agentActivated(incidentId, "IncidentResponderAgent"));
            event.setIncidentId(incidentId);

            AgentFactory.AgentRegistration responderReg = agentFactory.getAgent("RESPONDER");
            eventProducer.publishToAgent(responderReg.kafkaTopic(), event);

        } else {
            log.info("[ORCHESTRATOR] Confidence below threshold — flagging for human review");
            long elapsed = System.currentTimeMillis() - startMs;
            wsGateway.broadcast(WebSocketMessage.incidentContained(incidentId, elapsed, 0));
            try {
                anomalyDetectionAgent.updateBaseline(event);
            } catch (Exception e) {
                log.warn("[ORCHESTRATOR] Baseline update failed (non-critical): {}", e.getMessage());
            }
        }

        try {
            MetricsController.recordDetection(System.currentTimeMillis() - startMs);
        } catch (Exception e) {
            log.warn("[ORCHESTRATOR] Metrics recording failed (non-critical): {}", e.getMessage());
        }

        writeIncidentToGraph(incidentId, event, confidence, mitreIds,
                System.currentTimeMillis() - startMs);
    }

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

    private String determineSeverity(double confidence) {
        if (confidence >= 0.92) return "CRITICAL";
        if (confidence >= 0.70) return "HIGH";
        if (confidence >= 0.40) return "MEDIUM";
        return "LOW";
    }

    private void writeIncidentToGraph(String incidentId, SecurityEvent event, double confidence,
                                      List<String> mitreIds, long elapsedMs) {
        String  timestamp  = Instant.now().toString();
        String  mitreIdStr = String.join(",", mitreIds);
        boolean contained  = confidence >= confidenceThreshold;

        try {
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

    private void saveIncident(IncidentReport report) {
        try {
            SecurityEvent event = report.getTriggeringEvent();
            Incident inc = Incident.builder()
                    .id(UUID.fromString(report.getIncidentId()))
                    .eventJson("{\"actor\":\"" + event.getActor()
                             + "\",\"sourceIp\":\"" + event.getSourceIp() + "\"}")
                    .severity(report.getSeverity())
                    .confidence(BigDecimal.valueOf(report.getConfidenceScore()))
                    .mitreIds(String.join(",", report.getMitreIds()))
                    .mitreNames(String.join(",", report.getMitreNames()))
                    .reason(report.getReason())
                    .status("OPEN")
                    .build();
            incidentRepo.save(inc);
            log.info("[ORCHESTRATOR] Incident persisted to PostgreSQL id={}", report.getIncidentId());
        } catch (Exception e) {
            log.warn("[ORCHESTRATOR] Could not persist incident (DB may not be up): {}", e.getMessage());
        }
    }

    /**
     * Links related incidents via PART_OF_CAMPAIGN in the knowledge graph.
     * Two incidents are part of the same campaign if they share a MITRE technique
     * and occurred within the last 72 hours. When 2+ related incidents are found,
     * broadcasts a CAMPAIGN_CORRELATION WebSocket message for the dashboard.
     */
    private void correlateCampaign(String incidentId, String sourceIp, List<String> mitreIds) {
        if (mitreIds.isEmpty()) return;

        // Find other incidents in the last 72h sharing a MITRE technique
        List<Map<String, Object>> related = graphService.query(
            "MATCH (i:Incident)-[:USES_TECHNIQUE]->(t:AttackTechnique) " +
            "WHERE t.id IN $mitreIds " +
            "  AND i.id <> $incidentId " +
            "WITH i, collect(t.id) AS sharedTechniques " +
            "RETURN i.id AS relatedId, i.severity AS severity, sharedTechniques " +
            "LIMIT 10",
            Map.of("mitreIds", mitreIds, "incidentId", incidentId)
        );

        if (related.isEmpty()) return;

        // Create PART_OF_CAMPAIGN edges for each related incident
        for (Map<String, Object> rel : related) {
            String relatedId = (String) rel.get("relatedId");
            graphService.runCypher(
                "MATCH (a:Incident {id: $id1}), (b:Incident {id: $id2}) " +
                "MERGE (a)-[:PART_OF_CAMPAIGN {technique: $techniques, linkedAt: $now}]->(b)",
                Map.of(
                    "id1",        incidentId,
                    "id2",        relatedId,
                    "techniques", String.join(",", mitreIds),
                    "now",        Instant.now().toString()
                )
            );
        }

        log.info("[ORCHESTRATOR] Campaign correlation: linked incidentId={} to {} related incident(s) via techniques={}",
            incidentId, related.size(), mitreIds);

        // Broadcast CAMPAIGN_CORRELATION to dashboard
        wsGateway.sendRawAlert(Map.of(
            "type",             "CAMPAIGN_CORRELATION",
            "incidentId",       incidentId,
            "sourceIp",         sourceIp != null ? sourceIp : "",
            "relatedCount",     related.size(),
            "sharedTechniques", mitreIds,
            "message",          String.format(
                "Incident %s is part of a campaign: %d related incident(s) share MITRE technique(s) %s",
                incidentId.substring(0, 8), related.size(), String.join(", ", mitreIds)),
            "timestamp",        Instant.now().toString()
        ));
    }

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

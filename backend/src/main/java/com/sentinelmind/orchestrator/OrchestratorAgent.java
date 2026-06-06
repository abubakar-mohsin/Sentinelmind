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
            You are an autonomous cybersecurity orchestrator AI. You receive security
            events and agent findings, then decide what to do next.

            You MUST respond ONLY with valid JSON in this exact format — no markdown, no prose:
            {
                "decision": "INVESTIGATE_ANOMALY" | "INVESTIGATE_THREAT_INTEL" |
                            "CLASSIFY_ATTACK" | "AUTHORIZE_RESPONSE" |
                            "DISMISS" | "GATHER_MORE_INTEL",
                "confidence": 0.0-1.0,
                "reasoning": "One sentence explaining your decision",
                "urgency": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
            }

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

        // --- REASON: Query Neo4j for context ---
        Map<String, Object> ipContext = graphService.queryOne(
            "MATCH (ip:IP {address: '" + event.getSourceIp() + "'}) " +
            "RETURN ip.isTorNode AS isTorNode, ip.feedCount AS feedCount, ip.reputation AS reputation"
        );
        log.info("[ORCHESTRATOR] Graph context for ip={}: {}", event.getSourceIp(), ipContext);

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
        String situation1 = String.format(
                "Security event from IP %s. Anomaly agent reports: z-score=%.2f, " +
                "severity=%s, login from unusual country at hour %d (off-hours), " +
                "robotic login latency %dms. " +
                "Should I investigate threat intelligence reputation feeds on this IP?",
                event.getSourceIp(),
                anomalyFinding.getZScore(),
                anomalyFinding.getSeverity(),
                event.getHour(),
                event.getLoginLatencyMs()
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

        // ═══════════════════════════════════════════════
        // ReAct REASONING STEP 2 — Should we classify and authorize response?
        // Combined evidence: anomaly z-score + threat feed hits + Tor node status.
        // ═══════════════════════════════════════════════
        String situation2 = String.format(
                "Cumulative evidence: anomaly z-score=%.2f. " +
                "Threat intelligence: IP %s is %s, flagged by %d threat feeds, " +
                "isTorNode=%s. " +
                "Should I proceed to MITRE ATT&CK classification and potentially " +
                "authorize an automated containment response?",
                anomalyFinding.getZScore(),
                event.getSourceIp(),
                threatFinding.isMalicious() ? "MALICIOUS" : "CLEAN",
                threatFinding.getFeedCount(),
                threatFinding.isTorNode() ? "YES" : "NO"
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

        log.info("[ORCHESTRATOR] Confidence={} threshold={} severity={}",
                String.format("%.3f", confidence), confidenceThreshold, finalSeverity);

        wsGateway.broadcast(WebSocketMessage.incidentClassified(
                incidentId, finalSeverity, confidence, mitreIds, mitreNames));

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

            ObjectMapper mapper = new ObjectMapper();
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
}

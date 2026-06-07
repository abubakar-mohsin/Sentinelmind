package com.sentinelmind.agents.forensics;

import com.sentinelmind.agents.ISecurityAgent;
import com.sentinelmind.audit.AuditActionRepository;
import com.sentinelmind.audit.AuditEntry;
import com.sentinelmind.audit.Incident;
import com.sentinelmind.audit.IncidentRepository;
import com.sentinelmind.graph.KnowledgeGraphService;
import com.sentinelmind.model.Finding;
import com.sentinelmind.model.SecurityEvent;
import com.sentinelmind.llm.GroqClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * ForensicsAgent — P1 agent, post-incident forensic timeline generator.
 *
 * Given an incident ID, this agent:
 *   1. Retrieves the incident record from PostgreSQL
 *   2. Traverses the Neo4j knowledge graph to map all nodes connected to the
 *      attacker's IP (user accounts targeted, services reached, known threat actors)
 *   3. Retrieves every response action taken from PostgreSQL audit_actions
 *   4. Assembles a chronological timeline for the analyst
 *
 * This answers the analyst's key post-incident questions:
 *   - "How did the attacker get in?"
 *   - "What did they touch?"
 *   - "What is the blast radius?"
 *   - "What did the system do to contain it?"
 *
 * Not integrated into the Kafka pipeline — accessed via REST at GET /api/forensics/{incidentId}.
 */
@Component
public class ForensicsAgent implements ISecurityAgent {

    private static final Logger log = LoggerFactory.getLogger(ForensicsAgent.class);

    private final KnowledgeGraphService  graphService;
    private final IncidentRepository     incidentRepo;
    private final AuditActionRepository  auditRepo;
    private final GroqClient             groqClient;
    private final ObjectMapper           objectMapper;

    public ForensicsAgent(KnowledgeGraphService graphService,
                          IncidentRepository incidentRepo,
                          AuditActionRepository auditRepo,
                          GroqClient groqClient,
                          ObjectMapper objectMapper) {
        this.graphService = graphService;
        this.incidentRepo = incidentRepo;
        this.auditRepo    = auditRepo;
        this.groqClient   = groqClient;
        this.objectMapper = objectMapper;
    }

    @Override
    public String getAgentName() {
        return "ForensicsAgent";
    }

    @Override
    public Finding process(SecurityEvent event) {
        // Not used in the main Kafka pipeline — use generateReport() from REST layer
        return Finding.builder()
                .agentName(getAgentName())
                .summary("Use GET /api/forensics/{incidentId}")
                .build();
    }

    /**
     * Generate a forensic report for the given incident.
     *
     * @param incidentId UUID string of the incident to analyze
     * @return map with: incident summary, graph connections, blast radius, response timeline
     */
    public Map<String, Object> generateReport(String incidentId) {
        log.info("[FORENSICS] Generating report for incidentId={}", incidentId);

        Map<String, Object> report = new LinkedHashMap<>();

        // 1. Load the incident from PostgreSQL
        UUID uuid;
        try {
            uuid = UUID.fromString(incidentId);
        } catch (IllegalArgumentException e) {
            report.put("error", "Invalid incidentId format: " + incidentId);
            return report;
        }

        Optional<Incident> incidentOpt = incidentRepo.findById(uuid);
        if (incidentOpt.isEmpty()) {
            report.put("error", "Incident not found: " + incidentId);
            return report;
        }

        Incident incident = incidentOpt.get();
        report.put("incidentId", incidentId);
        report.put("severity",   incident.getSeverity());
        report.put("confidence", incident.getConfidence());
        report.put("mitreIds",   incident.getMitreIds());
        report.put("reason",     incident.getReason());
        report.put("status",     incident.getStatus());
        report.put("detectedAt", incident.getDetectedAt());

        // 2. Parse sourceIp from event_json
        //    eventJson is stored as: {"actor":"...","sourceIp":"..."}
        String sourceIp = parseSourceIp(incident.getEventJson());
        String actor    = parseActor(incident.getEventJson());
        report.put("actor",    actor);
        report.put("sourceIp", sourceIp);

        // 3. Graph traversal — find all nodes connected to the attacker IP
        if (sourceIp != null) {
            List<Map<String, Object>> connections = graphService.query(
                "MATCH (ip:IP {address: $ip})-[r]->(n) " +
                "RETURN type(r) AS relationship, labels(n) AS nodeType, " +
                "       properties(n) AS nodeProps",
                Map.of("ip", sourceIp)
            );
            report.put("attackerConnections", connections);

            // Count impacted users and services for blast-radius summary
            long usersImpacted    = connections.stream()
                .filter(c -> c.get("nodeType") != null
                          && c.get("nodeType").toString().contains("User")).count();
            long servicesImpacted = connections.stream()
                .filter(c -> c.get("nodeType") != null
                          && c.get("nodeType").toString().contains("Service")).count();

            report.put("blastRadius", Map.of(
                "usersTargeted",    usersImpacted,
                "servicesReached",  servicesImpacted,
                "summary",          "IP " + sourceIp + " targeted " + usersImpacted
                    + " user(s) and reached " + servicesImpacted + " service(s)"
            ));
        } else {
            report.put("attackerConnections", List.of());
            report.put("blastRadius", Map.of("summary", "Unable to determine — sourceIp not found"));
        }

        // 4. Response timeline from PostgreSQL audit_actions
        List<AuditEntry> actions = auditRepo.findByIncidentId(uuid);
        List<Map<String, Object>> timeline = new ArrayList<>();
        for (AuditEntry action : actions) {
            Map<String, Object> step = new LinkedHashMap<>();
            step.put("timestamp",   action.getExecutedAt());
            step.put("action",      action.getActionType());
            step.put("description", action.getActionDescription());
            step.put("executedBy",  action.getExecutedBy());
            timeline.add(step);
        }
        report.put("responseTimeline", timeline);
        report.put("totalActionsExecuted", actions.size());

        log.info("[FORENSICS] Report complete: {} connections, {} response actions",
                report.get("attackerConnections") instanceof List
                        ? ((List<?>) report.get("attackerConnections")).size() : 0,
                actions.size());

        // 5. Ask Groq to generate a narrative timeline answering the 5 questions
        String llmTimeline = askGroqForTimeline(report, incident);
        if (llmTimeline != null) {
            try {
                // Parse the JSON response
                Map<String, Object> timelineMap = objectMapper.readValue(llmTimeline, Map.class);
                report.put("forensicsTimeline", timelineMap);
            } catch (Exception e) {
                log.error("[FORENSICS] Failed to parse Groq response as JSON: {}", e.getMessage());
                // Fallback: put raw string
                report.put("forensicsTimeline", Map.of("narrative", llmTimeline));
            }
        } else {
            // Rule-based fallback if Groq not configured
            report.put("forensicsTimeline", Map.of(
                "startTime", incident.getDetectedAt() != null ? incident.getDetectedAt().toString() : "Unknown",
                "targetAccess", report.get("blastRadius") != null ? ((Map<?, ?>) report.get("blastRadius")).get("summary") : "Unknown",
                "dwellTime", "Detected instantly by SentinelMind",
                "unmitigatedImpact", "Attacker could have exfiltrated sensitive data or taken over further accounts.",
                "blastRadius", report.get("blastRadius") != null ? ((Map<?, ?>) report.get("blastRadius")).get("summary") : "Unknown",
                "narrative", "Groq AI is not configured. This is a basic rule-based fallback forensics summary."
            ));
        }

        return report;
    }

    private String askGroqForTimeline(Map<String, Object> report, Incident incident) {
        if (!groqClient.isConfigured()) return null;

        String systemPrompt = "You are an elite Cybersecurity Forensics AI.\n" +
            "You are given a raw incident report (JSON) containing graph connections, audit responses, and attacker details.\n" +
            "Your task is to analyze this and generate a forensic timeline answering exactly 5 questions.\n" +
            "You MUST output valid JSON only, with no markdown formatting or extra text.\n\n" +
            "The JSON structure must be exactly:\n" +
            "{\n" +
            "  \"startTime\": \"When did the attack start? (infer from timeline or detectedAt)\",\n" +
            "  \"targetAccess\": \"What did the attacker try to access?\",\n" +
            "  \"dwellTime\": \"How long were they in the system before detection? (SentinelMind usually detects in ms)\",\n" +
            "  \"unmitigatedImpact\": \"What would have happened if we hadn't caught them?\",\n" +
            "  \"blastRadius\": \"What was the blast radius?\",\n" +
            "  \"narrative\": \"A 2-3 sentence executive summary of the entire incident.\"\n" +
            "}";

        try {
            String reportJson = objectMapper.writeValueAsString(report);
            String response = groqClient.chat(systemPrompt, "Incident Report:\n" + reportJson);

            // Clean up if Groq wraps in markdown
            if (response.startsWith("```json")) {
                response = response.substring(7);
            } else if (response.startsWith("```")) {
                response = response.substring(3);
            }
            if (response.endsWith("```")) {
                response = response.substring(0, response.length() - 3);
            }

            return response.trim();
        } catch (Exception e) {
            log.error("[FORENSICS] askGroqForTimeline failed: {}", e.getMessage());
            return null;
        }
    }

    private String parseSourceIp(String eventJson) {
        if (eventJson == null) return null;
        int idx = eventJson.indexOf("\"sourceIp\":\"");
        if (idx < 0) return null;
        int start = idx + 12;
        int end   = eventJson.indexOf("\"", start);
        if (end < 0) return null;
        return eventJson.substring(start, end);
    }

    private String parseActor(String eventJson) {
        if (eventJson == null) return null;
        int idx = eventJson.indexOf("\"actor\":\"");
        if (idx < 0) return null;
        int start = idx + 9;
        int end   = eventJson.indexOf("\"", start);
        if (end < 0) return null;
        return eventJson.substring(start, end);
    }
}

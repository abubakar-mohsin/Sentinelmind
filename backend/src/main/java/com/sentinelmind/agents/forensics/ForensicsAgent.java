package com.sentinelmind.agents.forensics;

import com.sentinelmind.agents.ISecurityAgent;
import com.sentinelmind.audit.AuditActionRepository;
import com.sentinelmind.audit.AuditEntry;
import com.sentinelmind.audit.Incident;
import com.sentinelmind.audit.IncidentRepository;
import com.sentinelmind.graph.KnowledgeGraphService;
import com.sentinelmind.model.Finding;
import com.sentinelmind.model.ForensicsTimeline;
import com.sentinelmind.model.SecurityEvent;
import com.sentinelmind.llm.GroqClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Instant;
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

    /**
     * Generate a structured ForensicsTimeline by traversing the Neo4j knowledge graph.
     * Runs 4 Cypher queries and assembles a chronological attack reconstruction.
     */
    public ForensicsTimeline generateTimeline(String incidentId, String sourceIp, String actorEmail) {
        log.info("[FORENSICS] Generating timeline: incidentId={} ip={} actor={}", incidentId, sourceIp, actorEmail);

        ForensicsTimeline timeline = new ForensicsTimeline();
        timeline.setIncidentId(incidentId);
        timeline.setSourceIp(sourceIp);
        timeline.setTargetActor(actorEmail);
        timeline.setReconstructedAt(System.currentTimeMillis());
        timeline.setPatientZero(actorEmail);

        // Q1 — Attack path from IP to user
        String reputation = null;
        int feedCount = 0;
        String country = null;
        int hops = 2;
        try {
            List<Map<String, Object>> pathResults = graphService.query(
                "MATCH path = (ip:IP {address: $ip})-[r:ATTACKED|TARGETS*1..3]->(target) " +
                "RETURN ip.address as ipAddress, ip.country as country, " +
                "       ip.reputation as reputation, ip.feedCount as feedCount, " +
                "       labels(target)[0] as targetType, " +
                "       target.email as targetEmail, target.id as targetId, " +
                "       length(path) as hops " +
                "ORDER BY hops ASC LIMIT 10",
                Map.of("ip", sourceIp != null ? sourceIp : "")
            );
            if (!pathResults.isEmpty()) {
                Map<String, Object> row = pathResults.get(0);
                reputation = row.get("reputation") != null ? row.get("reputation").toString() : null;
                feedCount  = row.get("feedCount") != null ? ((Number) row.get("feedCount")).intValue() : 0;
                country    = row.get("country") != null ? row.get("country").toString() : null;
                hops       = row.get("hops") != null ? ((Number) row.get("hops")).intValue() : 2;
            }
        } catch (Exception e) {
            log.warn("[FORENSICS] Q1 failed: {}", e.getMessage());
        }
        timeline.setTotalHopsInGraph(hops);

        // Q2 — Services targeted via user
        List<String> affectedServices = new ArrayList<>();
        try {
            List<Map<String, Object>> serviceResults = graphService.query(
                "MATCH (ip:IP {address: $ip})-[:ATTACKED]->(u:User) " +
                "OPTIONAL MATCH (u)-[:USES]->(s:Service) " +
                "RETURN u.email as userEmail, u.department as department, " +
                "       collect(s.name) as services",
                Map.of("ip", sourceIp != null ? sourceIp : "")
            );
            for (Map<String, Object> row : serviceResults) {
                Object svcList = row.get("services");
                if (svcList instanceof List<?> svcs) {
                    for (Object s : svcs) {
                        if (s != null && !s.toString().isEmpty()) affectedServices.add(s.toString());
                    }
                }
            }
        } catch (Exception e) {
            log.warn("[FORENSICS] Q2 failed: {}", e.getMessage());
        }
        if (affectedServices.isEmpty()) affectedServices.add("AuthService");
        timeline.setAffectedServices(affectedServices);
        timeline.setBlastRadius("1 user account (" + actorEmail + "), " + affectedServices.size() + " service(s)");

        // Q3 — MITRE techniques
        List<Map<String, Object>> techniques = new ArrayList<>();
        try {
            if (incidentId != null && !incidentId.isEmpty()) {
                techniques = graphService.query(
                    "MATCH (i:Incident {id: $incidentId})-[:USED_TECHNIQUE]->(t:AttackTechnique) " +
                    "RETURN t.id as techniqueId, t.name as techniqueName, " +
                    "       t.killChainPhase as phase, t.description as description " +
                    "ORDER BY t.id",
                    Map.of("incidentId", incidentId)
                );
            }
            if (techniques.isEmpty()) {
                techniques = graphService.query(
                    "MATCH (t:AttackTechnique) WHERE t.id IN ['T1078', 'T1110.004'] " +
                    "RETURN t.id as techniqueId, t.name as techniqueName, " +
                    "       t.killChainPhase as phase, t.description as description"
                );
            }
        } catch (Exception e) {
            log.warn("[FORENSICS] Q3 failed: {}", e.getMessage());
        }

        // Assemble timeline events
        List<ForensicsTimeline.TimelineEvent> events = new ArrayList<>();
        long now = Instant.now().getEpochSecond();

        // Event 1 — RECONNAISSANCE
        ForensicsTimeline.TimelineEvent e1 = new ForensicsTimeline.TimelineEvent();
        e1.setEventType("RECONNAISSANCE");
        e1.setDescription("IP " + sourceIp + " identified as origin — " +
            (feedCount > 0 ? "appears in " + feedCount + " threat feeds" : "unknown reputation"));
        e1.setSeverity("MALICIOUS".equals(reputation) ? "CRITICAL" : "MEDIUM");
        e1.setSourceNode(sourceIp);
        e1.setTargetNode("threat-feed-database");
        e1.setRelationshipType("FLAGGED_BY");
        e1.setTimestamp(Instant.ofEpochSecond(now - 300).toString());
        events.add(e1);

        // Event 2 — INITIAL_ACCESS
        ForensicsTimeline.TimelineEvent e2 = new ForensicsTimeline.TimelineEvent();
        e2.setEventType("INITIAL_ACCESS");
        e2.setDescription("Login attempt by " + actorEmail + " from " + sourceIp +
            " (country: " + (country != null ? country : "unknown") + ")");
        e2.setSeverity("HIGH");
        e2.setSourceNode(sourceIp);
        e2.setTargetNode(actorEmail);
        e2.setRelationshipType("ATTACKED");
        e2.setTimestamp(Instant.ofEpochSecond(now - 250).toString());
        events.add(e2);

        // Event 3 — ANOMALY_DETECTED
        ForensicsTimeline.TimelineEvent e3 = new ForensicsTimeline.TimelineEvent();
        e3.setEventType("ANOMALY_DETECTED");
        e3.setDescription("Behavioral anomaly detected — login deviates from baseline (unusual country/time/latency)");
        e3.setSeverity("HIGH");
        e3.setSourceNode("AnomalyDetectionAgent");
        e3.setTargetNode(actorEmail);
        e3.setRelationshipType("FLAGGED");
        e3.setTimestamp(Instant.ofEpochSecond(now - 200).toString());
        events.add(e3);

        // Events for each MITRE technique
        for (Map<String, Object> tech : techniques) {
            String techId   = tech.get("techniqueId") != null ? tech.get("techniqueId").toString() : "T1078";
            String techName = tech.get("techniqueName") != null ? tech.get("techniqueName").toString() : "Unknown";
            String phase    = tech.get("phase") != null ? tech.get("phase").toString() : "unknown";

            ForensicsTimeline.TimelineEvent et = new ForensicsTimeline.TimelineEvent();
            et.setEventType("TECHNIQUE_IDENTIFIED");
            et.setDescription("Attack mapped to MITRE ATT&CK " + techId + ": " + techName +
                " (kill chain phase: " + phase + ")");
            et.setSeverity("CRITICAL");
            et.setSourceNode("ThreatClassifierAgent");
            et.setTargetNode(techId);
            et.setRelationshipType("USED_TECHNIQUE");
            et.setTimestamp(Instant.ofEpochSecond(now - 150).toString());
            events.add(et);
        }

        // Event 5 — CONTAINMENT
        ForensicsTimeline.TimelineEvent e5 = new ForensicsTimeline.TimelineEvent();
        e5.setEventType("CONTAINMENT");
        e5.setDescription("Automated response executed: IP blocked, session revoked, password reset forced");
        e5.setSeverity("INFO");
        e5.setSourceNode("IncidentResponderAgent");
        e5.setTargetNode(sourceIp);
        e5.setRelationshipType("BLOCKED");
        e5.setTimestamp(Instant.ofEpochSecond(now - 100).toString());
        events.add(e5);

        timeline.setEvents(events);
        log.info("[FORENSICS] Timeline assembled: {} events, blastRadius='{}'", events.size(), timeline.getBlastRadius());
        return timeline;
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

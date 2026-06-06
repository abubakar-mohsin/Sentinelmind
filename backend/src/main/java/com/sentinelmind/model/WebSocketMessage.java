package com.sentinelmind.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * WebSocketMessage — the payload broadcast to the React dashboard over STOMP /topic/events.
 * Every step of the pipeline emits one of these so the UI can animate each agent's progress.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WebSocketMessage {

    private String type;
    private String timestamp;
    private String incidentId;
    private String agentName;
    private String agentStatus;
    private String dataSource;
    private String message;
    private String severity;
    private double confidence;
    private String summary;
    private List<String> mitreIds;
    private List<String> mitreNames;
    private String reason;
    private String actor;
    private String sourceIp;
    private String actionType;
    private String description;
    private boolean rollbackToken;
    private boolean success;
    private long totalElapsedMs;
    private int actionsExecuted;
    private Map<String, Object> details;

    // ── Static factory methods ────────────────────────────────────────────────

    /** Agent has been dispatched by the Orchestrator. */
    public static WebSocketMessage agentActivated(String incidentId, String agentName) {
        return WebSocketMessage.builder()
                .type("AGENT_ACTIVATED")
                .timestamp(Instant.now().toString())
                .incidentId(incidentId)
                .agentName(agentName)
                .agentStatus("RUNNING")
                .message(agentName + " activated")
                .build();
    }

    /** Agent has finished and produced a finding. */
    public static WebSocketMessage findingCreated(String incidentId, Finding finding) {
        return WebSocketMessage.builder()
                .type("FINDING_CREATED")
                .timestamp(Instant.now().toString())
                .incidentId(incidentId)
                .agentName(finding.getAgentName())
                .agentStatus("COMPLETE")
                .severity(finding.getSeverity())
                .confidence(finding.getConfidence())
                .summary(finding.getSummary())
                .reason(finding.getReason())
                .message(finding.getAgentName() + " completed analysis")
                .build();
    }

    /** Orchestrator has classified the incident with MITRE mappings. */
    public static WebSocketMessage incidentClassified(String incidentId, String severity,
                                                       double confidence,
                                                       List<String> mitreIds,
                                                       List<String> mitreNames) {
        return WebSocketMessage.builder()
                .type("INCIDENT_CLASSIFIED")
                .timestamp(Instant.now().toString())
                .incidentId(incidentId)
                .severity(severity)
                .confidence(confidence)
                .mitreIds(mitreIds)
                .mitreNames(mitreNames)
                .message("Incident classified — confidence " + String.format("%.2f", confidence))
                .build();
    }

    /** IncidentResponder has executed a response action (block IP, revoke session, etc.). */
    public static WebSocketMessage responseExecuted(String incidentId, String actionType,
                                                     String description, boolean success,
                                                     boolean rollbackToken) {
        return WebSocketMessage.builder()
                .type("RESPONSE_EXECUTED")
                .timestamp(Instant.now().toString())
                .incidentId(incidentId)
                .actionType(actionType)
                .description(description)
                .success(success)
                .rollbackToken(rollbackToken)
                .message("Response executed: " + actionType)
                .build();
    }

    /** All agents done, incident fully contained. */
    public static WebSocketMessage incidentContained(String incidentId, long elapsedMs,
                                                      int actionsExecuted) {
        return WebSocketMessage.builder()
                .type("INCIDENT_CONTAINED")
                .timestamp(Instant.now().toString())
                .incidentId(incidentId)
                .totalElapsedMs(elapsedMs)
                .actionsExecuted(actionsExecuted)
                .success(true)
                .message("Incident contained in " + elapsedMs + "ms")
                .build();
    }
}

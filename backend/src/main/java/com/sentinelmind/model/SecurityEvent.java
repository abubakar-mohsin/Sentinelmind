package com.sentinelmind.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * SecurityEvent — the raw event payload that enters the system.
 * Ingested via POST /api/events and published to the raw-events Kafka topic.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SecurityEvent {

    private String actor;
    private String sourceIp;
    private String action;
    private String timestamp;
    private String userAgent;
    private int loginLatencyMs;
    private String country;
    private int hour;

    private Integer failedAttempts;
    private Integer filesAccessed;
    private Integer dataVolumeGB;
    private String previousLoginCountry;
    private Integer minutesSincePreviousLogin;
    private String targetUser;

    /**
     * Set by the Orchestrator before dispatching to IncidentResponderAgent.
     * Ensures AuditEntry rows share the same incidentId as the Incident row.
     * Not populated from the REST body — callers leave this null.
     */
    private String incidentId;
}

package com.sentinelmind.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Finding — the structured result produced by each agent after analyzing a SecurityEvent.
 * The Orchestrator collects findings from all agents, feeds them into ConfidenceCalculator,
 * and routes them through the Chain of Responsibility severity handlers.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Finding {

    private String agentName;
    private String severity;
    private double confidence;
    private String summary;
    private boolean isMalicious;
    private List<String> mitreIds;
    private List<String> mitreNames;
    private String reason;

    // Populated by AnomalyDetectionAgent for the dashboard & orchestrator context
    private String baselineSummary;
    private int sessionCount;

    // AnomalyDetectionAgent populates this
    private double zScore;

    // ThreatIntelAgent populates these
    private int feedCount;
    private boolean isTorNode;
    // true when VirusTotalAdapter was used (LIVE mode); false when MockThreatFeed was used
    private boolean usedRealApi;

    // ThreatClassifierAgent populates this
    private boolean ruleMatched;

    // Passed through from SecurityEvent so handlers and strategies can use them
    // without needing a separate reference to the original event
    private String sourceIp;
    private int hour;
    private int loginLatencyMs;

    private Integer failedAttempts;
    private Integer filesAccessed;
    private Integer dataVolumeGB;
    private String previousLoginCountry;
    private Integer minutesSincePreviousLogin;
    private String userAgent;
    private String action;
    private String targetUser;

    // Populated by LlmStrategy when Groq AI is available — the raw reasoning text
    // returned by the model before it was parsed into techniqueIds/confidence.
    // Null when running in rule-based fallback mode.
    private String llmReasoning;

    /**
     * Convert severity string to integer level for the Chain of Responsibility.
     * Maps to the constants defined in AbstractEventHandler.
     * LOW=1, MEDIUM=2, HIGH=3, CRITICAL=4
     */
    public int getSeverityLevel() {
        if (severity == null) return 1;
        return switch (severity.toUpperCase()) {
            case "MEDIUM"   -> 2;
            case "HIGH"     -> 3;
            case "CRITICAL" -> 4;
            default         -> 1; // LOW
        };
    }
}

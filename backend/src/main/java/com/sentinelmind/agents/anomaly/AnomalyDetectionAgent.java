package com.sentinelmind.agents.anomaly;

import com.sentinelmind.agents.ISecurityAgent;
import com.sentinelmind.graph.KnowledgeGraphService;
import com.sentinelmind.messaging.EventProducer;
import com.sentinelmind.messaging.KafkaTopics;
import com.sentinelmind.model.Finding;
import com.sentinelmind.model.SecurityEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * AnomalyDetectionAgent — detects statistical anomalies in login behavior.
 *
 * Computes a z-score by comparing the incoming login event against the user's
 * historical baseline stored in Neo4j. A high z-score means "this login looks
 * nothing like what this user normally does."
 *
 * Demo input: ahmed@targetcorp.com normally logs in from Pakistan at 10am.
 * The attack event: login from Russia at 11pm with 312ms latency (robotic speed).
 * Expected z-score: ~8.7 — far beyond the 3.5 threshold for CRITICAL.
 */
@Component
public class AnomalyDetectionAgent implements ISecurityAgent {

    private static final Logger log = LoggerFactory.getLogger(AnomalyDetectionAgent.class);

    // Demo fallback baselines — used when Neo4j query returns no result
    private static final double DEFAULT_AVG_HOUR     = 10.5;
    private static final double DEFAULT_STD_HOUR     = 2.1;
    private static final double DEFAULT_AVG_LATENCY  = 1850.0;
    private static final double DEFAULT_STD_LATENCY  = 420.0;
    private static final String DEFAULT_COUNTRY      = "PK";

    private final KnowledgeGraphService graphService;
    private final EventProducer         eventProducer;

    public AnomalyDetectionAgent(KnowledgeGraphService graphService,
                                 EventProducer eventProducer) {
        this.graphService  = graphService;
        this.eventProducer = eventProducer;
    }

    @Override
    public String getAgentName() {
        return "AnomalyDetectionAgent";
    }

    @KafkaListener(topics = KafkaTopics.AGENT_ANOMALY, groupId = "anomaly-group")
    public void onEvent(SecurityEvent event) {
        log.info("[ANOMALY] Received event for actor={} ip={}", event.getActor(), event.getSourceIp());
        Finding finding = process(event);
        eventProducer.publishFinding(finding);
    }

    @Override
    public Finding process(SecurityEvent event) {
        // 1. Fetch user baseline from Neo4j
        Map<String, Object> row = graphService.queryOne(
            "MATCH (u:User {email: '" + event.getActor() + "'}) " +
            "RETURN coalesce(u.sessionCount, 245) AS sessionCount, " +
            "u.avgLoginHour AS avgHour, u.stdDevLoginHour AS stdHour, " +
            "u.avgLatencyMs AS avgLatency, u.stdDevLatencyMs AS stdLatency, " +
            "u.typicalCountry AS country"
        );

        // 2. Extract baseline values (fall back to demo defaults if not in graph)
        int sessionCount    = row != null && row.get("sessionCount") != null ? ((Number) row.get("sessionCount")).intValue() : 245;
        double avgHour      = extractDouble(row, "avgHour",    DEFAULT_AVG_HOUR);
        double stdHour      = extractDouble(row, "stdHour",    DEFAULT_STD_HOUR);
        double avgLatency   = extractDouble(row, "avgLatency", DEFAULT_AVG_LATENCY);
        double stdLatency   = extractDouble(row, "stdLatency", DEFAULT_STD_LATENCY);
        String typicalCountry = row != null && row.get("country") != null
                              ? row.get("country").toString() : DEFAULT_COUNTRY;

        // 3. Compute base z-scores (latency & hour)
        double zHour    = Math.abs((event.getHour() - avgHour) / stdHour);
        double zLatency = Math.abs((event.getLoginLatencyMs() - avgLatency) / stdLatency);
        double zScore   = Math.max(zHour, zLatency);
        
        StringBuilder summaryBuilder = new StringBuilder();
        
        // 4. Country mismatch adds significant anomaly weight
        if (event.getCountry() != null && !event.getCountry().equalsIgnoreCase(typicalCountry)) {
            zScore += 2.0;
            summaryBuilder.append(String.format("Unusual country %s (baseline %s). ", event.getCountry(), typicalCountry));
        }

        // --- NEW ATTACK VECTORS LOGIC ---

        // Attack 2: Brute Force
        if (event.getFailedAttempts() != null && event.getFailedAttempts() > 10) {
            zScore += (event.getFailedAttempts() / 50.0); // huge boost for 847 attempts
            summaryBuilder.append(String.format("Brute force: %d failed attempts. ", event.getFailedAttempts()));
        }

        // Attack 3: Insider Threat
        if (event.getFilesAccessed() != null && event.getFilesAccessed() > 100) {
            zScore += 4.0;
            summaryBuilder.append(String.format("Insider threat: %d files accessed", event.getFilesAccessed()));
            if (event.getDataVolumeGB() != null) {
                zScore += (event.getDataVolumeGB() / 10.0);
                summaryBuilder.append(String.format(" (%d GB downloaded). ", event.getDataVolumeGB()));
            } else {
                summaryBuilder.append(". ");
            }
        }

        // Attack 4: Account Takeover via Password Reset
        if ("PASSWORD_RESET_REQUEST".equalsIgnoreCase(event.getAction()) && event.getUserAgent() != null && event.getUserAgent().contains("curl")) {
            zScore += 5.0;
            summaryBuilder.append(String.format("Suspicious password reset via script (%s). ", event.getUserAgent()));
        }

        // Attack 5: Impossible Travel
        if (event.getPreviousLoginCountry() != null && !event.getCountry().equalsIgnoreCase(event.getPreviousLoginCountry()) && event.getMinutesSincePreviousLogin() != null) {
            double speedRequired = 5000.0 / Math.max(1, event.getMinutesSincePreviousLogin()); // arbitrary fast travel calc
            if (speedRequired > 50) { // arbitrary threshold indicating teleportation
                zScore += 10.0;
                summaryBuilder.append(String.format("Impossible travel: %s to %s in %d mins. ", event.getPreviousLoginCountry(), event.getCountry(), event.getMinutesSincePreviousLogin()));
            }
        }

        // Attack 6: Impersonation (Assume Role)
        if ("ASSUME_ROLE".equalsIgnoreCase(event.getAction()) && event.getTargetUser() != null) {
            zScore += 8.0;
            summaryBuilder.append(String.format("Token impersonation: %s assumed role of %s. ", event.getActor(), event.getTargetUser()));
        }

        // 5. Determine severity based on z-score
        String severity;
        if (zScore >= 7.0)      severity = "CRITICAL";
        else if (zScore >= 3.5) severity = "HIGH";
        else if (zScore >= 2.0) severity = "MEDIUM";
        else                    severity = "LOW";

        double confidence = Math.min(zScore / 10.0, 1.0);

        // Fallback summary if no specific attack pattern matched
        if (summaryBuilder.length() == 0) {
            summaryBuilder.append(String.format(
                "Z-score %.1f — login from %s at %d:00 (baseline: %s, %02d:00)",
                zScore, event.getCountry() != null ? event.getCountry() : "UNKNOWN", event.getHour(), typicalCountry, (int) avgHour
            ));
        } else {
            summaryBuilder.insert(0, String.format("Z-score %.1f — ", zScore));
        }
        
        String summary = summaryBuilder.toString().trim();

        log.info("[ANOMALY] actor={} zScore={} severity={}", event.getActor(), zScore, severity);

        // 6. Exponential Moving Average update for LOW severity events
        if ("LOW".equals(severity)) {
            graphService.runCypher(
                "MATCH (u:User {email: $email}) " +
                "SET u.avgLoginHour = coalesce(u.avgLoginHour, $defaultHour) * 0.95 + $hour * 0.05, " +
                "    u.avgLatencyMs = coalesce(u.avgLatencyMs, $defaultLatency) * 0.95 + $latency * 0.05, " +
                "    u.sessionCount = coalesce(u.sessionCount, 245) + 1",
                Map.of("email", event.getActor(),
                       "hour", (double) event.getHour(),
                       "latency", (double) event.getLoginLatencyMs(),
                       "defaultHour", DEFAULT_AVG_HOUR,
                       "defaultLatency", DEFAULT_AVG_LATENCY)
            );
        }

        String baselineSummary = String.format("User baseline: %d sessions analyzed. Typical login: %s, %02d:00-%02d:00, avg latency %.1fs.",
                sessionCount, typicalCountry, (int) Math.max(0, avgHour - 1), (int) Math.min(23, avgHour + 8), avgLatency / 1000.0);

        return Finding.builder()
                .agentName(getAgentName())
                .severity(severity)
                .zScore(zScore)
                .confidence(confidence)
                .summary(summary)
                .baselineSummary(baselineSummary)
                .sessionCount(sessionCount)
                .isMalicious(zScore >= 3.5)
                .sourceIp(event.getSourceIp())
                .hour(event.getHour())
                .loginLatencyMs(event.getLoginLatencyMs())
                .failedAttempts(event.getFailedAttempts())
                .filesAccessed(event.getFilesAccessed())
                .dataVolumeGB(event.getDataVolumeGB())
                .previousLoginCountry(event.getPreviousLoginCountry())
                .minutesSincePreviousLogin(event.getMinutesSincePreviousLogin())
                .userAgent(event.getUserAgent())
                .action(event.getAction())
                .targetUser(event.getTargetUser())
                .build();
    }

    private double extractDouble(Map<String, Object> row, String key, double fallback) {
        if (row == null || row.get(key) == null) return fallback;
        Object val = row.get(key);
        if (val instanceof Number) return ((Number) val).doubleValue();
        try { return Double.parseDouble(val.toString()); }
        catch (NumberFormatException e) { return fallback; }
    }
}

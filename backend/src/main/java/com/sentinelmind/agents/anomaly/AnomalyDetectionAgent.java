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
            "RETURN u.avgLoginHour AS avgHour, u.stdDevLoginHour AS stdHour, " +
            "u.avgLatencyMs AS avgLatency, u.stdDevLatencyMs AS stdLatency, " +
            "u.typicalCountry AS country"
        );

        // 2. Extract baseline values (fall back to demo defaults if not in graph)
        double avgHour      = extractDouble(row, "avgHour",    DEFAULT_AVG_HOUR);
        double stdHour      = extractDouble(row, "stdHour",    DEFAULT_STD_HOUR);
        double avgLatency   = extractDouble(row, "avgLatency", DEFAULT_AVG_LATENCY);
        double stdLatency   = extractDouble(row, "stdLatency", DEFAULT_STD_LATENCY);
        String typicalCountry = row != null && row.get("country") != null
                              ? row.get("country").toString() : DEFAULT_COUNTRY;

        // 3. Compute z-scores
        double zHour    = Math.abs((event.getHour() - avgHour) / stdHour);
        double zLatency = Math.abs((event.getLoginLatencyMs() - avgLatency) / stdLatency);
        double zScore   = Math.max(zHour, zLatency);

        // 4. Country mismatch adds significant anomaly weight
        if (!event.getCountry().equalsIgnoreCase(typicalCountry)) {
            zScore += 2.0;
        }

        // 5. Determine severity based on z-score
        String severity;
        if (zScore >= 7.0)      severity = "CRITICAL";
        else if (zScore >= 3.5) severity = "HIGH";
        else if (zScore >= 2.0) severity = "MEDIUM";
        else                    severity = "LOW";

        double confidence = Math.min(zScore / 10.0, 1.0);

        String summary = String.format(
            "Z-score %.1f — login from %s at %d:00 (baseline: %s, %02d:00)",
            zScore, event.getCountry(), event.getHour(), typicalCountry, (int) avgHour
        );

        log.info("[ANOMALY] actor={} zScore={} severity={}", event.getActor(), zScore, severity);

        return Finding.builder()
                .agentName(getAgentName())
                .severity(severity)
                .zScore(zScore)
                .confidence(confidence)
                .summary(summary)
                .isMalicious(zScore >= 3.5)
                .sourceIp(event.getSourceIp())
                .hour(event.getHour())
                .loginLatencyMs(event.getLoginLatencyMs())
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

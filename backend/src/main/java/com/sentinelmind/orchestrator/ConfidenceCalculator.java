package com.sentinelmind.orchestrator;

import org.springframework.stereotype.Component;

/**
 * ConfidenceCalculator — computes the weighted confidence score from agent findings.
 * Formula: (anomalyScore × 0.30) + (threatIntelScore × 0.40) + (classifierScore × 0.30)
 * This formula is LOCKED — do not change weights or the demo will not trigger correctly.
 *
 * Demo values that cross the 0.92 threshold:
 *   zScore=8.9 → anomaly=0.89×0.30=0.267
 *   feedCount=4 → threatIntel=1.0×0.40=0.40
 *   ruleMatched=true → classifier=1.0×0.30=0.30
 *   Total = 0.967 ≥ 0.92 ✓
 */
@Component
public class ConfidenceCalculator {

    private static final double ANOMALY_WEIGHT     = 0.30;
    private static final double THREAT_INTEL_WEIGHT = 0.40;
    private static final double CLASSIFIER_WEIGHT  = 0.30;

    /**
     * @param zScore      from AnomalyDetectionAgent
     * @param feedCount   from ThreatIntelAgent (number of threat feeds that flagged the IP)
     * @param ruleMatched from ThreatClassifierAgent (true if a MITRE rule matched)
     */
    public double calculate(double zScore, int feedCount, boolean ruleMatched) {
        double anomalyScore     = Math.min(zScore / 10.0, 1.0);
        double threatIntelScore = feedCount >= 1 ? 1.0 : 0.0;
        double classifierScore  = ruleMatched ? 1.0 : 0.3;

        return (anomalyScore * ANOMALY_WEIGHT)
             + (threatIntelScore * THREAT_INTEL_WEIGHT)
             + (classifierScore * CLASSIFIER_WEIGHT);
    }
}

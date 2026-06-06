package com.sentinelmind.orchestrator;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for ConfidenceCalculator.
 *
 * The confidence formula is LOCKED (see ARCHITECTURE.md section 3.1):
 *   confidence = (anomalyScore × 0.30) + (threatIntelScore × 0.40) + (classifierScore × 0.30)
 *
 * where:
 *   anomalyScore     = min(zScore / 10.0, 1.0)
 *   threatIntelScore = feedCount >= 1 ? 1.0 : 0.0
 *   classifierScore  = ruleMatched ? 1.0 : 0.3
 *
 * The demo scenario MUST produce >= 0.92. These tests lock that guarantee in.
 */
class ConfidenceCalculatorTest {

    private final ConfidenceCalculator calc = new ConfidenceCalculator();

    /**
     * The primary demo scenario from ARCHITECTURE.md section 3.1.
     * z=8.7, 4 feeds, rule matched → expected 0.961
     */
    @Test
    void demoScenario_producesExpectedScore() {
        double score = calc.calculate(8.7, 4, true);
        // 0.87×0.30 = 0.261  +  1.0×0.40 = 0.400  +  1.0×0.30 = 0.300  =  0.961
        assertEquals(0.961, score, 0.001,
                "Demo scenario must produce 0.961 per ARCHITECTURE.md");
    }

    /**
     * The demo scenario must always cross the 0.92 authorization threshold.
     */
    @Test
    void demoScenario_crossesThreshold() {
        double score = calc.calculate(8.7, 4, true);
        assertTrue(score >= 0.92,
                "Demo scenario must authorize the Incident Responder (score=" + score + ")");
    }

    /**
     * Without any threat intel signal (no feeds, unknown IP) the score should stay below
     * the 0.92 threshold even if anomaly and classifier both fire.
     * This ensures a high-anomaly event on a clean IP does NOT trigger auto-response.
     */
    @Test
    void noThreatIntel_staysBelowThreshold() {
        // Perfect anomaly + classifier, but zero threat intel
        double score = calc.calculate(10.0, 0, true);
        // 1.0×0.30 + 0×0.40 + 1.0×0.30 = 0.60
        assertEquals(0.60, score, 0.001);
        assertTrue(score < 0.92, "No threat intel should keep score below auto-response threshold");
    }

    /**
     * With no signals at all, classifier still contributes its minimum 0.3 score.
     */
    @Test
    void allZeroInputs_producesMinimumClassifierContribution() {
        double score = calc.calculate(0.0, 0, false);
        // 0×0.30 + 0×0.40 + 0.3×0.30 = 0.09
        assertEquals(0.09, score, 0.001);
    }

    /**
     * The z-score is capped at 1.0 when normalized. A z-score of 100 must not
     * produce a score above 1.0 or inflate the result beyond the formula.
     */
    @Test
    void zScoreCappedAt1_totalScoreMaxIsOne() {
        double score = calc.calculate(100.0, 4, true);
        // min(100/10, 1.0)=1.0 → 0.30 + 0.40 + 0.30 = 1.00
        assertEquals(1.00, score, 0.001);
        assertTrue(score <= 1.0, "Score must never exceed 1.0");
    }

    /**
     * Threat intel alone (IP is in 1 or more feeds) should contribute
     * the dominant weight (0.40) regardless of anomaly magnitude.
     */
    @Test
    void oneFeedIsEnoughForFullThreatIntelWeight() {
        double scoreWith1Feed = calc.calculate(5.0, 1, false);
        double scoreWith5Feeds = calc.calculate(5.0, 5, false);
        // feedCount >= 1 normalizes to 1.0 either way
        assertEquals(scoreWith1Feed, scoreWith5Feeds, 0.001,
                "1 feed and 5 feeds must produce identical threat intel weight");
    }

    /**
     * When the classifier rule does not match, the fallback classifier score (0.3)
     * contributes 0.09 rather than 0.30 to the total.
     */
    @Test
    void ruleNotMatched_reducesClassifierContribution() {
        double matched    = calc.calculate(8.7, 4, true);   // 0.961
        double notMatched = calc.calculate(8.7, 4, false);  // 0.87×0.30+0.40+0.3×0.30 = 0.751
        assertTrue(matched > notMatched,
                "Rule match must increase confidence over no-match");
        assertEquals(0.751, notMatched, 0.001);
    }
}

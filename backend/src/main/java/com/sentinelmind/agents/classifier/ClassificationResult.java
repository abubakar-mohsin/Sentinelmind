package com.sentinelmind.agents.classifier;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * ClassificationResult — the output of any ClassificationStrategy.
 * Contains the matched MITRE technique IDs, human-readable names,
 * confidence, the reason the rule fired, and whether classification failed.
 */
@Data
@Builder
public class ClassificationResult {

    private List<String> techniqueIds;
    private List<String> techniqueNames;
    private double confidence;
    private String reason;

    /** True when no rule matched and classification could not be determined. */
    private boolean unknown;

    /**
     * Convenience factory for a failed classification.
     * The Orchestrator treats "unknown" as low-confidence (0.3) and may fall back
     * to a secondary strategy or flag the incident for human review.
     */
    public static ClassificationResult unknown() {
        return ClassificationResult.builder()
                .unknown(true)
                .confidence(0.3)
                .reason("No matching rule found — requires manual review")
                .techniqueIds(List.of())
                .techniqueNames(List.of())
                .build();
    }
}

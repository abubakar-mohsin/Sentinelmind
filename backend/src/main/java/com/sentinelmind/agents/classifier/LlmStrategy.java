package com.sentinelmind.agents.classifier;

import com.sentinelmind.model.Finding;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * LlmStrategy — Strategy Pattern (Bonus), active only under @Profile("real")
 *
 * Uses an LLM (e.g., Claude or GPT-4) to classify novel attack patterns
 * that the rule-based strategy doesn't recognise. More flexible than rules,
 * but slower and costs money — so it is never loaded in demo/mock mode.
 *
 * In the "real" profile, ThreatClassifierAgent will inject this as the
 * primary strategy and fall back to RuleBasedStrategy if the LLM returns unknown.
 */
@Component
@Profile("real")
public class LlmStrategy implements ClassificationStrategy {

    private final LlmApiClient llmClient;

    public LlmStrategy(LlmApiClient llmClient) {
        this.llmClient = llmClient;
    }

    @Override
    public ClassificationResult classify(Finding finding) {
        String prompt = "You are a cybersecurity analyst. Analyze this security finding "
                + "and return the most relevant MITRE ATT&CK technique IDs. "
                + "Finding: " + finding.getSummary()
                + " | Source IP: " + finding.getSourceIp()
                + " | Severity: " + finding.getSeverity();

        String response = llmClient.complete(prompt);

        // In a real implementation this would parse the LLM's JSON response.
        // For now return unknown so the Orchestrator falls back to rule-based.
        return ClassificationResult.unknown();
    }

    /**
     * Parse a structured LLM response into a ClassificationResult.
     * Placeholder — implement when wiring up the real LLM API.
     */
    public static ClassificationResult parseFromLlm(String llmResponse) {
        // TODO: parse JSON from LLM response
        return ClassificationResult.builder()
                .techniqueIds(List.of())
                .techniqueNames(List.of())
                .confidence(0.5)
                .reason("LLM classification (unparsed): " + llmResponse)
                .unknown(true)
                .build();
    }
}

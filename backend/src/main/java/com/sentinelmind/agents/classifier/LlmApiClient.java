package com.sentinelmind.agents.classifier;

/**
 * LlmApiClient — placeholder interface for the LLM API (real profile only).
 * A concrete implementation would call Claude/GPT-4 via HTTP in the "real" profile.
 */
public interface LlmApiClient {

    /** Send a prompt and return the model's text completion. */
    String complete(String prompt);
}

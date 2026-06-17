package com.sentinelmind.llm;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * GroqClient — HTTP client for the Groq LLM API (OpenAI-compatible endpoint).
 *
 * Uses Java 21's built-in java.net.http.HttpClient — no SDK dependency needed.
 * The Groq API is OpenAI-compatible: POST /openai/v1/chat/completions with a
 * JSON body containing model + messages[].
 *
 * isConfigured() returns false when GROQ_API_KEY is not set ("not-set"),
 * allowing all callers to gracefully degrade without any extra error handling.
 *
 * This class is @Component (singleton Spring bean) so it is injected wherever
 * real AI reasoning is needed: LlmStrategy and OrchestratorAgent.
 */
@Component
public class GroqClient {

    private static final Logger log = LoggerFactory.getLogger(GroqClient.class);

    @Value("${groq.api-key:not-set}")
    private String apiKey;

    @Value("${groq.model:llama-3.3-70b-versatile}")
    private String model;

    @Value("${groq.base-url:https://api.groq.com/openai/v1}")
    private String baseUrl;

    @Value("${groq.max-tokens:1024}")
    private int maxTokens;

    @Value("${groq.temperature:0.1}")
    private double temperature;

    /**
     * Runs once after Spring injects all @Value fields.
     * Logs whether Groq is active so the startup log shows the key injection result.
     * Look for "[GROQ]" lines in the backend container log to confirm the key arrived.
     */
    @PostConstruct
    public void logStartupStatus() {
        log.info("[GROQ] ══════════════════════════════════════════════");
        log.info("[GROQ] API key configured: {}", isConfigured());
        log.info("[GROQ] Model: {}", model);
        log.info("[GROQ] Base URL: {}", baseUrl);
        if (!isConfigured()) {
            log.info("[GROQ] ── Running in RULE-BASED fallback mode (no GROQ_API_KEY)");
        } else {
            log.info("[GROQ] ── Real AI reasoning ENABLED via Groq");
        }
        log.info("[GROQ] ══════════════════════════════════════════════");
    }

    // Reuse the same HttpClient instance — it is thread-safe
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    // Jackson ObjectMapper — configured to handle Groq's multi-line reasoning responses.
    // ALLOW_UNQUOTED_CONTROL_CHARS is required because Groq's verbose "reasoning" field
    // can contain literal newline characters (\\n, code 10) inside the JSON string value,
    // which strict JSON forbids but Groq emits when producing multi-paragraph output.
    @SuppressWarnings("deprecation")
    private final ObjectMapper objectMapper = new ObjectMapper()
            .configure(JsonParser.Feature.ALLOW_UNQUOTED_CONTROL_CHARS, true)
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    /**
     * Returns true only when a real API key has been injected via GROQ_API_KEY.
     * LlmStrategy and OrchestratorAgent both call this before attempting a Groq request.
     */
    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank() && !apiKey.equals("not-set");
    }

    /**
     * Send a chat request to Groq and return the assistant's reply as a plain string.
     *
     * @param systemPrompt  The system message (sets the model's role/behaviour)
     * @param userMessage   The user message (the actual question or situation)
     * @return              The model's reply text, or an error string on failure
     * @throws RuntimeException if the HTTP request fails or the response cannot be parsed
     */
    public String chat(String systemPrompt, String userMessage) {
        try {
            // Build the JSON body manually to avoid SDK dependency
            Map<String, Object> body = Map.of(
                "model", model,
                "max_tokens", maxTokens,
                "temperature", temperature,
                "messages", List.of(
                    Map.of("role", "system", "content", systemPrompt),
                    Map.of("role", "user",   "content", userMessage)
                )
            );

            String requestBody = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/chat/completions"))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(30))
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            log.debug("[GROQ] Sending request to {} with model={}", baseUrl, model);

            HttpResponse<String> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("[GROQ] HTTP {} — body: {}", response.statusCode(), response.body());
                throw new RuntimeException("Groq API returned HTTP " + response.statusCode());
            }

            // Parse: { "choices": [ { "message": { "content": "..." } } ] }
            JsonNode root    = objectMapper.readTree(response.body());
            JsonNode content = root.path("choices").get(0).path("message").path("content");

            String reply = content.asText();
            log.debug("[GROQ] Response: {}", reply.length() > 200 ? reply.substring(0, 200) + "…" : reply);
            return reply;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Groq request interrupted", e);
        } catch (Exception e) {
            log.error("[GROQ] Request failed: {}", e.getMessage());
            throw new RuntimeException("Groq request failed: " + e.getMessage(), e);
        }
    }
}

package com.sentinelmind.agents.classifier;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sentinelmind.api.WebSocketGateway;
import com.sentinelmind.llm.GroqClient;
import com.sentinelmind.model.Finding;
import com.sentinelmind.model.WebSocketMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * LlmStrategy — Strategy Pattern (Bonus), powered by Groq llama-3.3-70b-versatile.
 *
 * This is the PRIMARY ClassificationStrategy — it is always active in all profiles.
 * When GROQ_API_KEY is set, it sends the finding to the real Groq LLM and parses
 * a structured JSON response with MITRE ATT&CK mappings.
 * When GROQ_API_KEY is NOT set (demo/mock mode), isConfigured() returns false and
 * we immediately delegate to the injected RuleBasedStrategy fallback — so the demo
 * always works without any API key.
 *
 * Why @Primary? Because there are two ClassificationStrategy beans (this one and
 * RuleBasedStrategy). @Primary tells Spring to prefer this one when injecting
 * ClassificationStrategy WITHOUT a @Qualifier. ThreatClassifierAgent uses
 * @Qualifier("llmStrategy") for extra explicitness — both mechanisms agree.
 *
 * This class demonstrates the Strategy pattern: ThreatClassifierAgent calls
 * classify() on the interface without knowing whether it's running LLM or rules.
 */
@Component("llmStrategy")
@Primary
public class LlmStrategy implements ClassificationStrategy {

    private static final Logger log = LoggerFactory.getLogger(LlmStrategy.class);

    private static final String RULE_BASED_MESSAGE =
            "Groq API unavailable. Rule-based classification applied: Tor exit node, off-hours login, and robotic latency match a credential stuffing pattern. This is not AI reasoning.";

    private static final String RULE_BASED_SUMMARY =
            "Fallback techniques: T1078, T1110.004 | Confidence: 1.0 (rule match, not AI-computed)";

    /**
     * The system prompt that shapes the model's response format.
     * We demand strict JSON so we can parse it reliably.
     */
    private static final String MITRE_SYSTEM_PROMPT = """
        You are a MITRE ATT&CK cybersecurity expert. Analyze security findings and
        map them to the most relevant ATT&CK techniques.

        You MUST respond ONLY with valid JSON in this exact format — no markdown, no prose:
        {
            "techniqueIds": ["T1078", "T1110.004"],
            "techniqueNames": ["Valid Accounts", "Credential Stuffing"],
            "confidence": 0.95,
            "reasoning": "Brief one-sentence explanation"
        }

        If you cannot classify, return:
        {"techniqueIds": [], "techniqueNames": [], "confidence": 0.0, "reasoning": "Cannot classify"}
        """;

    private final GroqClient groqClient;
    private final RuleBasedStrategy fallback;
    private final WebSocketGateway wsGateway;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public LlmStrategy(GroqClient groqClient, RuleBasedStrategy fallback, WebSocketGateway wsGateway) {
        this.groqClient = groqClient;
        this.fallback   = fallback;
        this.wsGateway  = wsGateway;
    }

    @Override
    public ClassificationResult classify(Finding finding) {
        // When Groq is not configured, immediately use rule-based strategy.
        // This keeps the demo working without any API key.
        if (!groqClient.isConfigured()) {
            log.info("[LLM_STRATEGY] Groq not configured — delegating to RuleBasedStrategy");
            broadcastRuleBasedFallback();
            return fallback.classify(finding);
        }

        try {
            String userMessage = buildUserMessage(finding);
            log.info("[LLM_STRATEGY] Sending finding to Groq for MITRE ATT&CK classification");

            String response = groqClient.chat(MITRE_SYSTEM_PROMPT, userMessage);
            ClassificationResult result = parseResponse(response, finding);

            log.info("[LLM_STRATEGY] Groq classified: techniques={} confidence={}",
                    result.getTechniqueIds(), result.getConfidence());

            return result;

        } catch (Exception e) {
            log.error("[LLM_STRATEGY] Groq classification failed: {} — falling back to rules",
                    e.getMessage());
            broadcastRuleBasedFallback();
            return fallback.classify(finding);
        }
    }

    /**
     * Builds the user message sent to Groq, including all observable evidence
     * from the Finding so the model has full context for its classification.
     */
    private String buildUserMessage(Finding finding) {
        return String.format("""
            Classify this security finding:

            SOURCE IP: %s
            IS TOR NODE: %s
            THREAT FEEDS: %d feeds flagged this IP
            LOGIN HOUR: %d:00 (24h, UTC)
            LOGIN LATENCY: %dms (robotic speed = <500ms)
            COUNTRY: RU

            Evidence:
            %s
            """,
            finding.getSourceIp() != null ? finding.getSourceIp() : "unknown",
            finding.isTorNode() ? "YES — confirmed Tor exit node" : "NO",
            finding.getFeedCount(),
            finding.getHour(),
            finding.getLoginLatencyMs(),
            finding.getSummary() != null ? finding.getSummary() : "No additional summary"
        );
    }

    /**
     * Parse the JSON response from Groq into a ClassificationResult.
     * Strips any markdown fences the model may have added despite instructions.
     * Falls back to rule-based if the JSON is malformed.
     */
    private ClassificationResult parseResponse(String response, Finding finding) {
        try {
            // Strip ```json ... ``` fences if the model added them despite instructions
            String clean = response.trim();
            if (clean.startsWith("```")) {
                clean = clean.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
            }

            // Find the JSON object boundaries (model sometimes adds preamble text)
            int start = clean.indexOf('{');
            int end   = clean.lastIndexOf('}') + 1;
            if (start == -1 || end == 0) {
                log.warn("[LLM_STRATEGY] No JSON object found in response — falling back");
                broadcastRuleBasedFallback();
                return fallback.classify(finding);
            }

            JsonNode root = objectMapper.readTree(clean.substring(start, end));

            List<String> ids   = new ArrayList<>();
            List<String> names = new ArrayList<>();
            root.path("techniqueIds").forEach(n   -> ids.add(n.asText()));
            root.path("techniqueNames").forEach(n -> names.add(n.asText()));
            double confidence = root.path("confidence").asDouble(0.0);
            String reasoning  = root.path("reasoning").asText("AI classification");

            if (ids.isEmpty() || confidence == 0.0) {
                log.info("[LLM_STRATEGY] Groq returned empty/zero-confidence result — falling back");
                broadcastRuleBasedFallback();
                return fallback.classify(finding);
            }

            wsGateway.broadcast(WebSocketMessage.builder()
                    .type("AI_REASONING")
                    .timestamp(Instant.now().toString())
                    .agentName("ThreatClassifierAgent")
                    .dataSource("GROQ_AI")
                    .agentStatus("CLASSIFICATION_COMPLETE")
                    .message(reasoning)
                    .summary("Techniques: " + String.join(", ", ids) + " | Confidence: " + confidence)
                    .build());

            return ClassificationResult.builder()
                    .techniqueIds(ids)
                    .techniqueNames(names)
                    .confidence(confidence)
                    .reason("Groq AI: " + reasoning)
                    .unknown(false)
                    .build();

        } catch (Exception e) {
            log.error("[LLM_STRATEGY] Failed to parse Groq response: {}", e.getMessage());
            broadcastRuleBasedFallback();
            return fallback.classify(finding);
        }
    }

    private void broadcastRuleBasedFallback() {
        wsGateway.broadcast(WebSocketMessage.builder()
                .type("AI_REASONING")
                .timestamp(Instant.now().toString())
                .agentName("ThreatClassifierAgent")
                .dataSource("RULE_BASED")
                .agentStatus("RULE_BASED_CLASSIFICATION")
                .message(RULE_BASED_MESSAGE)
                .summary(RULE_BASED_SUMMARY)
                .build());
    }
}

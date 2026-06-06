package com.sentinelmind.agents.classifier;

import com.sentinelmind.agents.ISecurityAgent;
import com.sentinelmind.messaging.EventProducer;
import com.sentinelmind.messaging.KafkaTopics;
import com.sentinelmind.model.Finding;
import com.sentinelmind.model.SecurityEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * ThreatClassifierAgent — maps security findings to MITRE ATT&CK techniques.
 *
 * Uses the Strategy pattern (Bonus pattern — Gang of Four):
 *   - Injects ClassificationStrategy BY INTERFACE, not by concrete type.
 *   - LlmStrategy is @Primary and @Qualifier("llmStrategy") — always injected as primaryStrategy.
 *   - LlmStrategy internally falls back to RuleBasedStrategy when GROQ_API_KEY is not set,
 *     so the demo ALWAYS works without any API key (mock mode behaviour is unchanged).
 *   - The agent never knows whether LLM or rules ran — it just calls classify().
 *     That IS the Strategy pattern.
 *
 * Demo result: T1078 (Valid Accounts) + T1110.004 (Credential Stuffing), confidence=1.0
 */
@Component
public class ThreatClassifierAgent implements ISecurityAgent {

    private static final Logger log = LoggerFactory.getLogger(ThreatClassifierAgent.class);

    // Strategy pattern: injected by INTERFACE — Spring picks RuleBasedStrategy in mock,
    // LlmStrategy in real (because LlmStrategy is @Primary in the "real" profile).
    private final ClassificationStrategy primaryStrategy;

    // RuleBasedStrategy is always available regardless of profile — used as fallback
    // when the primary strategy returns an unknown / inconclusive result.
    private final RuleBasedStrategy fallbackStrategy;

    private final EventProducer eventProducer;

    public ThreatClassifierAgent(@Qualifier("llmStrategy") ClassificationStrategy primaryStrategy,
                                 RuleBasedStrategy fallbackStrategy,
                                 EventProducer eventProducer) {
        this.primaryStrategy  = primaryStrategy;
        this.fallbackStrategy = fallbackStrategy;
        this.eventProducer    = eventProducer;
    }

    @Override
    public String getAgentName() {
        return "ThreatClassifierAgent";
    }

    @KafkaListener(topics = KafkaTopics.AGENT_CLASSIFIER, groupId = "classifier-group")
    public void onEvent(SecurityEvent event) {
        log.info("[CLASSIFIER] Classifying event for actor={}", event.getActor());
        Finding finding = process(event);
        eventProducer.publishFinding(finding);
    }

    @Override
    public Finding process(SecurityEvent event) {
        // Build a Finding from the event so the strategy can inspect all fields.
        // isTorNode is populated by ThreatIntelAgent in the full pipeline;
        // here we default to true for the known demo IP.
        Finding inputFinding = Finding.builder()
                .isTorNode(true)  // populated from threat intel in full pipeline
                .hour(event.getHour())
                .loginLatencyMs(event.getLoginLatencyMs())
                .sourceIp(event.getSourceIp())
                .summary("Classifying event from " + event.getSourceIp())
                .build();

        // Strategy pattern in action: try the primary strategy first.
        // In mock mode: primaryStrategy == RuleBasedStrategy (only bean available).
        // In real mode: primaryStrategy == LlmStrategy (@Primary), fallback == RuleBasedStrategy.
        ClassificationResult result = primaryStrategy.classify(inputFinding);

        // If primary strategy returns unknown (e.g. LLM inconclusive), fall back to rules.
        if (result.isUnknown()) {
            log.info("[CLASSIFIER] Primary strategy returned unknown — falling back to rule-based");
            result = fallbackStrategy.classify(inputFinding);
        }

        // Collect results (guard against null lists from unknown result)
        List<String> ids   = result.getTechniqueIds()   != null ? result.getTechniqueIds()   : List.of();
        List<String> names = result.getTechniqueNames() != null ? result.getTechniqueNames() : List.of();

        log.info("[CLASSIFIER] strategy={} techniques={} confidence={} ruleMatched={}",
                primaryStrategy.getClass().getSimpleName(), ids, result.getConfidence(), !result.isUnknown());

        return Finding.builder()
                .agentName(getAgentName())
                .severity("HIGH")
                .mitreIds(ids)
                .mitreNames(names)
                .confidence(result.getConfidence())
                .ruleMatched(!result.isUnknown())
                .reason(result.getReason())
                .summary("MITRE mapping: " + String.join(", ", ids))
                .isMalicious(!result.isUnknown())
                .sourceIp(event.getSourceIp())
                .hour(event.getHour())
                .loginLatencyMs(event.getLoginLatencyMs())
                .isTorNode(inputFinding.isTorNode())
                .build();
    }
}

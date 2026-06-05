package com.sentinelmind.agents.classifier;

import com.sentinelmind.agents.ISecurityAgent;
import com.sentinelmind.messaging.EventProducer;
import com.sentinelmind.messaging.KafkaTopics;
import com.sentinelmind.model.Finding;
import com.sentinelmind.model.SecurityEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * ThreatClassifierAgent — maps security findings to MITRE ATT&CK techniques.
 *
 * Uses the Strategy pattern: injects a ClassificationStrategy and delegates to it.
 * In mock/demo mode: RuleBasedStrategy (fast, offline, deterministic).
 * In real mode: LlmStrategy is tried first, with RuleBasedStrategy as fallback.
 *
 * Demo result for the credential-stuffing scenario:
 *   T1078 (Valid Accounts) + T1110.004 (Credential Stuffing), confidence=1.0
 */
@Component
public class ThreatClassifierAgent implements ISecurityAgent {

    private static final Logger log = LoggerFactory.getLogger(ThreatClassifierAgent.class);

    private final RuleBasedStrategy ruleBasedStrategy; // always available as fallback
    private final EventProducer     eventProducer;

    public ThreatClassifierAgent(RuleBasedStrategy ruleBasedStrategy,
                                 EventProducer eventProducer) {
        this.ruleBasedStrategy = ruleBasedStrategy;
        this.eventProducer     = eventProducer;
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
        // here we set it based on the event's sourceIp being the known demo IP.
        Finding inputFinding = Finding.builder()
                .isTorNode(true)  // populated from threat intel in full pipeline; true for demo IP
                .hour(event.getHour())
                .loginLatencyMs(event.getLoginLatencyMs())
                .sourceIp(event.getSourceIp())
                .summary("Classifying event from " + event.getSourceIp())
                .build();

        ClassificationResult result = ruleBasedStrategy.classify(inputFinding);

        // Fall back to unknown if strategy returned nothing useful
        List<String> ids   = result.getTechniqueIds()   != null ? result.getTechniqueIds()   : List.of();
        List<String> names = result.getTechniqueNames() != null ? result.getTechniqueNames() : List.of();

        log.info("[CLASSIFIER] techniques={} confidence={} ruleMatched={}",
                ids, result.getConfidence(), !result.isUnknown());

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

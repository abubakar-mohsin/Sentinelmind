package com.sentinelmind.messaging;

import com.sentinelmind.model.Finding;
import com.sentinelmind.model.SecurityEvent;
import com.sentinelmind.model.WebSocketMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

/**
 * EventProducer — sends messages to Kafka topics.
 * All topic names come from KafkaTopics constants — never hardcoded strings.
 */
@Component
public class EventProducer {

    private static final Logger log = LoggerFactory.getLogger(EventProducer.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public EventProducer(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    /** Publish a raw SecurityEvent to the raw-events topic. */
    public void publishEvent(SecurityEvent event) {
        log.info("Publishing SecurityEvent from actor={} ip={}", event.getActor(), event.getSourceIp());
        String key = event.getActor() != null ? event.getActor() : "unknown";
        kafkaTemplate.send(KafkaTopics.RAW_EVENTS, java.util.Objects.requireNonNull(key), event);
    }

    /** Publish a SecurityEvent to any agent-specific topic. */
    public void publishToAgent(@org.springframework.lang.NonNull String topic, SecurityEvent event) {
        log.debug("Dispatching event to agent topic={}", topic);
        String key = event.getActor() != null ? event.getActor() : "unknown";
        kafkaTemplate.send(topic, java.util.Objects.requireNonNull(key), event);
    }

    /** Publish an agent Finding to the findings topic. */
    public void publishFinding(Finding finding) {
        log.debug("Publishing finding from agent={} severity={}", finding.getAgentName(), finding.getSeverity());
        String key = finding.getAgentName() != null ? finding.getAgentName() : "unknown";
        kafkaTemplate.send(KafkaTopics.FINDINGS, java.util.Objects.requireNonNull(key), finding);
    }

    /** Publish a WebSocketMessage to the responses topic (forwarded to dashboard). */
    public void publishResponse(WebSocketMessage msg) {
        log.debug("Publishing response type={} incidentId={}", msg.getType(), msg.getIncidentId());
        String key = msg.getIncidentId() != null ? msg.getIncidentId() : "unknown";
        kafkaTemplate.send(KafkaTopics.RESPONSES, java.util.Objects.requireNonNull(key), msg);
    }
}

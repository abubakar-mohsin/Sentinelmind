package com.sentinelmind.api;

import com.sentinelmind.messaging.KafkaTopics;
import com.sentinelmind.model.WebSocketMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * WebSocketGateway — bridges Kafka and WebSocket.
 * Listens to the responses Kafka topic and broadcasts every message
 * to all dashboard clients subscribed to /topic/events.
 */
@Component
public class WebSocketGateway {

    private static final Logger log = LoggerFactory.getLogger(WebSocketGateway.class);
    private static final String DASHBOARD_TOPIC = "/topic/events";

    private final SimpMessagingTemplate messagingTemplate;

    public WebSocketGateway(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /** Send a message directly to all dashboard subscribers (called by the Orchestrator). */
    public void broadcast(WebSocketMessage message) {
        log.debug("Broadcasting type={} incidentId={}", message.getType(), message.getIncidentId());
        messagingTemplate.convertAndSend(DASHBOARD_TOPIC, message);
    }

    /**
     * Receive a WebSocketMessage from the responses Kafka topic and forward it to the dashboard.
     * This decouples the Orchestrator from knowing anything about WebSocket.
     */
    @KafkaListener(topics = KafkaTopics.RESPONSES, groupId = "websocket-group")
    public void onResponse(WebSocketMessage msg) {
        log.info("Relaying Kafka response to dashboard: type={} incidentId={}", msg.getType(), msg.getIncidentId());
        broadcast(msg);
    }
}

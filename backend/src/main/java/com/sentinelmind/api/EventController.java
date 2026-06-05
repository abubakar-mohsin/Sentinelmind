package com.sentinelmind.api;

import com.sentinelmind.messaging.EventProducer;
import com.sentinelmind.model.SecurityEvent;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * EventController — HTTP entry point for injecting security events.
 * In the demo, simulate_attack.sh POSTs to /api/events to kick off the pipeline.
 */
@RestController
@RequestMapping("/api")
public class EventController {

    private final EventProducer eventProducer;

    public EventController(EventProducer eventProducer) {
        this.eventProducer = eventProducer;
    }

    /**
     * Accept a raw security event and publish it to Kafka.
     * The Orchestrator picks it up from the raw-events topic.
     */
    @PostMapping("/events")
    public ResponseEntity<Map<String, String>> ingestEvent(@RequestBody SecurityEvent event) {
        eventProducer.publishEvent(event);
        return ResponseEntity.accepted().body(Map.of(
                "status", "received",
                "message", "Event injected into raw-events topic"
        ));
    }

    /** Simple health check used by Docker health checks and monitoring. */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "SentinelMind running"));
    }
}

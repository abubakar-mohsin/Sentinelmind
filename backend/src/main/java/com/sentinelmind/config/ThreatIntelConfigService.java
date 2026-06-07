package com.sentinelmind.config;

import org.springframework.stereotype.Service;

/**
 * ThreatIntelConfigService — holds the runtime threat intel mode (mock vs real).
 *
 * The dashboard toggle calls ThreatIntelConfigController which delegates here.
 * ThreatIntelAgent reads isUsingMock() on every event to pick the active feed.
 *
 * volatile ensures thread-safe reads by concurrent Kafka listener threads
 * without the overhead of full synchronization on reads.
 *
 * Default: mock — the demo always works out of the box without an API key.
 */
@Service
public class ThreatIntelConfigService {

    private volatile boolean useMockFeed = true;

    /**
     * Set the active mode. Accepts "mock" or "real" (case-insensitive).
     * Any value other than "real" is treated as mock.
     */
    public void setMode(String mode) {
        this.useMockFeed = !"real".equalsIgnoreCase(mode == null ? "" : mode.trim());
    }

    /** Returns true when the mock feed is active (default). */
    public boolean isUsingMock() {
        return useMockFeed;
    }

    /** Returns "mock" or "real" — used by the GET endpoint and dashboard on page load. */
    public String getCurrentMode() {
        return useMockFeed ? "mock" : "real";
    }
}

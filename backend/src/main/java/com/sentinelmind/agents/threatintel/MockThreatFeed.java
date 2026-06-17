package com.sentinelmind.agents.threatintel;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * MockThreatFeed — Adapter Pattern (Mock Implementation)
 *
 * Provides a hardcoded list of known-bad IPs for demo/testing.
 * Always loaded as a bean. The ThreatIntelAgent switches between
 * this and the real VirusTotal feed at runtime via the dashboard toggle.
 *
 * All six attack scenario IPs are registered here so every demo scenario
 * triggers a full CRITICAL pipeline — anomaly detection, threat intel
 * confirmation, MITRE classification, and automated response.
 */
@Component
@Primary
public class MockThreatFeed implements IThreatFeed {

    private static final Set<String> BAD_IPS = Set.of(
        "185.220.101.47",   // Credential Stuffing + Account Takeover — primary demo IP (Tor exit node)
        "45.33.32.156",     // Brute Force attack scenario
        "192.168.1.45",     // Insider Threat scenario
        "8.8.8.8",          // Impossible Travel scenario
        "10.0.0.99"         // Impersonation scenario
    );

    @Override
    public ThreatResult checkIp(String ipAddress) {
        if (BAD_IPS.contains(ipAddress)) {
            return ThreatResult.builder()
                    .ipAddress(ipAddress)
                    .severity("CRITICAL")
                    .description("Known malicious IP — appears in 4 threat feeds")
                    .isMalicious(true)
                    .feedCount(4)
                    .isTorNode(true)
                    .build();
        }

        return ThreatResult.builder()
                .ipAddress(ipAddress)
                .severity("CLEAN")
                .description("No threats found")
                .isMalicious(false)
                .feedCount(0)
                .isTorNode(false)
                .build();
    }
}

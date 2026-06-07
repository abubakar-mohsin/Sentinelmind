package com.sentinelmind.agents.threatintel;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * MockThreatFeed — Adapter Pattern (Lab 5)
 *
 * This is the "VlcPlayer" from Lab 5 — it already speaks our IThreatFeed
 * interface natively, so no translation is needed.
 *
 * Always loaded as a bean (no @Profile restriction). The dashboard toggle
 * calls ThreatIntelConfigService to switch between this and VirusTotalAdapter
 * at runtime without restarting the application.
 *
 * @Primary makes this the default when IThreatFeed is injected without a
 * qualifier — safe fallback if anything ever bypasses the qualified injection.
 *
 * The IP 185.220.101.47 is a real-world Tor exit node and is guaranteed
 * to trigger a CRITICAL result in the demo scenario.
 */
@Component
@Primary
public class MockThreatFeed implements IThreatFeed {

    private static final Set<String> BAD_IPS = Set.of(
        "185.220.101.47",   // Known Tor exit node — the demo attack IP
        "185.220.100.253",
        "198.98.56.161"
    );

    @Override
    public ThreatResult checkIp(String ipAddress) {
        if (BAD_IPS.contains(ipAddress)) {
            return ThreatResult.builder()
                    .ipAddress(ipAddress)
                    .severity("CRITICAL")
                    .description("Known Tor exit node — appears in 4 threat feeds")
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

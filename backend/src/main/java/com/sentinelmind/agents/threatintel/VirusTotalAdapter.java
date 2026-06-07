package com.sentinelmind.agents.threatintel;

import org.springframework.stereotype.Component;

/**
 * VirusTotalAdapter — THE ADAPTER (Lab 5)
 *
 * VirusTotal speaks its own API format — it returns JSON with "maliciousVotes",
 * "harmlessVotes", engine names, etc. Our ThreatIntelAgent expects a ThreatResult.
 *
 * This adapter implements IThreatFeed (our standard interface) but internally
 * delegates to VirusTotalApiClient (the external API in its own "language").
 * It then TRANSLATES the VirusTotal response into our standard ThreatResult format.
 *
 * This is "MediaAdapter" from Lab 5 — it implements MediaPlayer (IThreatFeed)
 * but internally uses AdvancedMediaPlayer (VirusTotalApiClient).
 * The ThreatIntelAgent never knows which one is behind the interface.
 *
 * Always loaded as a bean (no @Profile restriction). The dashboard toggle
 * activates this feed at runtime via ThreatIntelConfigService.
 */
@Component
public class VirusTotalAdapter implements IThreatFeed {

    private final VirusTotalApiClient virusTotalClient;

    public VirusTotalAdapter(VirusTotalApiClient virusTotalClient) {
        this.virusTotalClient = virusTotalClient;
    }

    @Override
    public ThreatResult checkIp(String ipAddress) {
        // Call VirusTotal's API — response is in VirusTotal's own format
        VirusTotalResponse vtResponse = virusTotalClient.getIpReport(ipAddress);

        // TRANSLATE: convert VirusTotal's vote count into our standard severity/description
        boolean malicious  = vtResponse.getMaliciousVotes() > 5;
        String  severity   = malicious ? "CRITICAL" : "CLEAN";
        String  description = "VirusTotal: " + vtResponse.getMaliciousVotes()
                            + " engines flagged this IP as malicious";

        return ThreatResult.builder()
                .ipAddress(ipAddress)
                .severity(severity)
                .description(description)
                .isMalicious(malicious)
                .feedCount(vtResponse.getMaliciousVotes())
                .isTorNode(false) // VirusTotal does not expose Tor status directly
                .build();
    }
}

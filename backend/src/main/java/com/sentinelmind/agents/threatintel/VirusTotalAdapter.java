package com.sentinelmind.agents.threatintel;

import org.springframework.stereotype.Component;

/**
 * VirusTotalAdapter — Adapter Pattern (Lab 5)
 *
 * Wraps the VirusTotal API behind the IThreatFeed interface.
 * Always loaded as a bean. The ThreatIntelAgent switches to this
 * feed at runtime when the dashboard toggle is set to "Live" mode.
 *
 * This is the Adapter pattern from Lab 5: VirusTotal's API speaks
 * its own format, this class translates it into our IThreatFeed interface.
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

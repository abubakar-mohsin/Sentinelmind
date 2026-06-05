package com.sentinelmind.agents.threatintel;

/**
 * VirusTotalApiClient — placeholder interface for the real VirusTotal REST API.
 * In the "real" Spring profile, a concrete implementation would make HTTP calls.
 * The VirusTotalAdapter translates this client's response into our ThreatResult format.
 */
public interface VirusTotalApiClient {

    /**
     * Fetch the IP reputation report from VirusTotal.
     * Returns the raw VirusTotal response that the Adapter will translate.
     */
    VirusTotalResponse getIpReport(String ipAddress);
}

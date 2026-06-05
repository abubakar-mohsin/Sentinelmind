package com.sentinelmind.agents.threatintel;

/**
 * IThreatFeed — Adapter target interface (Lab 5)
 *
 * This is our "MediaPlayer" from Lab 5.
 * The ThreatIntelAgent ONLY knows about this interface — it never knows
 * whether it is talking to the mock list or the real VirusTotal API.
 * Both implementations look identical from the agent's perspective.
 */
public interface IThreatFeed {

    /**
     * Check whether this IP address is known-malicious.
     * Returns a ThreatResult with severity, description, and feed metadata.
     */
    ThreatResult checkIp(String ipAddress);
}

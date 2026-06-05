package com.sentinelmind.agents.threatintel;

import lombok.Data;

/**
 * VirusTotalResponse — raw response shape from the VirusTotal API.
 * The VirusTotalAdapter reads this and translates it into our standard ThreatResult.
 */
@Data
public class VirusTotalResponse {

    /** How many antivirus/security engines flagged this IP as malicious. */
    private int maliciousVotes;
}

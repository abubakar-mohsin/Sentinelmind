package com.sentinelmind.agents.threatintel;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ThreatResult — the standardised response from any IThreatFeed implementation.
 * Both MockThreatFeed and VirusTotalAdapter return this same object,
 * which is what makes the Adapter pattern work.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ThreatResult {

    private String  ipAddress;
    private String  severity;      // "CRITICAL" or "CLEAN"
    private String  description;
    private boolean isMalicious;
    private int     feedCount;
    private boolean isTorNode;
}

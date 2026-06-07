package com.sentinelmind.agents.threatintel;

import com.sentinelmind.agents.ISecurityAgent;
import com.sentinelmind.config.ThreatIntelConfigService;
import com.sentinelmind.messaging.EventProducer;
import com.sentinelmind.messaging.KafkaTopics;
import com.sentinelmind.model.Finding;
import com.sentinelmind.model.SecurityEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * ThreatIntelAgent — checks the source IP against threat intelligence feeds.
 *
 * Uses the Adapter pattern (Lab 5): both MockThreatFeed and VirusTotalAdapter
 * implement IThreatFeed. This agent injects BOTH and delegates to whichever
 * one ThreatIntelConfigService says is active.
 *
 * The active feed is switched at runtime by the dashboard toggle
 * (POST /api/config/threat-intel-mode) — no restart needed.
 *
 * Demo result for 185.220.101.47 in MOCK mode:
 *   severity=CRITICAL, isTorNode=true, feedCount=4, usedRealApi=false → confidence=1.0
 *
 * In LIVE mode with a real VirusTotal key:
 *   maliciousVotes from the v3 API → usedRealApi=true
 */
@Component
public class ThreatIntelAgent implements ISecurityAgent {

    private static final Logger log = LoggerFactory.getLogger(ThreatIntelAgent.class);

    // Both feeds are always loaded as beans. @Qualifier selects by Spring bean name
    // (MockThreatFeed → "mockThreatFeed", VirusTotalAdapter → "virusTotalAdapter").
    private final IThreatFeed              mockFeed;
    private final IThreatFeed              realFeed;
    private final ThreatIntelConfigService configService;
    private final EventProducer            eventProducer;

    public ThreatIntelAgent(
            @Qualifier("mockThreatFeed")      IThreatFeed mockFeed,
            @Qualifier("virusTotalAdapter")   IThreatFeed realFeed,
            ThreatIntelConfigService configService,
            EventProducer eventProducer) {
        this.mockFeed      = mockFeed;
        this.realFeed      = realFeed;
        this.configService = configService;
        this.eventProducer = eventProducer;
    }

    @Override
    public String getAgentName() {
        return "ThreatIntelAgent";
    }

    @KafkaListener(topics = KafkaTopics.AGENT_THREATINTEL, groupId = "threatintel-group")
    public void onEvent(SecurityEvent event) {
        log.info("[THREATINTEL] Checking IP: {} (mode={})",
                event.getSourceIp(), configService.getCurrentMode());
        Finding finding = process(event);
        eventProducer.publishFinding(finding);
    }

    @Override
    public Finding process(SecurityEvent event) {
        boolean usingMock  = configService.isUsingMock();
        IThreatFeed feed   = usingMock ? mockFeed : realFeed;
        ThreatResult result = feed.checkIp(event.getSourceIp());

        log.info("[THREATINTEL] ip={} malicious={} torNode={} feeds={} usedRealApi={}",
                event.getSourceIp(), result.isMalicious(), result.isTorNode(),
                result.getFeedCount(), !usingMock);

        // When live VirusTotal returns 0 flags, set an informative summary so the
        // dashboard explains WHY confidence is lower (real world: IP not yet in feeds).
        String summary = result.getDescription();
        if (!usingMock && !result.isMalicious()) {
            summary = "VirusTotal: 0 engines flagged this IP — IP appears clean in live threat feeds. " +
                      "Switch to MOCK mode to see the full automated response pipeline with known-malicious IP data.";
        }

        return Finding.builder()
                .agentName(getAgentName())
                .severity(result.getSeverity())
                .isMalicious(result.isMalicious())
                .isTorNode(result.isTorNode())
                .feedCount(result.getFeedCount())
                .confidence(result.isMalicious() ? 1.0 : 0.0)
                .summary(summary)
                .usedRealApi(!usingMock)
                .sourceIp(event.getSourceIp())
                .hour(event.getHour())
                .loginLatencyMs(event.getLoginLatencyMs())
                .build();
    }
}

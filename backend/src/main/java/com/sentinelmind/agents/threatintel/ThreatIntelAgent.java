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
 * ThreatIntelAgent — Threat Intelligence Enrichment
 *
 * Looks up IP reputation from threat feeds. Supports runtime switching
 * between MockThreatFeed (demo data) and VirusTotalAdapter (live API)
 * via the dashboard toggle — no restart needed.
 *
 * Uses the Adapter pattern (Lab 5): both feeds implement IThreatFeed.
 * The agent doesn't know or care which implementation is active.
 */
@Component
public class ThreatIntelAgent implements ISecurityAgent {

    private static final Logger log = LoggerFactory.getLogger(ThreatIntelAgent.class);

    private final IThreatFeed mockFeed;
    private final IThreatFeed realFeed;
    private final ThreatIntelConfigService configService;
    private final EventProducer eventProducer;

    public ThreatIntelAgent(
            @Qualifier("mockThreatFeed") IThreatFeed mockFeed,
            @Qualifier("virusTotalAdapter") IThreatFeed realFeed,
            ThreatIntelConfigService configService,
            EventProducer eventProducer) {
        this.mockFeed = mockFeed;
        this.realFeed = realFeed;
        this.configService = configService;
        this.eventProducer = eventProducer;
    }

    private IThreatFeed getActiveFeed() {
        return configService.isUsingMock() ? mockFeed : realFeed;
    }

    @Override
    public String getAgentName() {
        return "ThreatIntelAgent";
    }

    @KafkaListener(topics = KafkaTopics.AGENT_THREATINTEL, groupId = "threatintel-group")
    public void onEvent(SecurityEvent event) {
        boolean usingReal = !configService.isUsingMock();
        log.info("[THREATINTEL] Checking IP: {} (mode={})",
                event.getSourceIp(), usingReal ? "real" : "mock");
        Finding finding = process(event);
        eventProducer.publishFinding(finding);
    }

    @Override
    public Finding process(SecurityEvent event) {
        boolean usingReal = !configService.isUsingMock();
        ThreatResult result = getActiveFeed().checkIp(event.getSourceIp());

        log.info("[THREATINTEL] ip={} malicious={} torNode={} feeds={} usedRealApi={}",
                event.getSourceIp(), result.isMalicious(), result.isTorNode(),
                result.getFeedCount(), usingReal);

        String summary = result.getDescription();
        if (usingReal && !result.isMalicious()) {
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
                .usedRealApi(usingReal)
                .sourceIp(event.getSourceIp())
                .hour(event.getHour())
                .loginLatencyMs(event.getLoginLatencyMs())
                .build();
    }
}

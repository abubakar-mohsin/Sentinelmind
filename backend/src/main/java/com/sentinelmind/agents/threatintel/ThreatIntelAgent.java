package com.sentinelmind.agents.threatintel;

import com.sentinelmind.agents.ISecurityAgent;
import com.sentinelmind.messaging.EventProducer;
import com.sentinelmind.messaging.KafkaTopics;
import com.sentinelmind.model.Finding;
import com.sentinelmind.model.SecurityEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * ThreatIntelAgent — checks the source IP against threat intelligence feeds.
 *
 * Uses the Adapter pattern: injects IThreatFeed, which is either MockThreatFeed
 * (demo mode) or VirusTotalAdapter (real mode). This agent never knows which one.
 *
 * Demo result for 185.220.101.47:
 *   severity=CRITICAL, isTorNode=true, feedCount=4 → confidence=1.0
 */
@Component
public class ThreatIntelAgent implements ISecurityAgent {

    private static final Logger log = LoggerFactory.getLogger(ThreatIntelAgent.class);

    private final IThreatFeed   threatFeed;
    private final EventProducer eventProducer;

    public ThreatIntelAgent(IThreatFeed threatFeed, EventProducer eventProducer) {
        this.threatFeed    = threatFeed;
        this.eventProducer = eventProducer;
    }

    @Override
    public String getAgentName() {
        return "ThreatIntelAgent";
    }

    @KafkaListener(topics = KafkaTopics.AGENT_THREATINTEL, groupId = "threatintel-group")
    public void onEvent(SecurityEvent event) {
        log.info("[THREATINTEL] Checking IP: {}", event.getSourceIp());
        Finding finding = process(event);
        eventProducer.publishFinding(finding);
    }

    @Override
    public Finding process(SecurityEvent event) {
        ThreatResult result = threatFeed.checkIp(event.getSourceIp());

        log.info("[THREATINTEL] ip={} malicious={} torNode={} feeds={}",
                event.getSourceIp(), result.isMalicious(), result.isTorNode(), result.getFeedCount());

        return Finding.builder()
                .agentName(getAgentName())
                .severity(result.getSeverity())
                .isMalicious(result.isMalicious())
                .isTorNode(result.isTorNode())
                .feedCount(result.getFeedCount())
                .confidence(result.isMalicious() ? 1.0 : 0.0)
                .summary(result.getDescription())
                .sourceIp(event.getSourceIp())
                .hour(event.getHour())
                .loginLatencyMs(event.getLoginLatencyMs())
                .build();
    }
}

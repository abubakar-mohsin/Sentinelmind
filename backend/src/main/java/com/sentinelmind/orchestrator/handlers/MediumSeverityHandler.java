package com.sentinelmind.orchestrator.handlers;

import com.sentinelmind.graph.KnowledgeGraphService;
import com.sentinelmind.model.Finding;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * MediumSeverityHandler — handles MEDIUM, HIGH, CRITICAL findings
 *
 * When a finding reaches this level, it means the Anomaly Detection agent
 * found something suspicious enough to warrant enrichment. This handler
 * queries the Neo4j knowledge graph for prior incidents involving the same IP,
 * adding context that downstream handlers can use.
 */
@Component
public class MediumSeverityHandler extends AbstractEventHandler {

    private static final Logger log = LoggerFactory.getLogger(MediumSeverityHandler.class);

    private final KnowledgeGraphService graphService;

    public MediumSeverityHandler(KnowledgeGraphService graphService) {
        this.handlerLevel = MEDIUM;
        this.graphService = graphService;
    }

    @Override
    protected void process(Finding finding) {
        log.info("[MEDIUM] Escalating finding for IP {} — triggering enrichment context pull",
                finding.getSourceIp());

        try {
            String cypher = "MATCH (ip:IP {address: $ip})-[:ATTACKED]->(u:User) " +
                    "RETURN ip.address as ipAddress, ip.feedCount as feedCount, " +
                    "ip.reputation as reputation, count(u) as priorVictims";

            Map<String, Object> result = graphService.queryOne(cypher,
                    Map.of("ip", finding.getSourceIp() != null ? finding.getSourceIp() : ""));

            if (result != null && result.get("priorVictims") != null) {
                int priorVictims = ((Number) result.get("priorVictims")).intValue();
                finding.setPriorIncidentCount(priorVictims);
                log.info("[MEDIUM] Neo4j context: IP {} has {} prior incidents in graph",
                        finding.getSourceIp(), priorVictims);
            } else {
                log.info("[MEDIUM] Neo4j context: IP {} has 0 prior incidents in graph",
                        finding.getSourceIp());
            }
        } catch (Exception e) {
            log.warn("[MEDIUM] Neo4j query failed for IP {}: {}", finding.getSourceIp(), e.getMessage());
        }
    }
}

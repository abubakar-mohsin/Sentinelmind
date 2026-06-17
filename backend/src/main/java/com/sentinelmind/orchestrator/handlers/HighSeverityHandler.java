package com.sentinelmind.orchestrator.handlers;

import com.sentinelmind.api.WebSocketGateway;
import com.sentinelmind.graph.KnowledgeGraphService;
import com.sentinelmind.model.Finding;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * HighSeverityHandler — handles HIGH and CRITICAL findings
 *
 * At this level the finding has been confirmed as a genuine threat by
 * Threat Intelligence. This handler queries Neo4j for campaign correlation —
 * are there other recent incidents using the same MITRE technique? If so,
 * it pushes a CAMPAIGN_ALERT via WebSocket so the dashboard shows it live.
 */
@Component
public class HighSeverityHandler extends AbstractEventHandler {

    private static final Logger log = LoggerFactory.getLogger(HighSeverityHandler.class);

    private final KnowledgeGraphService graphService;
    private final WebSocketGateway webSocketGateway;

    public HighSeverityHandler(KnowledgeGraphService graphService, WebSocketGateway webSocketGateway) {
        this.handlerLevel = HIGH;
        this.graphService = graphService;
        this.webSocketGateway = webSocketGateway;
    }

    @Override
    protected void process(Finding finding) {
        log.info("[HIGH] Critical path escalation — querying campaign correlation");

        String techniqueId = "T1078";
        List<String> mitreIds = finding.getMitreIds();
        if (mitreIds != null && !mitreIds.isEmpty()) {
            techniqueId = mitreIds.get(0);
        }

        try {
            long cutoff = System.currentTimeMillis() - (30L * 24 * 60 * 60 * 1000);

            String cypher = "MATCH (i:Incident)-[:USES_TECHNIQUE]->(t:AttackTechnique {id: $techniqueId}) " +
                    "WHERE i.detectedAt > $cutoff " +
                    "RETURN count(i) as relatedIncidents, t.name as techniqueName";

            Map<String, Object> result = graphService.queryOne(cypher,
                    Map.of("techniqueId", techniqueId, "cutoff", cutoff));

            int relatedIncidents = 0;
            String techniqueName = techniqueId;

            if (result != null) {
                if (result.get("relatedIncidents") != null) {
                    relatedIncidents = ((Number) result.get("relatedIncidents")).intValue();
                }
                if (result.get("techniqueName") != null) {
                    techniqueName = result.get("techniqueName").toString();
                }
            }

            if (relatedIncidents > 0) {
                finding.setRelatedCampaignCount(relatedIncidents);
                log.info("[HIGH] Campaign correlation: {} related incidents with technique {} in last 30 days",
                        relatedIncidents, techniqueName);
            }

            if (relatedIncidents > 1) {
                Map<String, Object> alert = new LinkedHashMap<>();
                alert.put("type", "CAMPAIGN_ALERT");
                alert.put("severity", "HIGH");
                alert.put("message", "Active campaign detected: " + relatedIncidents
                        + " incidents using " + techniqueName);
                alert.put("techniqueId", techniqueId);
                alert.put("relatedCount", relatedIncidents);
                webSocketGateway.sendRawAlert(alert);
            }
        } catch (Exception e) {
            log.warn("[HIGH] Campaign correlation query failed: {}", e.getMessage());
        }
    }
}

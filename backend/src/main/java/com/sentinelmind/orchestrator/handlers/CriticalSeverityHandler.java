package com.sentinelmind.orchestrator.handlers;

import com.sentinelmind.api.WebSocketGateway;
import com.sentinelmind.model.Finding;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * CriticalSeverityHandler — handles CRITICAL findings only
 *
 * The last and most important handler in the chain.
 * A CRITICAL finding means the Orchestrator's combined confidence exceeded 0.92
 * and the Incident Responder is about to execute the full playbook.
 * This handler pushes a CRITICAL_ALERT via WebSocket for live dashboard display.
 */
@Component
public class CriticalSeverityHandler extends AbstractEventHandler {

    private static final Logger log = LoggerFactory.getLogger(CriticalSeverityHandler.class);

    private final WebSocketGateway webSocketGateway;

    public CriticalSeverityHandler(WebSocketGateway webSocketGateway) {
        this.handlerLevel = CRITICAL;
        this.webSocketGateway = webSocketGateway;
    }

    @Override
    protected void process(Finding finding) {
        log.info("[CRITICAL] *** AUTOMATED RESPONSE AUTHORIZED — confidence threshold met ***");

        Map<String, Object> alert = new LinkedHashMap<>();
        alert.put("type", "CRITICAL_ALERT");
        alert.put("severity", "CRITICAL");
        alert.put("sourceIp", finding.getSourceIp());
        alert.put("actor", finding.getActor());
        alert.put("message", "Critical security incident confirmed. Initiating automated response playbook.");
        alert.put("timestamp", Instant.now().toString());
        webSocketGateway.sendRawAlert(alert);

        log.info("[CRITICAL] Response playbook dispatched for IP {} actor {}",
                finding.getSourceIp(), finding.getActor());
    }
}

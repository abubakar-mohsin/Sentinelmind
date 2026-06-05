package com.sentinelmind.orchestrator.handlers;

import com.sentinelmind.model.Finding;
import org.springframework.stereotype.Component;

/**
 * CriticalSeverityHandler — handles CRITICAL findings only
 *
 * The last and most important handler in the chain.
 * A CRITICAL finding means the Orchestrator's combined confidence exceeded 0.92
 * and the Incident Responder is about to execute the full playbook.
 * This handler announces the automated response for observability.
 */
@Component
public class CriticalSeverityHandler extends AbstractEventHandler {

    public CriticalSeverityHandler() {
        this.handlerLevel = CRITICAL;
    }

    @Override
    protected void process(Finding finding) {
        System.out.println("[CRITICAL RESPONSE] Triggering automated response!");
    }
}

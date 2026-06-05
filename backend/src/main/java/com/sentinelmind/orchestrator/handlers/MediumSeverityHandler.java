package com.sentinelmind.orchestrator.handlers;

import com.sentinelmind.model.Finding;
import org.springframework.stereotype.Component;

/**
 * MediumSeverityHandler — handles MEDIUM, HIGH, CRITICAL findings
 *
 * When a finding reaches this level, it means the Anomaly Detection agent
 * found something suspicious enough to warrant a threat intelligence check.
 * Logs a structured message so operators can see the IP being investigated.
 */
@Component
public class MediumSeverityHandler extends AbstractEventHandler {

    public MediumSeverityHandler() {
        this.handlerLevel = MEDIUM;
    }

    @Override
    protected void process(Finding finding) {
        System.out.println("[THREAT INTEL] Running IP check for: " + finding.getSummary());
    }
}

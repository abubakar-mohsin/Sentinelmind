package com.sentinelmind.orchestrator.handlers;

import com.sentinelmind.model.Finding;
import org.springframework.stereotype.Component;

/**
 * LowSeverityHandler — handles ALL findings (logs every one of them)
 *
 * This is "ConsoleLogger" from Lab 7 — it matches INFO level and above,
 * meaning it fires on every single finding regardless of severity.
 * Its job is to ensure every finding gets an audit log entry.
 */
@Component
public class LowSeverityHandler extends AbstractEventHandler {

    public LowSeverityHandler() {
        this.handlerLevel = LOW;
    }

    @Override
    protected void process(Finding finding) {
        System.out.println("[AUDIT LOG] Finding received: " + finding.getSummary());
    }
}

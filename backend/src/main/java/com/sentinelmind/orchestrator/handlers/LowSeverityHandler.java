package com.sentinelmind.orchestrator.handlers;

import com.sentinelmind.model.Finding;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * LowSeverityHandler — handles ALL findings (logs every one of them)
 *
 * This is "ConsoleLogger" from Lab 7 — it matches INFO level and above,
 * meaning it fires on every single finding regardless of severity.
 * Its job is to ensure every finding gets a structured audit log entry.
 */
@Component
public class LowSeverityHandler extends AbstractEventHandler {

    private static final Logger log = LoggerFactory.getLogger(LowSeverityHandler.class);

    public LowSeverityHandler() {
        this.handlerLevel = LOW;
    }

    @Override
    protected void process(Finding finding) {
        log.info("[AUDIT] severity={} sourceIp={} actor={} description={}",
                finding.getSeverity(),
                finding.getSourceIp(),
                finding.getActor(),
                finding.getSummary());
    }
}

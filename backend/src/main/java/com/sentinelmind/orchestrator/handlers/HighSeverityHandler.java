package com.sentinelmind.orchestrator.handlers;

import com.sentinelmind.model.Finding;
import org.springframework.stereotype.Component;

/**
 * HighSeverityHandler — handles HIGH and CRITICAL findings
 *
 * At this level the finding has been confirmed as a genuine threat by
 * Threat Intelligence. This handler escalates visibly so on-call engineers
 * can see the event even before automated response fires.
 */
@Component
public class HighSeverityHandler extends AbstractEventHandler {

    public HighSeverityHandler() {
        this.handlerLevel = HIGH;
    }

    @Override
    protected void process(Finding finding) {
        System.out.println("[HIGH ALERT] Escalating: " + finding.getSummary());
    }
}

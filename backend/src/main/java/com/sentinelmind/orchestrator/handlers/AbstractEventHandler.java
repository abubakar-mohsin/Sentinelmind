package com.sentinelmind.orchestrator.handlers;

import com.sentinelmind.model.Finding;

/**
 * AbstractEventHandler — Chain of Responsibility base class (Lab 7)
 *
 * This is our "AbstractLogger" from Lab 7.
 * Each handler has a severity level it responds to AND a reference to the
 * next handler in the chain. A finding passes through the chain from LOW
 * to CRITICAL — every handler that matches does its work, then passes it on.
 *
 * Chain order: LowSeverityHandler → MediumSeverityHandler
 *            → HighSeverityHandler → CriticalSeverityHandler
 *
 * Customer-service analogy: Level-1 support handles basic issues.
 * If unresolved → Level-2 supervisor. If still unresolved → Manager.
 * Each level handles the case AND escalates — no level swallows the event.
 */
public abstract class AbstractEventHandler {

    // Severity level constants — same idea as INFO=1, DEBUG=2, ERROR=3 in Lab 7
    public static final int LOW      = 1;
    public static final int MEDIUM   = 2;
    public static final int HIGH     = 3;
    public static final int CRITICAL = 4;

    protected int handlerLevel;
    protected AbstractEventHandler nextHandler;

    /** Wire up the next handler in the chain. */
    public void setNextHandler(AbstractEventHandler next) {
        this.nextHandler = next;
    }

    /**
     * Pass the finding through the chain.
     * This handler acts if the finding severity meets its threshold,
     * then always forwards to the next handler.
     */
    public void handle(Finding finding) {
        if (this.handlerLevel <= finding.getSeverityLevel()) {
            process(finding);
        }
        if (nextHandler != null) {
            nextHandler.handle(finding);
        }
    }

    /** Each subclass defines what it actually does when its level matches. */
    protected abstract void process(Finding finding);
}

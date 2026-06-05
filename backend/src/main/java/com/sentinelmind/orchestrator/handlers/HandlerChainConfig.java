package com.sentinelmind.orchestrator.handlers;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * HandlerChainConfig — wires the Chain of Responsibility into a single bean.
 *
 * Builds: LowSeverityHandler → MediumSeverityHandler → HighSeverityHandler → CriticalSeverityHandler
 *
 * The Orchestrator injects the head of the chain (LowSeverityHandler) and calls
 * chain.handle(finding) — the finding automatically flows through all four levels.
 *
 * This is identical to building the AbstractLogger chain in Lab 7:
 *   errorLogger → fileLogger → consoleLogger
 */
@Configuration
public class HandlerChainConfig {

    private final LowSeverityHandler      lowHandler;
    private final MediumSeverityHandler   mediumHandler;
    private final HighSeverityHandler     highHandler;
    private final CriticalSeverityHandler criticalHandler;

    public HandlerChainConfig(LowSeverityHandler lowHandler,
                              MediumSeverityHandler mediumHandler,
                              HighSeverityHandler highHandler,
                              CriticalSeverityHandler criticalHandler) {
        this.lowHandler      = lowHandler;
        this.mediumHandler   = mediumHandler;
        this.highHandler     = highHandler;
        this.criticalHandler = criticalHandler;
    }

    /**
     * Build and return the head of the severity escalation chain.
     * Inject this bean wherever you need to handle a Finding.
     */
    @Bean
    public AbstractEventHandler severityHandlerChain() {
        lowHandler.setNextHandler(mediumHandler);
        mediumHandler.setNextHandler(highHandler);
        highHandler.setNextHandler(criticalHandler);
        return lowHandler; // head of the chain
    }
}

package com.sentinelmind.agents;

import com.sentinelmind.model.Finding;
import com.sentinelmind.model.SecurityEvent;

/**
 * ISecurityAgent — interface all agents implement.
 * The Orchestrator only knows about this interface, never concrete agent classes.
 * Adding a new agent means implementing this interface — the Orchestrator needs no changes.
 */
public interface ISecurityAgent {

    /**
     * Analyze the event and return a Finding with the agent's assessment.
     */
    Finding process(SecurityEvent event);

    /**
     * Human-readable agent name used in logs, findings, and the dashboard.
     */
    String getAgentName();
}

package com.sentinelmind.agents;

import com.sentinelmind.agents.anomaly.AnomalyDetectionAgent;
import com.sentinelmind.agents.classifier.ThreatClassifierAgent;
import com.sentinelmind.agents.responder.IncidentResponderAgent;
import com.sentinelmind.agents.threatintel.ThreatIntelAgent;
import org.springframework.stereotype.Component;

/**
 * AgentFactory — Factory Method Pattern (Lab 3)
 * The Orchestrator asks for an agent by type name.
 * The factory returns the right agent object.
 * The Orchestrator never uses "new" to create agents directly.
 * Real-world analogy: a car dealership — you say what you want, they handle the rest.
 */
@Component
public class AgentFactory {

    public static final String ANOMALY      = "ANOMALY";
    public static final String THREAT_INTEL = "THREAT_INTEL";
    public static final String CLASSIFIER   = "CLASSIFIER";
    public static final String RESPONDER    = "RESPONDER";

    private final AnomalyDetectionAgent anomalyAgent;
    private final ThreatIntelAgent      threatIntelAgent;
    private final ThreatClassifierAgent classifierAgent;
    private final IncidentResponderAgent responderAgent;

    public AgentFactory(AnomalyDetectionAgent anomalyAgent,
                        ThreatIntelAgent threatIntelAgent,
                        ThreatClassifierAgent classifierAgent,
                        IncidentResponderAgent responderAgent) {
        this.anomalyAgent     = anomalyAgent;
        this.threatIntelAgent = threatIntelAgent;
        this.classifierAgent  = classifierAgent;
        this.responderAgent   = responderAgent;
    }

    /**
     * Return the agent for the given type string.
     * Throws IllegalArgumentException for unknown types so the Orchestrator fails fast.
     */
    public ISecurityAgent getAgent(String agentType) {
        return switch (agentType) {
            case ANOMALY      -> anomalyAgent;
            case THREAT_INTEL -> threatIntelAgent;
            case CLASSIFIER   -> classifierAgent;
            case RESPONDER    -> responderAgent;
            default -> throw new IllegalArgumentException("Unknown agent type: " + agentType);
        };
    }
}

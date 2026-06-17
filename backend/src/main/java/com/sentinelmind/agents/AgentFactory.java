package com.sentinelmind.agents;

import com.sentinelmind.agents.anomaly.AnomalyDetectionAgent;
import com.sentinelmind.agents.classifier.ThreatClassifierAgent;
import com.sentinelmind.agents.responder.IncidentResponderAgent;
import com.sentinelmind.agents.threatintel.ThreatIntelAgent;
import com.sentinelmind.messaging.KafkaTopics;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * AgentFactory — Factory Method Pattern (Lab 3)
 *
 * Central registry of all security agents in the system.
 * The Orchestrator uses this to RESOLVE which agents to dispatch
 * and to get their Kafka topics. It never hardcodes agent types
 * or topic names — all routing goes through this factory.
 *
 * Adding a new agent = register it here. Nothing else changes.
 *
 * Like ShapeFactory from Lab 3: you ask for a type, you get back
 * everything you need to work with that agent.
 */
@Component
public class AgentFactory {

    /**
     * Holds everything the Orchestrator needs to dispatch to an agent:
     * the agent bean reference and its Kafka topic.
     */
    public record AgentRegistration(
        String type,
        ISecurityAgent agent,
        String kafkaTopic
    ) {}

    private final Map<String, AgentRegistration> registry = new LinkedHashMap<>();

    public AgentFactory(
            AnomalyDetectionAgent anomalyAgent,
            ThreatIntelAgent threatIntelAgent,
            ThreatClassifierAgent classifierAgent,
            IncidentResponderAgent responderAgent) {

        registry.put("ANOMALY", new AgentRegistration(
            "ANOMALY", anomalyAgent, KafkaTopics.AGENT_ANOMALY));
        registry.put("THREAT_INTEL", new AgentRegistration(
            "THREAT_INTEL", threatIntelAgent, KafkaTopics.AGENT_THREATINTEL));
        registry.put("CLASSIFIER", new AgentRegistration(
            "CLASSIFIER", classifierAgent, KafkaTopics.AGENT_CLASSIFIER));
        registry.put("RESPONDER", new AgentRegistration(
            "RESPONDER", responderAgent, KafkaTopics.AGENT_RESPONDER));
    }

    /**
     * Get a registered agent by type.
     * The Orchestrator calls this to resolve dispatch targets.
     */
    public AgentRegistration getAgent(String agentType) {
        AgentRegistration reg = registry.get(agentType.toUpperCase());
        if (reg == null) {
            throw new IllegalArgumentException("Unknown agent type: " + agentType);
        }
        return reg;
    }

    /**
     * Get the Kafka topic for an agent type.
     */
    public String getAgentTopic(String agentType) {
        return getAgent(agentType).kafkaTopic();
    }

    /**
     * Get all registered agent types.
     */
    public Set<String> getRegisteredTypes() {
        return Collections.unmodifiableSet(registry.keySet());
    }
}

package com.sentinelmind.messaging;

/**
 * KafkaTopics — single source of truth for all Kafka topic names.
 * Every producer and consumer must use these constants — never hardcode strings.
 */
public final class KafkaTopics {

    public static final String RAW_EVENTS        = "raw-events";
    public static final String AGENT_ANOMALY     = "agent.anomaly";
    public static final String AGENT_THREATINTEL = "agent.threatintel";
    public static final String AGENT_CLASSIFIER  = "agent.classifier";
    public static final String AGENT_RESPONDER   = "agent.responder";
    public static final String FINDINGS          = "findings";
    public static final String RESPONSES         = "responses";

    private KafkaTopics() {}
}

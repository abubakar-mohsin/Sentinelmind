package com.sentinelmind.config;

import com.sentinelmind.messaging.KafkaTopics;
import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

/**
 * KafkaConfig — creates all Kafka topics on startup.
 * Topics are idempotent: if they already exist, Kafka silently skips creation.
 */
@Configuration
public class KafkaConfig {

    @Bean
    public NewTopic rawEventsTopic() {
        return TopicBuilder.name(KafkaTopics.RAW_EVENTS).partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic agentAnomalyTopic() {
        return TopicBuilder.name(KafkaTopics.AGENT_ANOMALY).partitions(1).replicas(1).build();
    }

    @Bean
    public NewTopic agentThreatIntelTopic() {
        return TopicBuilder.name(KafkaTopics.AGENT_THREATINTEL).partitions(1).replicas(1).build();
    }

    @Bean
    public NewTopic agentClassifierTopic() {
        return TopicBuilder.name(KafkaTopics.AGENT_CLASSIFIER).partitions(1).replicas(1).build();
    }

    @Bean
    public NewTopic agentResponderTopic() {
        return TopicBuilder.name(KafkaTopics.AGENT_RESPONDER).partitions(1).replicas(1).build();
    }

    @Bean
    public NewTopic findingsTopic() {
        return TopicBuilder.name(KafkaTopics.FINDINGS).partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic responsesTopic() {
        return TopicBuilder.name(KafkaTopics.RESPONSES).partitions(3).replicas(1).build();
    }
}

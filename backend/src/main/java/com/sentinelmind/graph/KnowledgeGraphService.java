package com.sentinelmind.graph;

import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;
import org.neo4j.driver.Session;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * KnowledgeGraphService — Singleton Pattern (Lab 2)
 * Spring @Service creates exactly ONE instance shared by all agents.
 * Every agent that needs the Neo4j knowledge graph goes through this object.
 * Real-world analogy: the principal of a school — one person, everyone goes to them.
 */
@Service
public class KnowledgeGraphService {

    private final Driver driver;

    public KnowledgeGraphService(Driver driver) {
        this.driver = driver;
    }

    /**
     * Run a read query and return all results as a list of property maps.
     */
    public List<Map<String, Object>> query(String cypher) {
        try (Session session = driver.session()) {
            return session.run(cypher).list(record -> record.asMap());
        }
    }

    /**
     * Run a read query and return all results as a list of property maps with parameters.
     */
    public List<Map<String, Object>> query(String cypher, Map<String, Object> params) {
        try (Session session = driver.session()) {
            return session.run(cypher, params).list(Record::asMap);
        }
    }

    /**
     * Return the first result row, or null if the query returns nothing.
     */
    public Map<String, Object> queryOne(String cypher) {
        List<Map<String, Object>> results = query(cypher);
        return results.isEmpty() ? null : results.get(0);
    }

    /**
     * Return the first result row with parameters, or null.
     */
    public Map<String, Object> queryOne(String cypher, Map<String, Object> params) {
        List<Map<String, Object>> results = query(cypher, params);
        return results.isEmpty() ? null : results.get(0);
    }

    /**
     * Create a node with the given label and properties.
     */
    public void saveNode(String label, Map<String, Object> props) {
        String cypher = "CREATE (n:" + label + " $props)";
        try (Session session = driver.session()) {
            session.run(cypher, Map.of("props", props));
        }
    }

    /**
     * Run a write query with no return value (e.g., CREATE relationship).
     */
    public void runCypher(String cypher) {
        try (Session session = driver.session()) {
            session.run(cypher);
        }
    }

    /**
     * Run a write query with parameters and no return value.
     */
    public void runCypher(String cypher, Map<String, Object> params) {
        try (Session session = driver.session()) {
            session.run(cypher, params);
        }
    }
}

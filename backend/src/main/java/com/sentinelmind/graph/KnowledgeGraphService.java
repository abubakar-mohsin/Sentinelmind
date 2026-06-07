package com.sentinelmind.graph;

import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;
import org.neo4j.driver.Session;
import org.neo4j.driver.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
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

    // ════════════════════════════════════════════════════════════════════════
    // Threat Graph enrichment — called by the Orchestrator during investigation
    // Uses MERGE instead of CREATE so they're idempotent (safe for replays).
    // ════════════════════════════════════════════════════════════════════════

    /** Create an Incident node in the graph. */
    public void createIncidentNode(String incidentId, String severity, double confidence, String status) {
        runCypher(
            "MERGE (i:Incident {id: $id}) " +
            "SET i.severity = $severity, i.confidence = $confidence, " +
            "    i.status = $status, i.timestamp = $ts",
            Map.of("id", incidentId, "severity", severity, "confidence", confidence,
                   "status", status, "ts", Instant.now().toString())
        );
    }

    /** Link an Incident to a User via TARGETS. */
    public void linkIncidentToUser(String incidentId, String userEmail) {
        runCypher(
            "MATCH (i:Incident {id: $incId}), (u:User {email: $email}) " +
            "MERGE (i)-[:TARGETS]->(u)",
            Map.of("incId", incidentId, "email", userEmail)
        );
    }

    /** Link an Incident to an IP via INVOLVES_IP. */
    public void linkIncidentToIp(String incidentId, String ipAddress) {
        runCypher(
            "MATCH (i:Incident {id: $incId}), (ip:IP {address: $addr}) " +
            "MERGE (i)-[:INVOLVES_IP]->(ip)",
            Map.of("incId", incidentId, "addr", ipAddress)
        );
    }

    /** Link an Incident to a MITRE technique via USES_TECHNIQUE. */
    public void linkIncidentToTechnique(String incidentId, String techniqueId) {
        runCypher(
            "MATCH (i:Incident {id: $incId}), (t:AttackTechnique {id: $techId}) " +
            "MERGE (i)-[:USES_TECHNIQUE]->(t)",
            Map.of("incId", incidentId, "techId", techniqueId)
        );
    }

    /** Mark an IP as blocked in the graph. */
    public void markIpBlocked(String ipAddress) {
        runCypher(
            "MATCH (ip:IP {address: $addr}) SET ip.blocked = true",
            Map.of("addr", ipAddress)
        );
    }

    /** Mark an Incident as CONTAINED. */
    public void markIncidentContained(String incidentId) {
        runCypher(
            "MATCH (i:Incident {id: $id}) SET i.status = 'CONTAINED'",
            Map.of("id", incidentId)
        );
    }

    // ════════════════════════════════════════════════════════════════════════
    // Graph visualization — returns node/edge data for the D3 frontend
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Return the full graph as a map of {nodes: [...], edges: [...]}.
     * Filters to only the node types relevant to the Threat Graph visualization.
     */
    public Map<String, Object> getFullGraph() {
        String cypher =
            "MATCH (n) " +
            "WHERE n:User OR n:IP OR n:Incident OR n:AttackTechnique OR n:Department " +
            "   OR n:Asset OR n:ThreatActor OR n:Service OR n:AttackTactic " +
            "OPTIONAL MATCH (n)-[r]->(m) " +
            "WHERE m:User OR m:IP OR m:Incident OR m:AttackTechnique OR m:Department " +
            "   OR m:Asset OR m:ThreatActor OR m:Service OR m:AttackTactic " +
            "RETURN n, r, m";

        Set<String> seenNodes = new HashSet<>();
        List<Map<String, Object>> nodes = new ArrayList<>();
        List<Map<String, Object>> edges = new ArrayList<>();

        try (Session session = driver.session()) {
            var result = session.run(cypher);
            while (result.hasNext()) {
                Record rec = result.next();
                addNodeFromValue(rec.get("n"), nodes, seenNodes);
                addNodeFromValue(rec.get("m"), nodes, seenNodes);
                addEdgeFromRecord(rec, edges);
            }
        }

        return Map.of("nodes", nodes, "edges", edges);
    }

    /**
     * Return the subgraph connected to a specific incident.
     */
    public Map<String, Object> getIncidentSubgraph(String incidentId) {
        // Traverse up to 3 hops from the incident
        String cypher =
            "MATCH path = (i:Incident {id: $id})-[*1..3]-(connected) " +
            "UNWIND nodes(path) AS n " +
            "UNWIND relationships(path) AS r " +
            "WITH DISTINCT n, r " +
            "RETURN n, r, endNode(r) AS m";

        Set<String> seenNodes = new HashSet<>();
        List<Map<String, Object>> nodes = new ArrayList<>();
        List<Map<String, Object>> edges = new ArrayList<>();

        try (Session session = driver.session()) {
            var result = session.run(cypher, Map.of("id", incidentId));
            while (result.hasNext()) {
                Record rec = result.next();
                addNodeFromValue(rec.get("n"), nodes, seenNodes);
                addNodeFromValue(rec.get("m"), nodes, seenNodes);
                addEdgeFromRecord(rec, edges);
            }
        }

        return Map.of("nodes", nodes, "edges", edges);
    }

    /**
     * Compute blast radius — all assets reachable from a user through access and system connections.
     */
    public List<Map<String, Object>> getBlastRadius(String userEmail) {
        String cypher =
            "MATCH (u:User {email: $email})-[:HAS_ACCESS_TO]->(a:Asset) " +
            "OPTIONAL MATCH (a)-[:CONNECTED_TO*1..3]->(downstream:Asset) " +
            "WITH COLLECT(DISTINCT a) + COLLECT(DISTINCT downstream) AS allAssets " +
            "UNWIND allAssets AS asset " +
            "WITH DISTINCT asset WHERE asset IS NOT NULL " +
            "RETURN asset.id AS id, asset.name AS name, asset.criticality AS criticality, " +
            "       asset.dataClassification AS dataClassification";

        try (Session session = driver.session()) {
            return session.run(cypher, Map.of("email", userEmail))
                    .list(Record::asMap);
        }
    }

    // ── Private helpers for graph building ──────────────────────────────

    private void addNodeFromValue(Value val, List<Map<String, Object>> nodes, Set<String> seen) {
        if (val == null || val.isNull()) return;

        var node = val.asNode();
        String nodeId = buildNodeId(node);
        if (nodeId == null || seen.contains(nodeId)) return;
        seen.add(nodeId);

        Map<String, Object> entry = new HashMap<>();
        entry.put("id", nodeId);
        entry.put("type", node.labels().iterator().next()); // Primary label
        entry.put("label", buildNodeLabel(node));

        // Copy all properties
        Map<String, Object> props = new HashMap<>(node.asMap());
        entry.put("props", props);

        nodes.add(entry);
    }

    private void addEdgeFromRecord(Record rec, List<Map<String, Object>> edges) {
        Value rVal = rec.get("r");
        Value nVal = rec.get("n");
        Value mVal = rec.get("m");

        if (rVal == null || rVal.isNull() || nVal == null || nVal.isNull()
                || mVal == null || mVal.isNull()) return;

        var rel = rVal.asRelationship();
        var startNode = nVal.asNode();
        var endNode = mVal.asNode();

        String sourceId = buildNodeId(startNode);
        String targetId = buildNodeId(endNode);
        if (sourceId == null || targetId == null) return;

        // Deduplicate by a composite key
        Map<String, Object> edge = new HashMap<>();
        edge.put("source", sourceId);
        edge.put("target", targetId);
        edge.put("type", rel.type());
        edge.put("props", new HashMap<>(rel.asMap()));

        edges.add(edge);
    }

    /** Generate a stable node ID from the node's properties. */
    private String buildNodeId(org.neo4j.driver.types.Node node) {
        Map<String, Object> props = node.asMap();
        // Try well-known ID fields first
        if (props.containsKey("id"))      return props.get("id").toString();
        if (props.containsKey("address")) return "ip-" + props.get("address");
        if (props.containsKey("email"))   return "user-" + props.get("email");
        if (props.containsKey("name"))    return node.labels().iterator().next().toLowerCase()
                                                 + "-" + props.get("name").toString().toLowerCase().replace(" ", "-");
        return null;
    }

    /** Generate a human-readable label for the node. */
    private String buildNodeLabel(org.neo4j.driver.types.Node node) {
        Map<String, Object> props = node.asMap();
        if (props.containsKey("name"))    return props.get("name").toString();
        if (props.containsKey("email"))   return props.get("email").toString();
        if (props.containsKey("address")) return props.get("address").toString();
        if (props.containsKey("id"))      return props.get("id").toString();
        return "Unknown";
    }
}


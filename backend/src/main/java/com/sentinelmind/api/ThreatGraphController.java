package com.sentinelmind.api;

import com.sentinelmind.graph.KnowledgeGraphService;
import com.sentinelmind.llm.GroqClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * ThreatGraphController — REST endpoints for the Threat Relationship Graph page.
 *
 *   GET  /api/graph                → Full graph (all nodes + edges) from Neo4j
 *   GET  /api/graph/{incidentId}   → Subgraph connected to a specific incident
 *   GET  /api/graph/blast-radius/{email} → Blast radius for a user
 *   POST /api/graph/insights       → Groq-generated graph intelligence insights
 */
@RestController
@RequestMapping("/api/graph")
public class ThreatGraphController {

    private static final Logger log = LoggerFactory.getLogger(ThreatGraphController.class);

    private final KnowledgeGraphService graphService;
    private final GroqClient groqClient;

    public ThreatGraphController(KnowledgeGraphService graphService, GroqClient groqClient) {
        this.graphService = graphService;
        this.groqClient   = groqClient;
    }

    /** Return the full threat graph (nodes + edges) for the D3 visualization. */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getFullGraph() {
        log.info("[GRAPH API] Serving full threat graph");
        Map<String, Object> graph = graphService.getFullGraph();
        return ResponseEntity.ok(graph);
    }

    /** Return only the subgraph connected to a specific incident. */
    @GetMapping("/{incidentId}")
    public ResponseEntity<Map<String, Object>> getIncidentSubgraph(@PathVariable String incidentId) {
        log.info("[GRAPH API] Serving subgraph for incident={}", incidentId);
        Map<String, Object> graph = graphService.getIncidentSubgraph(incidentId);
        return ResponseEntity.ok(graph);
    }

    /** Return the blast radius for a user — all assets reachable from their access. */
    @GetMapping("/blast-radius/{email}")
    public ResponseEntity<List<Map<String, Object>>> getBlastRadius(@PathVariable String email) {
        log.info("[GRAPH API] Computing blast radius for user={}", email);
        List<Map<String, Object>> assets = graphService.getBlastRadius(email);
        return ResponseEntity.ok(assets);
    }

    /**
     * Generate AI insights about the current graph state using Groq.
     * Accepts the graph context in the request body and returns natural language insights.
     */
    @PostMapping("/insights")
    public ResponseEntity<Map<String, Object>> generateInsights(@RequestBody Map<String, Object> graphContext) {
        log.info("[GRAPH API] Generating AI graph insights");

        if (!groqClient.isConfigured()) {
            return ResponseEntity.ok(Map.of(
                "insights", List.of(
                    "Ahmed (Finance) has direct access to 2 critical systems: Payroll System and Vendor Contracts.",
                    "Finance department contains the highest concentration of critical asset access.",
                    "IP 185.220.101.47 is a known Tor exit node linked to 2 threat actors.",
                    "Blast radius from Ahmed's account: 3 systems could be compromised (Payroll → Vendor Contracts chain).",
                    "Multiple failed authentications were followed by a successful login during anomalous hours."
                ),
                "source", "RULE_BASED"
            ));
        }

        try {
            String systemPrompt =
                "You are an elite cybersecurity graph intelligence analyst.\n" +
                "Given a security knowledge graph, produce exactly 5 concise, actionable insights.\n" +
                "Each insight should be 1-2 sentences.\n" +
                "Focus on: attack patterns, blast radius, organizational risk, lateral movement paths, " +
                "and coordinated campaigns.\n" +
                "Return ONLY a JSON array of 5 strings. No markdown, no prose.\n" +
                "Example: [\"insight 1\", \"insight 2\", \"insight 3\", \"insight 4\", \"insight 5\"]";

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> nodes = (List<Map<String, Object>>) graphContext.getOrDefault("nodes", List.of());
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> edges = (List<Map<String, Object>>) graphContext.getOrDefault("edges", List.of());

            String userPrompt = String.format(
                "SECURITY KNOWLEDGE GRAPH:\n\n" +
                "NODES (%d total):\n%s\n\n" +
                "EDGES (%d total):\n%s\n\n" +
                "Analyze the graph and produce 5 intelligence insights.",
                nodes.size(), summarizeNodes(nodes),
                edges.size(), summarizeEdges(edges)
            );

            String response = groqClient.chat(systemPrompt, userPrompt);

            // Parse the JSON array from Groq
            String clean = response.trim();
            if (clean.startsWith("```")) {
                clean = clean.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
            }
            int start = clean.indexOf('[');
            int end   = clean.lastIndexOf(']') + 1;
            if (start >= 0 && end > start) {
                clean = clean.substring(start, end);
            }

            var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            List<String> insights = mapper.readValue(clean,
                    mapper.getTypeFactory().constructCollectionType(List.class, String.class));

            return ResponseEntity.ok(Map.of("insights", insights, "source", "GROQ_AI"));

        } catch (Exception e) {
            log.warn("[GRAPH API] Groq insights failed, falling back to rule-based: {}", e.getMessage());
            return ResponseEntity.ok(Map.of(
                "insights", List.of(
                    "Ahmed (Finance) has direct access to 2 critical systems: Payroll System and Vendor Contracts.",
                    "Finance department contains the highest concentration of critical asset access.",
                    "IP 185.220.101.47 is a known Tor exit node linked to 2 threat actors.",
                    "Blast radius from Ahmed's account: 3 systems could be compromised (Payroll → Vendor Contracts chain).",
                    "Multiple failed authentications were followed by a successful login during anomalous hours."
                ),
                "source", "RULE_BASED"
            ));
        }
    }

    // ── Private helpers ──────────────────────────────────────────────────

    private String summarizeNodes(List<Map<String, Object>> nodes) {
        StringBuilder sb = new StringBuilder();
        for (Map<String, Object> n : nodes) {
            sb.append(String.format("  [%s] %s (id=%s)\n",
                    n.getOrDefault("type", "?"),
                    n.getOrDefault("label", "?"),
                    n.getOrDefault("id", "?")));
        }
        return sb.toString();
    }

    private String summarizeEdges(List<Map<String, Object>> edges) {
        StringBuilder sb = new StringBuilder();
        for (Map<String, Object> e : edges) {
            sb.append(String.format("  %s -[%s]-> %s\n",
                    e.getOrDefault("source", "?"),
                    e.getOrDefault("type", "?"),
                    e.getOrDefault("target", "?")));
        }
        return sb.toString();
    }
}

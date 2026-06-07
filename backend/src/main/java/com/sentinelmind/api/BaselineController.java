package com.sentinelmind.api;

import com.sentinelmind.graph.KnowledgeGraphService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/baseline")
public class BaselineController {

    private final KnowledgeGraphService graphService;

    public BaselineController(KnowledgeGraphService graphService) {
        this.graphService = graphService;
    }

    @GetMapping("/{email}")
    public ResponseEntity<Map<String, Object>> getBaseline(@PathVariable String email) {
        Map<String, Object> row = graphService.queryOne(
            "MATCH (u:User {email: $email}) " +
            "RETURN coalesce(u.sessionCount, 245) AS sessionCount, " +
            "coalesce(u.typicalCountry, 'PK') AS typicalCountry, " +
            "coalesce(u.avgLoginHour, 10.5) AS avgLoginHour, " +
            "coalesce(u.avgLatencyMs, 1850.0) AS avgLatencyMs",
            Map.of("email", email)
        );
        
        if (row == null) {
            row = Map.of(
                "sessionCount", 245,
                "typicalCountry", "PK",
                "avgLoginHour", 10.5,
                "avgLatencyMs", 1850.0
            );
        }
        
        return ResponseEntity.ok(row);
    }
}

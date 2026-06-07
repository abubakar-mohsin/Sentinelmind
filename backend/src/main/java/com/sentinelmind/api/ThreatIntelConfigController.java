package com.sentinelmind.api;

import com.sentinelmind.config.ThreatIntelConfigService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * ThreatIntelConfigController — exposes the runtime threat-intel mode switch.
 *
 * GET  /api/config/threat-intel-mode  → { "mode": "mock" | "real" }
 * POST /api/config/threat-intel-mode  body: { "mode": "mock" | "real" }
 *
 * Called by the dashboard header toggle. No restart needed — the switch takes
 * effect on the very next Kafka event processed by ThreatIntelAgent.
 */
@RestController
@RequestMapping("/api/config")
public class ThreatIntelConfigController {

    private final ThreatIntelConfigService configService;

    public ThreatIntelConfigController(ThreatIntelConfigService configService) {
        this.configService = configService;
    }

    @GetMapping("/threat-intel-mode")
    public ResponseEntity<Map<String, String>> getMode() {
        return ResponseEntity.ok(Map.of("mode", configService.getCurrentMode()));
    }

    @PostMapping("/threat-intel-mode")
    public ResponseEntity<Map<String, String>> setMode(@RequestBody Map<String, String> body) {
        String mode = body.get("mode");
        if (mode == null || (!mode.equalsIgnoreCase("mock") && !mode.equalsIgnoreCase("real"))) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "mode must be 'mock' or 'real'", "received", String.valueOf(mode)));
        }
        configService.setMode(mode);
        return ResponseEntity.ok(Map.of("mode", configService.getCurrentMode()));
    }
}

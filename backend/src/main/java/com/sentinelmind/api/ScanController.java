package com.sentinelmind.api;

import com.sentinelmind.agents.forensics.ForensicsAgent;
import com.sentinelmind.agents.supply.DependencyScanner;
import com.sentinelmind.agents.supply.SbomAnalyzer;
import com.sentinelmind.agents.vuln.VulnerabilityScannerAgent;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * ScanController — REST endpoints for the P1/P2 breadth agents.
 *
 * These agents cover the "code + dependencies + supply chain" story that
 * complements the main runtime-detection pipeline. They are accessed directly
 * via REST (not Kafka) because they are request/response in nature — a user asks
 * a question, the agent answers synchronously.
 *
 * Endpoints:
 *   POST /api/scan/vulnerability  — CVE lookup via VulnerabilityScannerAgent
 *   GET  /api/forensics/{id}      — Post-incident graph traversal via ForensicsAgent
 *   POST /api/scan/dependency     — Typosquatting check via DependencyScanner
 *   POST /api/scan/sbom           — CycloneDX SBOM generation via SbomAnalyzer
 */
@RestController
@RequestMapping("/api")
public class ScanController {

    private final VulnerabilityScannerAgent vulnScanner;
    private final ForensicsAgent            forensicsAgent;
    private final DependencyScanner         dependencyScanner;
    private final SbomAnalyzer              sbomAnalyzer;

    public ScanController(VulnerabilityScannerAgent vulnScanner,
                          ForensicsAgent forensicsAgent,
                          DependencyScanner dependencyScanner,
                          SbomAnalyzer sbomAnalyzer) {
        this.vulnScanner       = vulnScanner;
        this.forensicsAgent    = forensicsAgent;
        this.dependencyScanner = dependencyScanner;
        this.sbomAnalyzer      = sbomAnalyzer;
    }

    // ─────────────────────────────────────────────────────────────────
    // Vulnerability Scanner
    // POST /api/scan/vulnerability
    // Body: {"packageName": "log4j-core", "version": "2.14.1"}
    // ─────────────────────────────────────────────────────────────────

    public record VulnScanRequest(String packageName, String version) {}

    @PostMapping("/scan/vulnerability")
    public ResponseEntity<Map<String, Object>> scanVulnerability(
            @RequestBody VulnScanRequest req) {

        List<Map<String, Object>> cves = vulnScanner.scanPackage(req.packageName(), req.version());

        return ResponseEntity.ok(Map.of(
            "packageName", req.packageName(),
            "version",     req.version(),
            "cveCount",    cves.size(),
            "cves",        cves,
            "agentName",   vulnScanner.getAgentName()
        ));
    }

    // ─────────────────────────────────────────────────────────────────
    // Forensics Agent
    // GET /api/forensics/{incidentId}
    // ─────────────────────────────────────────────────────────────────

    @GetMapping("/forensics/{incidentId}")
    public ResponseEntity<Map<String, Object>> getForensicsReport(
            @PathVariable String incidentId) {

        Map<String, Object> report = forensicsAgent.generateReport(incidentId);
        return ResponseEntity.ok(report);
    }

    // ─────────────────────────────────────────────────────────────────
    // Dependency Scanner (typosquatting)
    // POST /api/scan/dependency
    // Body: {"packages": ["requessts", "numpy", "log4j-core"]}
    // ─────────────────────────────────────────────────────────────────

    public record DependencyScanRequest(List<String> packages) {}

    @PostMapping("/scan/dependency")
    public ResponseEntity<Map<String, Object>> scanDependencies(
            @RequestBody DependencyScanRequest req) {

        List<Map<String, Object>> suspects = dependencyScanner.scan(req.packages());

        return ResponseEntity.ok(Map.of(
            "scannedCount",  req.packages().size(),
            "suspectCount",  suspects.size(),
            "suspects",      suspects,
            "agentName",     dependencyScanner.getAgentName()
        ));
    }

    // ─────────────────────────────────────────────────────────────────
    // SBOM Analyzer (CycloneDX 1.4)
    // POST /api/scan/sbom
    // Body: {"serviceName": "AuthService",
    //        "packages": [{"name": "spring-boot", "version": "3.2.5"}]}
    // ─────────────────────────────────────────────────────────────────

    public record SbomRequest(String serviceName, List<Map<String, String>> packages) {}

    @PostMapping("/scan/sbom")
    public ResponseEntity<Map<String, Object>> generateSbom(
            @RequestBody SbomRequest req) {

        Map<String, Object> sbom = sbomAnalyzer.generateSbom(req.serviceName(), req.packages());
        return ResponseEntity.ok(sbom);
    }
}

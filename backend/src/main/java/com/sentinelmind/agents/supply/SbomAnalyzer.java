package com.sentinelmind.agents.supply;

import com.sentinelmind.agents.ISecurityAgent;
import com.sentinelmind.model.Finding;
import com.sentinelmind.model.SecurityEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;

/**
 * SbomAnalyzer — P2 agent, CycloneDX 1.4 Software Bill of Materials generator.
 *
 * A Software Bill of Materials (SBOM) is a formal, machine-readable inventory of
 * every component (library, framework, package) that a software service uses.
 * It is increasingly required by government and enterprise security policies
 * (e.g. the US Executive Order on cybersecurity, 2021) because knowing what you
 * run is the first step in knowing what vulnerabilities you carry.
 *
 * This agent generates an SBOM in the CycloneDX 1.4 JSON format — the most widely
 * used SBOM standard, supported by tools like Dependency-Track, Grype, and Trivy.
 *
 * Package URLs (purls) follow the PURL specification (pkg:type/namespace/name@version).
 * Maven packages use pkg:maven, npm uses pkg:npm, PyPI uses pkg:pypi.
 *
 * Not integrated into the Kafka pipeline — accessed via POST /api/scan/sbom.
 */
@Component
public class SbomAnalyzer implements ISecurityAgent {

    private static final Logger log = LoggerFactory.getLogger(SbomAnalyzer.class);

    @Override
    public String getAgentName() {
        return "SbomAnalyzer";
    }

    @Override
    public Finding process(SecurityEvent event) {
        return Finding.builder()
                .agentName(getAgentName())
                .summary("Use POST /api/scan/sbom with serviceName + packages list")
                .build();
    }

    /**
     * Generate a CycloneDX 1.4 SBOM for a service.
     *
     * @param serviceName  the name of the service (e.g. "AuthService")
     * @param packages     list of maps with keys "name" and "version"
     * @return CycloneDX 1.4 document as a Map (serialized to JSON by the REST layer)
     */
    public Map<String, Object> generateSbom(String serviceName, List<Map<String, String>> packages) {
        log.info("[SBOM] Generating SBOM for service={} with {} packages",
                serviceName, packages.size());

        // Build the CycloneDX 1.4 envelope
        Map<String, Object> sbom = new LinkedHashMap<>();
        sbom.put("bomFormat",     "CycloneDX");
        sbom.put("specVersion",   "1.4");
        sbom.put("serialNumber",  "urn:uuid:" + UUID.randomUUID());
        sbom.put("version",       1);

        // Metadata block — who generated this, for what service, when
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("timestamp", Instant.now().toString());
        metadata.put("tools", List.of(Map.of(
            "vendor",  "SentinelMind",
            "name",    "SbomAnalyzer",
            "version", "1.0.0"
        )));
        Map<String, Object> rootComponent = new LinkedHashMap<>();
        rootComponent.put("type",    "application");
        rootComponent.put("name",    serviceName);
        rootComponent.put("version", "1.0.0");
        metadata.put("component", rootComponent);
        sbom.put("metadata", metadata);

        // Components block — one entry per dependency
        List<Map<String, Object>> components = new ArrayList<>();
        for (Map<String, String> pkg : packages) {
            String name    = pkg.getOrDefault("name",    "unknown");
            String version = pkg.getOrDefault("version", "unknown");

            Map<String, Object> component = new LinkedHashMap<>();
            component.put("type",    "library");
            component.put("name",    name);
            component.put("version", version);
            component.put("purl",    buildPurl(name, version));
            components.add(component);
        }
        sbom.put("components", components);

        log.info("[SBOM] Generated SBOM with {} components for {}", components.size(), serviceName);
        return sbom;
    }

    /**
     * Build a Package URL (PURL) for a dependency.
     * Heuristic: Maven packages contain "-", npm are lowercase short, PyPI are the rest.
     * In a production scanner this would be determined by the manifest file type.
     */
    private static String buildPurl(String name, String version) {
        // Simple heuristic to guess ecosystem
        if (name.contains("spring") || name.contains("log4j") || name.contains("jackson")
                || name.contains("hibernate") || name.contains("guava")) {
            // Maven — use org.* namespace for well-known packages
            String group = mavenGroup(name);
            return "pkg:maven/" + group + "/" + name + "@" + version;
        }
        if (name.equals("react") || name.equals("express") || name.equals("lodash")
                || name.equals("axios") || name.equals("webpack") || name.equals("typescript")) {
            return "pkg:npm/" + name + "@" + version;
        }
        // Default to PyPI
        return "pkg:pypi/" + name + "@" + version;
    }

    private static String mavenGroup(String name) {
        if (name.startsWith("spring")) return "org.springframework.boot";
        if (name.startsWith("log4j"))  return "org.apache.logging.log4j";
        if (name.startsWith("jackson")) return "com.fasterxml.jackson.core";
        if (name.startsWith("hibernate")) return "org.hibernate";
        return "com.unknown";
    }
}

package com.sentinelmind.agents.supply;

import com.sentinelmind.agents.ISecurityAgent;
import com.sentinelmind.model.Finding;
import com.sentinelmind.model.SecurityEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * DependencyScanner — P1 agent, typosquatting detection via Levenshtein distance.
 *
 * Typosquatting is a supply-chain attack where an attacker publishes a malicious
 * package with a name very close to a popular one (e.g. "requessts" vs "requests").
 * Developers mistype the name and unknowingly install the malicious version.
 *
 * This agent computes the Levenshtein (edit) distance between each submitted package
 * name and a curated list of popular packages. A distance of 1 or 2 is flagged as
 * a potential typosquat.
 *
 * Algorithm: standard O(m×n) dynamic-programming Levenshtein distance.
 * Distance 1 = one insertion/deletion/substitution away from the real name.
 * Distance 2 = two edits away — still highly suspicious for short names.
 *
 * Not integrated into the Kafka pipeline — accessed via POST /api/scan/dependency.
 */
@Component
public class DependencyScanner implements ISecurityAgent {

    private static final Logger log = LoggerFactory.getLogger(DependencyScanner.class);

    private static final Set<String> POPULAR_PACKAGES = Set.of(
        // Spring ecosystem
        "spring-boot", "spring-core", "spring-web", "spring-security",
        "spring-data-jpa", "spring-kafka", "spring-webmvc", "spring-context",
        // Apache
        "log4j-core", "log4j-api", "commons-lang3", "commons-io",
        "commons-collections", "commons-codec", "commons-logging",
        "kafka-clients", "kafka-streams", "httpcomponents-client",
        "struts2-core", "tomcat-embed-core",
        // Google
        "guava", "gson", "protobuf-java", "grpc-core",
        // Jackson
        "jackson-databind", "jackson-core", "jackson-annotations",
        // Database
        "postgresql", "mysql-connector-j", "h2", "flyway-core",
        "hibernate-core", "mybatis",
        // Networking
        "netty-all", "netty-codec-http", "okhttp", "retrofit",
        // Security
        "bouncycastle", "bcprov-jdk15on", "nimbus-jose-jwt",
        "spring-security-crypto", "jasypt",
        // Testing
        "junit-jupiter", "mockito-core", "assertj-core", "testcontainers",
        // Build/util
        "lombok", "mapstruct", "slf4j-api", "logback-classic",
        "micrometer-core", "resilience4j-core",
        // npm packages
        "lodash", "express", "react", "axios", "moment",
        "webpack", "babel-core", "eslint", "typescript",
        "socket.io", "mongoose", "sequelize", "dotenv"
    );

    @Override
    public String getAgentName() {
        return "DependencyScanner";
    }

    @Override
    public Finding process(SecurityEvent event) {
        return Finding.builder()
                .agentName(getAgentName())
                .summary("Use POST /api/scan/dependency with a list of package names")
                .build();
    }

    /**
     * Scan a single package name for typosquatting suspects.
     * Used by the GET /api/scan/dependency endpoint.
     */
    public List<Map<String, Object>> scanDependency(String packageName) {
        List<Map<String, Object>> findings = new ArrayList<>();
        String normalized = packageName.toLowerCase().trim();

        for (String popular : POPULAR_PACKAGES) {
            int distance = levenshteinDistance(normalized, popular);

            if (distance == 0) {
                return List.of(Map.of(
                    "packageName", packageName,
                    "status", "TRUSTED",
                    "message", "Package matches known trusted library: " + popular,
                    "riskScore", 0.0
                ));
            }

            if (distance <= 2) {
                double riskScore = distance == 1 ? 0.95 : 0.65;

                if (normalized.matches(".*[0-9].*") && popular.matches(".*[a-z].*")) {
                    riskScore = Math.min(riskScore + 0.15, 1.0);
                }

                Map<String, Object> finding = new LinkedHashMap<>();
                finding.put("packageName", packageName);
                finding.put("similarTo", popular);
                finding.put("editDistance", distance);
                finding.put("riskScore", riskScore);
                finding.put("riskLevel", distance == 1 ? "CRITICAL" : "HIGH");
                finding.put("description", String.format(
                    "Package '%s' is suspiciously similar to popular package '%s' " +
                    "(edit distance: %d). Possible typosquatting attack.",
                    packageName, popular, distance));
                finding.put("recommendation",
                    "Verify this package on Maven Central or npm registry before use. " +
                    "Check publisher, download count, and source repository.");
                findings.add(finding);
            }
        }

        if (findings.isEmpty()) {
            return List.of(Map.of(
                "packageName", packageName,
                "status", "UNKNOWN",
                "message", "Package not found in trusted package list — manual review recommended",
                "riskScore", 0.3
            ));
        }

        findings.sort((a, b) -> Double.compare(
            (Double) b.get("riskScore"), (Double) a.get("riskScore")));
        return findings;
    }

    /**
     * Scan a list of package names for typosquatting suspects.
     * Returns only the packages that appear suspicious (Levenshtein distance 1–2
     * from a known popular package).
     */
    public List<Map<String, Object>> scan(List<String> packageNames) {
        log.info("[DEPS] Scanning {} package names for typosquatting", packageNames.size());

        List<Map<String, Object>> findings = new ArrayList<>();

        for (String submitted : packageNames) {
            String normalized = submitted.trim().toLowerCase();

            // Skip if it exactly matches a known good package
            if (POPULAR_PACKAGES.stream().anyMatch(p -> p.equalsIgnoreCase(normalized))) {
                continue;
            }

            // Find the closest popular package by edit distance
            String closestPackage  = null;
            int    closestDistance = Integer.MAX_VALUE;

            for (String popular : POPULAR_PACKAGES) {
                int dist = levenshteinDistance(normalized, popular.toLowerCase());
                if (dist < closestDistance) {
                    closestDistance = dist;
                    closestPackage  = popular;
                }
            }

            // Flag if within 1–2 edits of a known popular package
            if (closestDistance <= 2 && closestPackage != null) {
                Map<String, Object> alert = new LinkedHashMap<>();
                alert.put("submittedPackage",    submitted);
                alert.put("closestKnownPackage", closestPackage);
                alert.put("editDistance",        closestDistance);
                alert.put("risk",                closestDistance == 1 ? "HIGH" : "MEDIUM");
                alert.put("message",             "'" + submitted + "' is " + closestDistance
                        + " edit(s) away from popular package '" + closestPackage
                        + "' — possible typosquatting attack");
                findings.add(alert);
                log.warn("[DEPS] Suspicious: '{}' is distance {} from '{}'",
                        submitted, closestDistance, closestPackage);
            }
        }

        log.info("[DEPS] Found {} typosquatting suspects out of {} packages",
                findings.size(), packageNames.size());
        return findings;
    }

    /**
     * Compute the Levenshtein (edit) distance between two strings.
     * Uses the standard O(m×n) dynamic-programming algorithm.
     * Distance = minimum number of single-character insertions, deletions, or substitutions
     * needed to transform string a into string b.
     */
    private static int levenshteinDistance(String a, String b) {
        int m = a.length();
        int n = b.length();

        int[][] dp = new int[m + 1][n + 1];

        // Base cases: transforming empty string to/from any string
        for (int i = 0; i <= m; i++) dp[i][0] = i;
        for (int j = 0; j <= n; j++) dp[0][j] = j;

        // Fill the rest of the table
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (a.charAt(i - 1) == b.charAt(j - 1)) {
                    // Characters match — no extra cost
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    // Min of: substitution, deletion, insertion
                    dp[i][j] = 1 + Math.min(dp[i - 1][j - 1],
                                   Math.min(dp[i - 1][j],
                                            dp[i][j - 1]));
                }
            }
        }
        return dp[m][n];
    }
}

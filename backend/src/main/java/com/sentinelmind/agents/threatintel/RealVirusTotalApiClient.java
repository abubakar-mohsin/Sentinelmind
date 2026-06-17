package com.sentinelmind.agents.threatintel;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class RealVirusTotalApiClient implements VirusTotalApiClient {

    private final String apiKey;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public RealVirusTotalApiClient(@Value("${VIRUSTOTAL_API_KEY:not-set}") String apiKey) {
        this.apiKey = apiKey;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public VirusTotalResponse getIpReport(String ipAddress) {
        VirusTotalResponse result = new VirusTotalResponse();
        
        if (apiKey == null || apiKey.isEmpty() || "not-set".equals(apiKey)) {
            System.err.println("[VirusTotal] No API key configured. Returning 0 votes.");
            result.setMaliciousVotes(0);
            return result;
        }

        try {
            String url = "https://www.virustotal.com/api/v3/ip_addresses/" + ipAddress;
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("x-apikey", apiKey);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(url, java.util.Objects.requireNonNull(HttpMethod.GET), entity, String.class);
            
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode stats = root.path("data").path("attributes").path("last_analysis_stats");
            
            if (!stats.isMissingNode()) {
                int malicious = stats.path("malicious").asInt(0);
                result.setMaliciousVotes(malicious);
                System.out.println("[VirusTotal] Fetched report for IP " + ipAddress + " -> " + malicious + " malicious votes.");
            } else {
                result.setMaliciousVotes(0);
            }
            
        } catch (Exception e) {
            System.err.println("[VirusTotal] Error querying IP " + ipAddress + ": " + e.getMessage());
            result.setMaliciousVotes(0);
        }

        return result;
    }
}

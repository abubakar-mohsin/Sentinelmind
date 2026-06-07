package com.sentinelmind.agents.threatintel;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

/**
 * VirusTotalApiClientImpl — concrete implementation of VirusTotalApiClient.
 *
 * Makes a real HTTP GET to the VirusTotal v3 IP reputation endpoint:
 *   GET https://www.virustotal.com/api/v3/ip_addresses/{ip}
 *   Header: x-apikey: <key>
 *
 * Response path read: data.attributes.last_analysis_stats.malicious
 *
 * Safe fallback: if the API key is "not-set" or the call fails, returns
 * maliciousVotes=0 with a log warning so the pipeline never crashes.
 */
@Component
public class VirusTotalApiClientImpl implements VirusTotalApiClient {

    private static final Logger log = LoggerFactory.getLogger(VirusTotalApiClientImpl.class);
    private static final String VT_URL = "https://www.virustotal.com/api/v3/ip_addresses/";

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper  = new ObjectMapper();

    @Value("${virustotal.api-key:not-set}")
    private String apiKey;

    @Override
    public VirusTotalResponse getIpReport(String ipAddress) {
        VirusTotalResponse empty = new VirusTotalResponse();
        empty.setMaliciousVotes(0);

        if ("not-set".equals(apiKey) || apiKey == null || apiKey.isBlank()) {
            log.warn("[VIRUSTOTAL] API key not configured (VIRUSTOTAL_API_KEY=not-set) — returning 0 malicious votes");
            return empty;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("x-apikey", apiKey);
            headers.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            log.info("[VIRUSTOTAL] Querying reputation for ip={}", ipAddress);
            ResponseEntity<String> response = restTemplate.exchange(
                VT_URL + ipAddress,
                HttpMethod.GET,
                entity,
                String.class
            );

            // Parse: data.attributes.last_analysis_stats.malicious
            JsonNode root  = objectMapper.readTree(response.getBody());
            int malicious  = root.path("data")
                                 .path("attributes")
                                 .path("last_analysis_stats")
                                 .path("malicious")
                                 .asInt(0);

            log.info("[VIRUSTOTAL] ip={} maliciousVotes={}", ipAddress, malicious);
            VirusTotalResponse result = new VirusTotalResponse();
            result.setMaliciousVotes(malicious);
            return result;

        } catch (Exception e) {
            log.error("[VIRUSTOTAL] API call failed for ip={}: {} — returning 0 votes", ipAddress, e.getMessage());
            return empty;
        }
    }
}

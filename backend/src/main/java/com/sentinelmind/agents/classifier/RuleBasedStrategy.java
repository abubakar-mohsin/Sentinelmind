package com.sentinelmind.agents.classifier;

import com.sentinelmind.model.Finding;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * RuleBasedStrategy — Strategy Pattern (Bonus), default classification strategy
 *
 * Maps known attack patterns to MITRE ATT&CK technique IDs using deterministic rules.
 * This is the DEFAULT strategy — it is always active, requires no API keys, and works
 * completely offline. Perfect for the demo.
 *
 * Rule for the demo scenario:
 *   Tor IP + off-hours login (10pm–6am) + robotic speed (<500ms)
 *   → T1078 (Valid Accounts) + T1110.004 (Credential Stuffing)
 *   → confidence = 1.0 (rule is definitive)
 */
@Component
public class RuleBasedStrategy implements ClassificationStrategy {

    @Override
    public ClassificationResult classify(Finding finding) {

        // Demo rule: Tor exit node + off-hours + sub-human login speed = credential stuffing
        if (finding.isTorNode()
                && (finding.getHour() >= 22 || finding.getHour() <= 6)
                && finding.getLoginLatencyMs() < 500) {

            return ClassificationResult.builder()
                    .techniqueIds(List.of("T1078", "T1110.004"))
                    .techniqueNames(List.of("Valid Accounts", "Credential Stuffing"))
                    .confidence(1.0)
                    .reason("Rule match: Tor exit node + off-hours login + robotic speed (<500ms)")
                    .unknown(false)
                    .build();
        }

        // Partial match: suspicious IP even without all conditions
        if (finding.isTorNode()) {
            return ClassificationResult.builder()
                    .techniqueIds(List.of("T1078"))
                    .techniqueNames(List.of("Valid Accounts"))
                    .confidence(0.7)
                    .reason("Partial rule match: Tor exit node detected")
                    .unknown(false)
                    .build();
        }

        return ClassificationResult.unknown();
    }
}

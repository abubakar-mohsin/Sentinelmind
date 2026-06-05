package com.sentinelmind.agents.classifier;

import com.sentinelmind.model.Finding;

/**
 * ClassificationStrategy — Strategy Pattern interface (Bonus)
 *
 * Defines the contract for MITRE ATT&CK technique classification.
 * Two concrete strategies exist:
 *   - RuleBasedStrategy (default, always active): fast, offline, deterministic
 *   - LlmStrategy (@Profile("real")): flexible, handles novel unknown patterns
 *
 * The ThreatClassifierAgent only calls this interface — it never knows which
 * implementation is behind it. Switching strategies requires only a Spring profile
 * change, not a code change.
 */
public interface ClassificationStrategy {

    /**
     * Map the security finding to one or more MITRE ATT&CK techniques.
     * Returns ClassificationResult.unknown() when no rule matches.
     */
    ClassificationResult classify(Finding finding);
}

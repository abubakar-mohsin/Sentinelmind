package com.sentinelmind.audit;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Incident — JPA entity persisted to PostgreSQL after the Orchestrator confirms a threat.
 * Stores the complete evidence chain: MITRE mappings, confidence, and final status.
 */
@Entity
@Table(name = "incidents")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Incident {

    @Id
    // ID is set explicitly by OrchestratorAgent so AuditEntry.incidentId FK matches exactly.
    // No @GeneratedValue — the Orchestrator passes its own UUID as the PK.
    private UUID id;

    @Column(columnDefinition = "text")
    private String eventJson;

    private String severity;

    private BigDecimal confidence;

    // Comma-separated MITRE technique IDs (e.g., "T1078,T1110.004")
    private String mitreIds;

    // Comma-separated MITRE technique names
    private String mitreNames;

    private String reason;

    @Builder.Default
    private String status = "OPEN";

    @CreationTimestamp
    private LocalDateTime detectedAt;

    private LocalDateTime containedAt;
}

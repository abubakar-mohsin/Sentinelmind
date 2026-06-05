package com.sentinelmind.audit;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * AuditEntry — records every containment action taken by the IncidentResponderAgent.
 * One row per Command execution (BlockIpCommand, RevokeSessionCommand, RaiseAlertCommand).
 * The rollbackToken allows actions to be undone if the incident was a false positive.
 */
@Entity
@Table(name = "audit_actions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private UUID incidentId;

    private String actionType;

    private String actionDescription;

    private String rollbackToken;

    @CreationTimestamp
    private LocalDateTime executedAt;

    @Builder.Default
    private String executedBy = "IncidentResponderAgent";
}

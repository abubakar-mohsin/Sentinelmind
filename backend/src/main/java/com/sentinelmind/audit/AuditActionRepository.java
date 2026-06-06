package com.sentinelmind.audit;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * AuditActionRepository — Spring Data JPA repository for audit_actions rows.
 * findByIncidentId is a derived query: Spring generates the SQL automatically
 * from the method name (SELECT * FROM audit_actions WHERE incident_id = ?).
 * Used by ForensicsAgent to build the response timeline in its incident report.
 */
@Repository
public interface AuditActionRepository extends JpaRepository<AuditEntry, UUID> {

    /** Return all audit entries for a given incident, ordered by execution time ascending. */
    List<AuditEntry> findByIncidentIdOrderByExecutedAtAsc(UUID incidentId);

    /** Simple version — ForensicsAgent uses this. */
    List<AuditEntry> findByIncidentId(UUID incidentId);
}

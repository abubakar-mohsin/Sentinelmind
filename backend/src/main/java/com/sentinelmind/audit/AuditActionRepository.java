package com.sentinelmind.audit;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AuditActionRepository extends JpaRepository<AuditEntry, UUID> {

    /** All actions taken for a given incident, ordered by execution time. */
    List<AuditEntry> findByIncidentIdOrderByExecutedAtAsc(UUID incidentId);

    /** Alias used by ForensicsAgent. */
    default List<AuditEntry> findByIncidentId(UUID incidentId) {
        return findByIncidentIdOrderByExecutedAtAsc(incidentId);
    }
}

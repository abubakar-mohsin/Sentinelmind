package com.sentinelmind.audit;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AuditActionRepository extends JpaRepository<AuditEntry, UUID> {
}

package com.sentinelmind.agents.responder;

import com.sentinelmind.agents.ISecurityAgent;
import com.sentinelmind.audit.AuditActionRepository;
import com.sentinelmind.audit.AuditEntry;
import com.sentinelmind.messaging.EventProducer;
import com.sentinelmind.messaging.KafkaTopics;
import com.sentinelmind.model.Finding;
import com.sentinelmind.model.SecurityEvent;
import com.sentinelmind.model.WebSocketMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * IncidentResponderAgent — THE INVOKER in the Command pattern (Lab 7)
 *
 * This is our "Broker" from Lab 7. It builds a command queue (playbook),
 * executes all commands in order, and writes every action to PostgreSQL with
 * a rollback token. Each action is a concrete Command object — BlockIpCommand,
 * RevokeSessionCommand, ForcePasswordResetCommand.
 *
 * Only activated by the Orchestrator when combined confidence >= 0.92.
 * In the demo scenario this fires every time — confidence ≈ 0.967.
 */
@Component
public class IncidentResponderAgent implements ISecurityAgent {

    private static final Logger log = LoggerFactory.getLogger(IncidentResponderAgent.class);

    private final AuditActionRepository auditRepo;
    private final EventProducer         eventProducer;

    public IncidentResponderAgent(AuditActionRepository auditRepo,
                                  EventProducer eventProducer) {
        this.auditRepo    = auditRepo;
        this.eventProducer = eventProducer;
    }

    @Override
    public String getAgentName() {
        return "IncidentResponderAgent";
    }

    @KafkaListener(topics = KafkaTopics.AGENT_RESPONDER, groupId = "responder-group")
    public void onEvent(SecurityEvent event) {
        log.info("[RESPONDER] Executing playbook for actor={} ip={}", event.getActor(), event.getSourceIp());
        process(event);
    }

    @Override
    public Finding process(SecurityEvent event) {
        // Use the incidentId stamped by OrchestratorAgent so AuditEntry rows share the
        // same UUID as the Incident row in PostgreSQL. Fall back to a new UUID only if
        // this agent is called directly (e.g. unit tests).
        String incidentId = event.getIncidentId() != null
                          ? event.getIncidentId()
                          : UUID.randomUUID().toString();
        long startMs = System.currentTimeMillis();

        // Build the response playbook — one Command object per action
        List<ResponseCommand> playbook = new ArrayList<>();
        playbook.add(new BlockIpCommand(event.getSourceIp()));
        playbook.add(new RevokeSessionCommand(event.getActor(), UUID.randomUUID().toString()));
        playbook.add(new ForcePasswordResetCommand(event.getActor()));

        // Execute each command, persist to audit log, broadcast to dashboard
        for (ResponseCommand command : playbook) {
            command.execute();

            // Save to PostgreSQL audit trail
            AuditEntry entry = AuditEntry.builder()
                    .incidentId(UUID.fromString(incidentId))  // Bug 2 fix: was broken UUID logic
                    .actionType(command.getClass().getSimpleName())
                    .actionDescription(command.describe())
                    .executedBy("IncidentResponderAgent")
                    .build();
            try {
                auditRepo.save(entry);
            } catch (Exception e) {
                log.warn("[RESPONDER] Could not persist audit entry (DB may not be up): {}", e.getMessage());
            }

            // Broadcast each action to the React dashboard
            WebSocketMessage msg = WebSocketMessage.responseExecuted(
                    incidentId,
                    command.getClass().getSimpleName().replace("Command", "").toUpperCase(),
                    command.describe(),
                    true,
                    command instanceof BlockIpCommand
            );
            eventProducer.publishResponse(msg);
        }

        long elapsedMs = System.currentTimeMillis() - startMs;

        // Broadcast final containment message
        WebSocketMessage contained = WebSocketMessage.incidentContained(
                incidentId, elapsedMs, playbook.size());
        eventProducer.publishResponse(contained);

        log.info("[RESPONDER] Playbook complete. {} actions in {}ms", playbook.size(), elapsedMs);

        return Finding.builder()
                .agentName(getAgentName())
                .severity("CRITICAL")
                .confidence(1.0)
                .summary("Playbook executed: " + playbook.size() + " actions taken")
                .isMalicious(true)
                .build();
    }
}

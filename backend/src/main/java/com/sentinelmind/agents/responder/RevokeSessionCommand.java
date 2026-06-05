package com.sentinelmind.agents.responder;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * RevokeSessionCommand — Command Pattern (Lab 7)
 *
 * Immediately terminates the attacker's active session so they cannot
 * continue operating even if they already authenticated.
 * In production: calls the session store (Redis/JWT blacklist) to invalidate sessionId.
 */
public class RevokeSessionCommand implements ResponseCommand {

    private static final Logger log = LoggerFactory.getLogger(RevokeSessionCommand.class);

    private final String userId;
    private final String sessionId;

    public RevokeSessionCommand(String userId, String sessionId) {
        this.userId    = userId;
        this.sessionId = sessionId;
    }

    @Override
    public void execute() {
        log.warn("[RESPONSE] REVOKING SESSION for user: {} session: {}", userId, sessionId);
        System.out.println("[RESPONSE] REVOKING SESSION for user: " + userId);
    }

    @Override
    public void undo() {
        // Sessions cannot be restored — the user must log in again
        System.out.println("[ROLLBACK] Cannot restore session — user must log in again.");
    }

    @Override
    public String describe() {
        return "Revoked session " + sessionId + " for user: " + userId;
    }
}

package com.sentinelmind.agents.responder;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * ForcePasswordResetCommand — Command Pattern (Lab 7)
 *
 * Forces the compromised account to change its password on next login.
 * This ensures that even if the attacker captured the credentials, they become useless.
 * In production: sets a "must-reset" flag in the user store or identity provider.
 */
public class ForcePasswordResetCommand implements ResponseCommand {

    private static final Logger log = LoggerFactory.getLogger(ForcePasswordResetCommand.class);

    private final String userId;

    public ForcePasswordResetCommand(String userId) {
        this.userId = userId;
    }

    @Override
    public void execute() {
        log.warn("[RESPONSE] FORCING PASSWORD RESET for: {}", userId);
        System.out.println("[RESPONSE] FORCING PASSWORD RESET for: " + userId);
    }

    @Override
    public void undo() {
        System.out.println("[ROLLBACK] Password reset cannot be undone automatically.");
    }

    @Override
    public String describe() {
        return "Forced password reset for user: " + userId;
    }
}

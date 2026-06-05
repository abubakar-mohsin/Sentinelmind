package com.sentinelmind.agents.responder;

/**
 * ResponseCommand — Command interface (Lab 7)
 *
 * This is the "Order" interface from Lab 7.
 * Every response action the Incident Responder can take must implement this.
 * Wrapping actions as objects gives us: queueing, logging, and the ability to undo.
 *
 * Concrete implementations: BlockIpCommand, RevokeSessionCommand, ForcePasswordResetCommand
 */
public interface ResponseCommand {

    /** Perform the response action (block, revoke, reset, notify, etc.). */
    void execute();

    /** Reverse the action — used if the incident turns out to be a false positive. */
    void undo();

    /** Human-readable summary logged to PostgreSQL in the audit trail. */
    String describe();
}

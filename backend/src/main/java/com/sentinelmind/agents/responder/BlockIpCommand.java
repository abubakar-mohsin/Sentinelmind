package com.sentinelmind.agents.responder;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * BlockIpCommand — Command Pattern (Lab 7)
 *
 * This is "BuyStock" from Lab 7 — a concrete Command.
 * When executed, it blocks the malicious IP address at the network level.
 * In demo mode this logs the action; in production it would call a firewall API.
 *
 * The rollbackToken is a unique string that an operator can use to reverse the block
 * if the incident turns out to be a false positive (e.g., a legitimate user on a VPN).
 */
public class BlockIpCommand implements ResponseCommand {

    private static final Logger log = LoggerFactory.getLogger(BlockIpCommand.class);

    private final String ipAddress;
    private final String rollbackToken;

    public BlockIpCommand(String ipAddress) {
        this.ipAddress     = ipAddress;
        this.rollbackToken = "UNBLOCK-" + ipAddress + "-" + System.currentTimeMillis();
    }

    @Override
    public void execute() {
        // In production: call firewall/WAF API. In demo: structured log entry.
        log.warn("[RESPONSE] BLOCKING IP: {}", ipAddress);
        System.out.println("[RESPONSE] BLOCKING IP: " + ipAddress);
    }

    @Override
    public void undo() {
        log.info("[ROLLBACK] UNBLOCKING IP: {} | Token: {}", ipAddress, rollbackToken);
        System.out.println("[ROLLBACK] UNBLOCKING IP: " + ipAddress
                + " | Token: " + rollbackToken);
    }

    @Override
    public String describe() {
        return "Blocked IP address: " + ipAddress + " | Rollback token: " + rollbackToken;
    }

    public String getRollbackToken() {
        return rollbackToken;
    }
}

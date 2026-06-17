# AGENTS.md — SentinelMind Build Guide

> This is the entry-point file for Codex. Read this first, then read the
> documents in `/docs` in this order: PRD → SRS → ARCHITECTURE → ROADMAP → DESIGN_PATTERNS.
> Build strictly against the MVP scope defined here. Do NOT build the full
> 11-agent commercial system — build the demo-critical slice described below.

---

## What we are building

**SentinelMind** — an autonomous multi-agent AI cybersecurity platform. It is a
4th-semester university project for a *Software Design & Architecture* course.
The grade depends on: (1) a working GUI, (2) at least 6 design patterns used
correctly, (3) a clean architecture, and (4) one impressive end-to-end demo.

It is NOT a real production security product. It is a **realistic, working
demonstration** of the architecture of one. Favor a working demo over coverage.

## The single most important thing: the demo must work

Everything is built in service of ONE demo scenario — a **credential stuffing
attack detected and contained in ~10 seconds**:

1. A login event arrives from a suspicious IP (a known Tor exit node).
2. The **Anomaly Detection** agent flags it (unusual country/time, robotic speed).
3. The **Orchestrator** wakes, queries the knowledge graph, dispatches agents.
4. The **Threat Intelligence** agent confirms the IP is known-bad.
5. The **Threat Classifier** maps it to MITRE `T1078` + `T1110.004`.
6. The **Incident Responder** blocks the IP, kills the session, raises an alert.
7. The **React dashboard** shows every step happening live via WebSocket.

If this scenario runs end-to-end and looks good on screen, the project succeeds.

## Hard rules for the build

- **Language/stack is fixed** (see ARCHITECTURE.md). Java 21 + Spring Boot 3
  backend, React 18 frontend, Kafka, Neo4j, PostgreSQL, Redis, Docker Compose.
- **Everything runs locally via `docker compose up`.** No cloud, no Kubernetes.
- **Six design patterns are mandatory and must be real, not decorative.**
  All six come from Ms. Maham's labs. See DESIGN_PATTERNS.md for full details
  with code sketches for each one. Summary:
  1. **Singleton** (Lab 2) → `KnowledgeGraphService` — one Neo4j connection
  2. **Factory** (Lab 3) → `AgentFactory` — creates agents by type
  3. **Builder** (Lab 4) → `IncidentReport.Builder` — assembles incident step by step
  4. **Adapter** (Lab 5) → `VirusTotalAdapter` — wraps threat feeds behind one interface
  5. **Chain of Responsibility** (Lab 7) → `AbstractEventHandler` — severity escalation chain
  6. **Command** (Lab 7) → `BlockIpCommand` etc. — each response action is a Command object
  Bonus: **Strategy** → `ThreatClassifier` (RuleBasedStrategy vs LlmStrategy)
- **Mock/real switching uses Spring profiles.**
  Default profile = `mock` — the demo always works with no external API keys.
  To enable live APIs, set `SPRING_PROFILES_ACTIVE=real` in docker-compose.yml.
  Every external integration (VirusTotal, NVD, LLM API, notifications) MUST have
  a `@Profile("mock")` implementation and a `@Profile("real")` implementation.
  Never hardcode a flag — always use Spring profiles.
- **Build incrementally and keep it runnable at every step.** Never leave the
  repo in a non-compiling state at the end of a work session.
- **Write code a student can explain.** No clever metaprogramming. Clear names,
  comments on every agent class explaining its role in plain English.

## MVP scope — build these FULLY

| Component | Build level |
|---|---|
| Docker Compose (all services) | Full |
| Orchestrator + ReAct loop (rule-based) | Full |
| Kafka event bus + topics | Full |
| Neo4j knowledge graph + MITRE ATT&CK seed | Full |
| Anomaly Detection (z-score, rule-based) | Full |
| Threat Intelligence (mock + optional real API) | Full |
| Threat Classifier (rule-based + optional LLM) | Full |
| Incident Responder (block IP, revoke session, notify) | Full |
| PostgreSQL audit log | Full |
| React dashboard + WebSocket | Full |

## Reduced scope — simplify or stub these

| Component | Build level |
|---|---|
| Vulnerability Scanner | Simple NVD lookup, no live scanning |
| Forensics Agent | Generate report from existing graph data |
| Anomaly Detection autoencoder (ML) | SKIP — z-score only |
| Code Security Agent | Regex + optional LLM, skip full AST |
| Dependency Scanner | Typosquatting (Levenshtein) only |
| SBOM Analyzer | Generate a CycloneDX file, skip blast-radius UI |
| Build Integrity Agent | Pre-computed SHA-256 comparison (simulated) |
| ChromaDB vector search | SKIP for MVP |
| Redis | Wire it up; caching is optional |

## What "done" looks like

- `docker compose up` brings up the whole system.
- A seed script loads MITRE ATT&CK data + demo entities into Neo4j.
- A "simulate attack" button (or script) injects the credential-stuffing event.
- The dashboard shows the alert flowing through each agent in real time.
- The incident, with its full evidence chain, is written to PostgreSQL.
- The README explains how to run it and where each of the 6 design patterns lives.
- Every pattern class has a plain-English comment at the top explaining its role.

## Simulate attack script — exact specification

The file `seed/simulate_attack.sh` must do exactly this and nothing else:

```bash
#!/bin/bash
# simulate_attack.sh
# Injects the demo credential-stuffing event into SentinelMind.
# Run this after `docker compose up` to trigger the 10-second demo scenario.

curl -s -X POST http://localhost:8080/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "actor": "ahmed@targetcorp.com",
    "sourceIp": "185.220.101.47",
    "action": "LOGIN",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "userAgent": "python-requests/2.28.0",
    "loginLatencyMs": 312,
    "country": "RU",
    "hour": 23
  }' | jq .

echo ""
echo "Attack injected. Watch the dashboard at http://localhost:3000"
```

The IP `185.220.101.47` must be in the `MockThreatFeed` bad-IP list and in
`demo_entities.cypher`. The username `ahmed@targetcorp.com` must be the user
whose baseline is seeded in Neo4j (normally logs in from PK, daytime hours).

## Team note

The original spec assumes a team of 5 over 16 weeks. This build is a solo/small
effort over ~15 days using Codex. Scope accordingly — the tables above are
the contract, not the original spec's full agent list.

## Likely viva questions — quick answers

**Q: Why Neo4j instead of just PostgreSQL for everything?**
A: The core questions are about *relationships and paths* — "which services are
affected by this CVE", "trace the lateral movement path from patient zero". Those
are multi-hop graph traversals that are natural in Cypher but slow and awkward as
SQL joins. PostgreSQL is still used for flat audit logs where rows, not
relationships, are what matter.

**Q: Where is the Observer pattern?**
A: At the infrastructure level — Kafka pub/sub IS the Observer pattern. The
Orchestrator (subject/publisher) publishes to agent topics; each agent
(observer/subscriber) reacts to messages on its topic. The decoupling is total —
agents don't even know each other exist.

**Q: What does the Orchestrator actually decide?**
A: Which agents to activate (based on event type and current graph context), in
what order, and whether the combined confidence of their findings is high enough
(≥ 0.92) to authorize the Incident Responder. It never analyzes events itself.

**Q: What's the difference between Builder and Factory?**
A: Factory decides *which* object to create (give me the right agent type).
Builder decides *how* to assemble a complex object step by step (build an
IncidentReport by adding findings one by one as they arrive).

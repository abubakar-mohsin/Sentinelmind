# PRD — SentinelMind

**Product Requirements Document**
Version 1.1 · Course project (SE-211L, Software Design & Architecture)

---

## 1. Problem statement

Organizations get breached and find out far too late — the industry average is
**194 days to detect** a breach and **73 more days to contain** it. The reason is
not lack of data. It is **tool sprawl**: a typical company runs 40–50 separate
security tools (SIEM, EDR, SAST, SCA, vulnerability scanners) that do not talk to
each other. Each tool sees one fragment of an attack and none has the full
picture, so a human analyst must manually connect the dots — slowly, while under
a flood of alerts.

**SentinelMind** unifies threat detection and response across three attack
surfaces — **code** (before it ships), **dependencies** (as they are imported),
and **runtime** (as services execute) — into a single autonomous AI platform that
correlates findings through a shared knowledge graph and responds automatically
in seconds rather than days.

> Honest framing for the defense: existing tools do not "fail." They each do their
> one job well. The gap is that they are *separate, expensive, and require humans
> to connect them*. The whole industry is moving toward unified platforms (a new
> category called ASPM — Application Security Posture Management) for exactly this
> reason. SentinelMind is a from-scratch, AI-driven take on that idea.

## 2. Goals and non-goals

### Goals
- Demonstrate an autonomous, multi-agent architecture that detects, correlates,
  and responds to a cyber threat with no human in the critical path.
- Show cross-layer correlation via a shared knowledge graph (Neo4j + MITRE ATT&CK).
- Deliver one flawless end-to-end demo (credential stuffing, ~10s containment).
- Demonstrate correct use of at least **six** software design patterns from course labs.
- Provide a real-time GUI (React dashboard) showing the system thinking live.

### Non-goals
- Not a production security product; will not be deployed to protect real systems.
- No real network packet capture, no real endpoint agents, no Kubernetes.
- No machine-learning model training (statistical rules stand in for ML).
- Not aiming for full coverage of all 11 agents at production quality — the demo
  slice is the priority.

## 3. Target users (for the narrative / demo framing)

- **Security Analyst (SOC operator)** — the primary dashboard user. Wants to see
  threats, understand them, and trust the automated response.
- **Developer** — interacts indirectly via the CodeSentinel module (PR scanning).
- **Orchestrator (system actor)** — the internal AI actor that drives automated
  workflows; not a human, but the "user" of every sub-agent.

## 4. Core features (priority order)

### P0 — must work for the demo
1. **Event ingestion** — accept a security event (login) into the system.
2. **Orchestration** — Orchestrator consumes events, queries the graph, and
   delegates to sub-agents using a ReAct (Reason→Act→Observe→Repeat) loop.
3. **Anomaly detection** — flag a login that deviates from a baseline (z-score).
4. **Threat enrichment** — look up the IP's reputation (known-bad / Tor node).
5. **Threat classification** — map the behavior to a MITRE ATT&CK technique.
6. **Automated response** — block the IP, revoke the session, raise a notification.
7. **Live dashboard** — show every step in real time over WebSocket.
8. **Audit trail** — write the incident and every action to PostgreSQL.

### P1 — strengthens the project
9. Vulnerability scanner (NVD lookup with EPSS-style prioritization).
10. Forensics report generation from graph data.
11. Dependency typosquatting detection (Levenshtein distance).
12. SBOM generation (CycloneDX output).

### P2 — nice to have / future
13. Code Security agent (regex + LLM PR review).
14. Build Integrity (simulated SHA-256 verification).
15. Threat hunting mode, federated intel, explainable-AI audit (future work).

## 5. Success metrics (demo benchmarks)

- **Time to detect → contain:** under ~10 seconds for the demo scenario.
- **End-to-end run:** the demo completes without manual intervention.
- **Visibility:** each agent's activation is visible on the dashboard as it happens.
- **Auditability:** the full evidence chain is queryable in PostgreSQL afterward.
- **Patterns:** at least **6 design patterns** are present and explainable in the
  code (Singleton, Factory, Builder, Adapter, Chain of Responsibility, Command).
  See DESIGN_PATTERNS.md for the full specification of each one.

## 6. Key constraints

- ~15 day timeline, small team, built with Claude Code assistance.
- Must run entirely locally (`docker compose up`).
- GUI is compulsory (course requirement).
- Font/formatting rules apply to the *report*, not the software.
- All external integrations must have a mock mode so the demo is self-contained.
- **At least 6 design patterns** from Ms. Maham's labs (Lab 2–7) must be used
  correctly and explainably. See DESIGN_PATTERNS.md for the authoritative mapping.

## 7. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Scope creep (trying to build all 11 agents) | Strict MVP table in CLAUDE.md; stub the rest |
| External APIs flaky/keyed during demo | Mock mode for every external feed |
| Kafka/Neo4j setup eats days | Docker Compose first; one seed script |
| Demo breaks live | A scripted "simulate attack" path with seeded data |
| Can't explain the code in viva | Plain names, per-class English comments |

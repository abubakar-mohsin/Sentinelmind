# ROADMAP — SentinelMind (15-Day Build)

A realistic day-by-day plan for a solo/small build using Claude Code. Each day
ends with something that runs. Never end a day with a broken build.

> The original spec's 16-week, 5-person plan is compressed here. The ordering is
> deliberate: infrastructure and the knowledge graph come first because every
> agent depends on them; the demo path is built before the extra agents.

---

## Phase 1 — Foundation (Days 1–3)

**Goal: `docker compose up` brings up every service and a Spring Boot app that
logs an incoming event.**

- **Day 1** — Repo + Docker Compose for Kafka, Neo4j, PostgreSQL, Redis. Spring
  Boot 3 skeleton (Java 21). Confirm all containers start and the app boots.
- **Day 2** — Kafka wiring: define topics, a producer, and a consumer. Post an
  event to `raw-events` and log it from a consumer. Neo4j connection + the
  `KnowledgeGraphService` singleton.
- **Day 3** — Neo4j schema + seed script: load MITRE ATT&CK (subset) and demo
  entities. Basic Orchestrator stub that consumes `raw-events` and logs context
  from the graph.

**End of Phase 1:** infrastructure solid, graph seeded, events flow into the system.

## Phase 2 — Core detection path (Days 4–7)

**Goal: an event flows Orchestrator → Anomaly → Threat Intel → Classifier and
produces a classified incident (no response yet).**

- **Day 4** — `ISecurityAgent` interface + `AgentFactory` (Factory Method).
  Anomaly Detection agent (z-score against a seeded baseline). Emits findings.
- **Day 5** — Threat Intelligence agent with a mock reputation list (Tor nodes,
  known-bad IPs). Optional real VirusTotal path behind a flag.
- **Day 6** — Threat Classifier with rule-based MITRE mapping + the Strategy
  interface (rule vs LLM). LLM path optional/mocked.
- **Day 7** — Orchestrator ReAct loop for real: query → delegate → observe →
  confidence → repeat. Produce a CRITICAL classified incident for the demo input.

**End of Phase 2:** the brain works; an attack event becomes a classified incident.

## Phase 3 — Response + dashboard (Days 8–11)

**Goal: the full demo runs end-to-end and is visible live on screen.**

- **Day 8** — Incident Responder: block IP, revoke session, force reset, notify
  (console/log sink in mock mode). Each action carries a rollback token.
- **Day 9** — PostgreSQL audit layer: persist incidents + actions immutably.
- **Day 10** — React dashboard scaffold + WebSocket gateway. Live alert queue and
  per-incident agent-activity view.
- **Day 11** — Wire the dashboard to the live flow; polish the "simulate attack"
  script/button. The 10-second demo now plays out visibly.

**End of Phase 3:** the demo is complete and presentable. *If time runs out here,
the project is already a pass.*

## Phase 4 — Breadth agents (Days 12–13)

**Goal: add P1 agents to show the multi-layer story (code + deps + supply chain).**

- **Day 12** — Vulnerability Scanner (seeded NVD + EPSS-style ranking). Forensics
  agent (graph traversal → timeline report).
- **Day 13** — Dependency Scanner (typosquatting via Levenshtein). SBOM Analyzer
  (CycloneDX output). Optionally a thin Code Security agent (regex + LLM).

**End of Phase 4:** the "covers all three layers" claim is demonstrable.

## Phase 5 — Polish, docs, demo prep (Days 14–15)

**Goal: it looks finished and you can explain every part.**

- **Day 14** — Dashboard polish (topology map, charts, dark theme). Add the
  Singleton + Chain-of-Responsibility patterns cleanly if not already present.
  Per-class English comments. README with run instructions + pattern map.
- **Day 15** — Full dry-run of the demo several times. Record a backup video.
  Prepare answers for likely viva questions (why graph DB, where each pattern is,
  what's real vs simulated). Final report polish.

---

## Cut-line discipline

If you fall behind, cut from the **bottom up**: drop Phase 4 breadth agents before
touching the Phase 1–3 demo path. A flawless 10-second demo with 4 working agents
beats a broken system with 11 half-built ones.

## Daily Claude Code habit

- Start each session by pointing Claude Code at `CLAUDE.md` and the relevant doc.
- Ask for one phase-sized chunk at a time; run it; commit before moving on.
- Keep the repo compiling at every commit.
- After each agent, ask Claude Code to add a one-paragraph English comment
  explaining that agent's role — this is your viva cheat-sheet, written as you go.

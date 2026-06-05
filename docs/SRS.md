# SRS — SentinelMind

**Software Requirements Specification**
Version 1.1 · IEEE-style, scoped to the MVP

---

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements for the
SentinelMind MVP — a multi-agent AI cybersecurity platform built as a university
Software Design & Architecture project.

### 1.2 Scope
The MVP detects, correlates, classifies, and responds to a runtime security
threat (credential stuffing) end-to-end, with a live dashboard and an audit log.
Reduced-scope agents (vulnerability, forensics, code, supply-chain) are included
in simplified form. See CLAUDE.md for the authoritative build-level table.

### 1.3 Definitions
- **Agent** — a self-contained Spring Boot component with one security job.
- **Orchestrator** — the coordinating agent running the ReAct loop.
- **Knowledge graph** — Neo4j store of entities and relationships, seeded with
  the MITRE ATT&CK taxonomy.
- **Event** — a normalized security signal (e.g., a login) placed on Kafka.
- **Finding** — an agent's analysis result published back to Kafka.
- **MITRE ATT&CK** — standard taxonomy of attacker tactics/techniques (e.g. T1078).
- **EPSS** — Exploit Prediction Scoring System; probability a CVE is exploited.

## 2. Overall description

### 2.1 Product perspective
A backend of cooperating agents communicating over a Kafka event bus, sharing a
Neo4j knowledge graph, persisting to PostgreSQL, and pushing live updates to a
React dashboard over WebSocket. All services run via Docker Compose.

### 2.2 User classes
- **Security Analyst** — views dashboard, reviews incidents.
- **Developer** — (P2) receives PR security feedback.
- **System/Orchestrator** — internal actor driving automated flows.

### 2.3 Operating environment
Local developer machine, Docker Compose, modern browser for the dashboard.

### 2.4 Design & implementation constraints
- Java 21, Spring Boot 3; React 18; Kafka; Neo4j; PostgreSQL; Redis.
- **At least 6 design patterns** from Ms. Maham's labs (Lab 2–7), real and
  explainable. See DESIGN_PATTERNS.md for the authoritative pattern specifications.
- Self-contained: every external dependency has a mock mode (via Spring profiles).

## 3. Functional requirements

### FR-01 Event ingestion
The system shall accept a security event (JSON: actor, sourceIp, timestamp,
action) via REST or a simulate script and publish it to the `raw-events` Kafka topic.

### FR-02 Orchestration (ReAct loop)
The Orchestrator shall consume `raw-events`, query Neo4j for context on the
involved entities, and iteratively delegate to sub-agents until a confidence
threshold (default 0.92) is reached or a max iteration count is hit.

### FR-03 Anomaly detection
The Anomaly Detection agent shall compute a z-score for a login against a stored
per-entity baseline (login hour, country, action latency) and emit a severity
(LOW/MEDIUM/HIGH/CRITICAL) finding to the `findings` topic.

### FR-04 Threat intelligence enrichment
The Threat Intelligence agent shall look up a source IP against a reputation
source (mock list by default; optional live VirusTotal/Tor-node feed) and return
a threat score plus context (is-Tor, prior campaigns).

### FR-05 Threat classification
The Threat Classifier agent shall map an enriched finding to one or more MITRE
ATT&CK technique IDs using rule-based matching first and an optional LLM call for
novel patterns (Strategy pattern). It shall flag recognized kill-chain sequences.

### FR-06 Automated response
The Incident Responder agent shall, when authorized by the Orchestrator above the
confidence threshold, execute a playbook: block the source IP, revoke the
session, force credential reset, and dispatch a notification — each action
recorded with a rollback token.

### FR-07 Audit logging
The system shall write every incident and every responder action immutably to
PostgreSQL with timestamp, triggering event, confidence score, and rollback token.

### FR-08 Real-time dashboard
The dashboard shall display, via WebSocket, the live alert queue, each agent's
activation for the current incident, and the final response actions, without
requiring a page refresh.

### FR-09 Knowledge graph seeding
The system shall provide a seed routine that loads MITRE ATT&CK tactics/techniques
and demo entities (users, IPs, services) into Neo4j on first run.

### FR-10 Vulnerability lookup (P1)
The Vulnerability Scanner shall accept a software/version and return known CVEs
from a seeded NVD dataset, ranked by an EPSS-style score rather than CVSS alone.

### FR-11 Forensics report (P1)
The Forensics agent shall traverse the Neo4j graph for a given incident and
produce a structured timeline (how in, what touched, blast radius).

### FR-12 Dependency typosquatting (P1)
The Dependency Scanner shall flag a package whose name is within Levenshtein
distance 1–2 of a known popular package.

### FR-13 SBOM generation (P1)
The SBOM Analyzer shall output a CycloneDX-format bill of materials for a service's
declared dependencies.

## 4. Non-functional requirements

### NFR-01 Performance
The demo scenario shall detect→contain within ~10 seconds on a developer laptop.

### NFR-02 Decoupling / maintainability
Agents shall communicate only via Kafka; no agent shall directly call another.
Any agent shall be replaceable without changing others (Observer + Factory).

### NFR-03 Reliability
Kafka's durable log shall preserve events across agent restarts. The system shall
resume processing after any single agent restarts.

### NFR-04 Security (of the app itself)
Dashboard access shall use JWT auth; audit records shall be append-only.

### NFR-05 Portability
The full system shall start with a single `docker compose up` and require no cloud.

### NFR-06 Observability
Each agent shall log its activations; the dashboard shall reflect agent activity.

### NFR-07 Explainability
Each incident record shall include a human-readable reason string (which signals
drove the classification and the response).

## 5. Design patterns (requirement-level)

The system shall implement **at least 6 design patterns** from Ms. Maham's labs.
All 6 are mandatory. Strategy is a bonus for extra credit. See DESIGN_PATTERNS.md
for full code sketches, real-world analogies, and viva preparation for each one.

| # | Pattern | Lab | Where | Why | Status |
|---|---|---|---|---|---|
| 1 | Singleton | Lab 2 | `KnowledgeGraphService` — one Neo4j driver shared by all agents | Shared connection pool, no duplication | **Mandatory** |
| 2 | Factory Method | Lab 3 | `AgentFactory` — creates agents by event type | Decouple agent creation from Orchestrator | **Mandatory** |
| 3 | Builder | Lab 4 | `IncidentReport.Builder` — assembles incident step by step | Complex object built from partial data arriving at different times | **Mandatory** |
| 4 | Adapter | Lab 5 | `VirusTotalAdapter` — wraps threat feeds behind `IThreatFeed` | Switch mock ↔ real API without changing the agent | **Mandatory** |
| 5 | Chain of Responsibility | Lab 7 | `AbstractEventHandler` — LOW→MEDIUM→HIGH→CRITICAL escalation chain | Extensible severity pipeline, no giant if/else | **Mandatory** |
| 6 | Command | Lab 7 | `BlockIpCommand`, `RevokeSessionCommand`, etc. | Each response action is loggable, queueable, and undoable | **Mandatory** |
| 7 | Strategy | (bonus) | `ThreatClassifier` — switches `RuleBasedStrategy` ↔ `LlmStrategy` | Runtime algorithm swap without changing the classifier | **Bonus / extra credit** |

> **Note:** The Observer pattern is implemented at the infrastructure level via
> Kafka pub/sub (Orchestrator publishes, agents subscribe). It is architecturally
> present but does not map to a single class — it is the event bus itself.

## 6. External interfaces (all with mock mode)

All mock/real switching is controlled by Spring profiles (see CLAUDE.md).
Default profile = `mock`. Set `SPRING_PROFILES_ACTIVE=real` for live APIs.

- VirusTotal / Tor exit-node list (IP reputation)
- NVD + EPSS (CVE data and exploit probability)
- OSV.dev (dependency vulnerabilities)
- LLM API (Claude/GPT) for classification and code review
- Notification sink (Slack/PagerDuty) — log to console in mock mode

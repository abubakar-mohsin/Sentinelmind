# SentinelMind

**Autonomous Multi-Agent AI Cybersecurity Platform**  
SE-211L — Software Design & Architecture · 4th Semester

SentinelMind detects, classifies, and automatically contains a cyber threat in under 10 seconds.
It demonstrates a multi-agent event-driven architecture: Java 21 + Spring Boot 3, Kafka, Neo4j,
PostgreSQL, and a live React dashboard.

---

## Quick Start

**Requirements:** Docker Desktop (with Compose), `jq` (for the simulate script)

```bash
docker compose up
```

Wait ~60 seconds for all services to pass their health checks. Then open:

| Service | URL |
|---|---|
| **React Dashboard** | http://localhost:3000 |
| Backend API | http://localhost:8080 |
| Neo4j Browser | http://localhost:7474 — credentials: `neo4j` / `sentinelmind` |

---

## Running the Demo

### Option 1 — Dashboard button (recommended for the viva)
Click **"Simulate Attack"** on the dashboard. Watch the pipeline.

### Option 2 — Shell script
```bash
cd seed && bash simulate_attack.sh
```

The demo completes in ~10 seconds. Every agent activation is visible live on the dashboard.

---

## What Happens in the Demo

A **credential stuffing attack** event is injected:

```json
{
  "actor":          "ahmed@targetcorp.com",
  "sourceIp":       "185.220.101.47",
  "action":         "LOGIN",
  "country":        "RU",
  "hour":           23,
  "loginLatencyMs": 312,
  "userAgent":      "python-requests/2.28.0"
}
```

The user `ahmed` normally logs in from Pakistan during business hours.
The IP is a real-world Tor exit node. The login speed (312 ms) is robotic.

**Step-by-step pipeline:**

| Step | Agent | What it finds |
|---|---|---|
| 1 | OrchestratorAgent | Wakes up, queries Neo4j for IP / user context |
| 2 | AnomalyDetectionAgent | Z-score ≈ 8.9 — 8.9 σ from user's baseline → CRITICAL anomaly |
| 3 | ThreatIntelAgent | IP is in 4 threat feeds, confirmed Tor exit node |
| 4 | ThreatClassifierAgent | MITRE T1078 (Valid Accounts) + T1110.004 (Credential Stuffing) |
| 5 | OrchestratorAgent | Confidence 0.967 ≥ 0.92 → authorizes Incident Responder |
| 6 | IncidentResponderAgent | Blocks IP, revokes session, forces password reset |
| 7 | Audit | Incident + every action written to PostgreSQL with rollback tokens |

---

## Design Patterns (Ms. Maham's Labs 2–7)

All 6 mandatory patterns plus one bonus (Strategy). Every class has a plain-English comment
at the top explaining its role — open any file below during the viva.

| # | Pattern | Lab | File | What it does in SentinelMind |
|---|---|---|---|---|
| 1 | **Singleton** | Lab 2 | [`graph/KnowledgeGraphService.java`](backend/src/main/java/com/sentinelmind/graph/KnowledgeGraphService.java) | One Neo4j driver shared by all agents — like a school with one principal |
| 2 | **Factory Method** | Lab 3 | [`agents/AgentFactory.java`](backend/src/main/java/com/sentinelmind/agents/AgentFactory.java) | Orchestrator asks for "ANOMALY" agent; factory returns the right one without `new` |
| 3 | **Builder** | Lab 4 | [`model/IncidentReport.java`](backend/src/main/java/com/sentinelmind/model/IncidentReport.java) | Assembles a 9-field incident report piece by piece as findings arrive from different agents |
| 4 | **Adapter** | Lab 5 | [`agents/threatintel/VirusTotalAdapter.java`](backend/src/main/java/com/sentinelmind/agents/threatintel/VirusTotalAdapter.java) | Translates VirusTotal's API format into our `IThreatFeed` interface — agent never knows which one is behind it |
| 5 | **Chain of Responsibility** | Lab 7 | [`orchestrator/handlers/`](backend/src/main/java/com/sentinelmind/orchestrator/handlers/) | LOW → MEDIUM → HIGH → CRITICAL escalation chain — same structure as `AbstractLogger` from Lab 7 |
| 6 | **Command** | Lab 7 | [`agents/responder/`](backend/src/main/java/com/sentinelmind/agents/responder/) | `BlockIpCommand`, `RevokeSessionCommand`, `ForcePasswordResetCommand` — each has `execute()` + `undo()` + audit token |
| 7 | **Strategy** *(bonus)* | — | [`agents/classifier/`](backend/src/main/java/com/sentinelmind/agents/classifier/) | Classifier switches between `RuleBasedStrategy` (offline, default) and `LlmStrategy` (`real` profile) at runtime |

**Observer pattern** is at the infrastructure level: Kafka pub/sub.
Orchestrator publishes to agent topics; agents subscribe. They do not know each other exist.
This is Observer without a single class that represents it — it is the event bus itself.

### Quick viva answers

**Q: Why Neo4j instead of PostgreSQL for everything?**  
A: Core questions are about *relationships and paths* — "trace lateral movement", "which services are
affected by this CVE". Multi-hop traversals are natural in Cypher but slow as SQL joins.
PostgreSQL is still used for flat audit logs where rows, not relationships, matter.

**Q: Where is the Observer pattern?**  
A: At the infrastructure level — Kafka pub/sub IS Observer. Orchestrator publishes; agents subscribe.
Total decoupling — agents don't know each other exist.

**Q: What does the Orchestrator actually decide?**  
A: Which agents to activate, in what order, and whether combined confidence ≥ 0.92 authorizes
the Incident Responder. It never analyzes events itself.

**Q: What is the confidence threshold formula?**  
A: `(anomalyScore × 0.30) + (threatIntelScore × 0.40) + (classifierScore × 0.30)`  
Demo values: z=8.7 → 0.261, 4 feeds → 0.400, rule matched → 0.300. Total: **0.961 ≥ 0.92 ✓**

**Q: Builder vs Factory?**  
A: Factory decides *which* object to create. Builder decides *how* to assemble a complex object
step by step.

---

## Architecture

```
Browser / Dashboard (React 18, TailwindCSS, D3.js)
        │  WebSocket / STOMP
        ▼
Spring Boot API  ──────────────────────────────────────────
        │                Apache Kafka (event bus)          │
        │   raw-events ──► OrchestratorAgent               │
        │                       │                          │
        │   agent.anomaly  ◄────┤                          │
        │         │             │                          │
        │   AnomalyDetectionAgent → findings               │
        │                       │ (reads finding)          │
        │   agent.threatintel ◄─┤                          │
        │         │             │                          │
        │   ThreatIntelAgent  → findings                   │
        │                       │                          │
        │   agent.classifier ◄──┤                          │
        │         │             │                          │
        │   ThreatClassifierAgent → findings               │
        │                       │ (confidence ≥ 0.92)      │
        │   agent.responder  ◄──┤                          │
        │         │             │                          │
        │   IncidentResponderAgent → responses             │
        │                                   │              │
        │              WebSocketGateway ◄───┘              │
        └──────────────────────────────────────────────────┘
                    │               │              │
               Neo4j            PostgreSQL       Redis
           (knowledge graph)   (audit log)     (cache)
```

---

## P1 REST Endpoints

Four additional endpoints demonstrate the multi-layer coverage story (code + deps + supply chain):

```bash
# CVE lookup — finds vulnerabilities for a package in Neo4j
curl -s -X POST http://localhost:8080/api/scan/vulnerability \
  -H "Content-Type: application/json" \
  -d '{"packageName":"log4j-core","version":"2.14.1"}' | jq .

# Forensics — graph traversal timeline for an incident
curl -s http://localhost:8080/api/forensics/<incidentId> | jq .

# Dependency typosquatting — Levenshtein distance check
curl -s -X POST http://localhost:8080/api/scan/dependency \
  -H "Content-Type: application/json" \
  -d '{"packages":["requessts","numpy","log4j-core"]}' | jq .

# SBOM generation — CycloneDX 1.4 format
curl -s -X POST http://localhost:8080/api/scan/sbom \
  -H "Content-Type: application/json" \
  -d '{"serviceName":"AuthService","packages":[{"name":"spring-boot","version":"3.2.5"},{"name":"log4j-core","version":"2.17.2"}]}' | jq .
```

---

## Project Layout

```
sentinelmind/
├── docker-compose.yml
├── CLAUDE.md                        ← build guide
├── docs/                            ← PRD, SRS, ARCHITECTURE, DESIGN_PATTERNS, ROADMAP
├── seed/
│   ├── mitre_attack_seed.cypher     ← MITRE ATT&CK tactics + techniques
│   ├── demo_entities.cypher         ← user / IP / service / CVE nodes
│   └── simulate_attack.sh
├── backend/
│   └── src/main/java/com/sentinelmind/
│       ├── orchestrator/            ← ReAct loop, Chain of Responsibility, ConfidenceCalculator
│       ├── agents/
│       │   ├── AgentFactory.java    ← Factory pattern
│       │   ├── anomaly/             ← AnomalyDetectionAgent (z-score)
│       │   ├── threatintel/         ← ThreatIntelAgent + Adapter pattern
│       │   ├── classifier/          ← ThreatClassifierAgent + Strategy pattern
│       │   ├── responder/           ← IncidentResponderAgent + Command pattern
│       │   ├── vuln/                ← VulnerabilityScannerAgent (P1)
│       │   ├── forensics/           ← ForensicsAgent (P1)
│       │   └── supply/              ← DependencyScanner + SbomAnalyzer (P1/P2)
│       ├── graph/                   ← KnowledgeGraphService (Singleton pattern)
│       ├── model/                   ← IncidentReport (Builder pattern), Finding, SecurityEvent
│       ├── messaging/               ← Kafka producers, topic constants
│       ├── audit/                   ← PostgreSQL repositories
│       └── api/                     ← REST controllers + WebSocket gateway
└── frontend/
    └── src/
        ├── App.jsx                  ← master WebSocket state machine
        ├── components/              ← AgentPipeline, AlertQueue, TopologyMap, ...
        └── ws/useWebSocket.js       ← STOMP/SockJS hook
```

---

## Services & Ports

| Container | Port | Notes |
|---|---|---|
| Kafka | 9092 | KRaft mode — no ZooKeeper |
| Neo4j | 7474 (HTTP), 7687 (Bolt) | Graph DB |
| PostgreSQL | 5432 | Audit log |
| Redis | 6379 | Optional cache |
| Backend | 8080 | Spring Boot API + WebSocket |
| Frontend | 3000 | React dashboard (served by nginx) |

---

## Switching to Real APIs

The default Spring profile is `mock` — the demo works with no external API keys.

To enable live VirusTotal + LLM calls:

```yaml
# In docker-compose.yml, change:
SPRING_PROFILES_ACTIVE: real

# And set your keys:
VIRUSTOTAL_API_KEY: your-key-here
LLM_API_KEY: your-key-here
```

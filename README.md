# SentinelMind

> **Autonomous multi-agent AI cybersecurity platform**  
> 4th Semester · Software Design & Architecture (SE-211L)  
> Java 21 · Spring Boot 3 · Kafka · Neo4j · PostgreSQL · React 18

---

## Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) with Docker Compose v2
- `jq` (used by the attack simulation script — `winget install jqlang.jq` on Windows)
- Git

### 1 — Clone and start

```bash
git clone https://github.com/abubakar-mohsin/Sentinelmind.git
cd Sentinelmind
docker compose up --build
```

First run builds images and seeds the database (~3–5 minutes).  
Subsequent runs start in ~30 seconds.

### 2 — Trigger the demo attack

Wait until the backend is healthy (`http://localhost:8080/actuator/health` returns `UP`), then:

```bash
bash seed/simulate_attack.sh
```

### 3 — Watch the dashboard

Open **http://localhost:3000** — the full detect-classify-contain sequence plays out live in ~10 seconds.

---

## Service URLs

| Service | URL | Credentials |
|---|---|---|
| React Dashboard | http://localhost:3000 | — |
| Backend REST API | http://localhost:8080 | — |
| Health Check | http://localhost:8080/actuator/health | — |
| Neo4j Browser | http://localhost:7474 | `neo4j` / `sentinelmind` |
| PostgreSQL | `localhost:5432` | `sentinelmind` / `sentinelmind` / db `sentinelmind` |
| Kafka | `localhost:9092` | — |
| Redis | `localhost:6379` | — |

---

## The Demo Scenario (10 seconds)

The simulate script injects a credential-stuffing attack:

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

**ahmed@targetcorp.com** normally logs in from Pakistan between 9 am–6 pm.  
**185.220.101.47** is a real-world Tor exit node that appears in 4 threat feeds.

### What happens — step by step

| Time | Agent | Action |
|---|---|---|
| 0 s | **Orchestrator** | Consumes event from Kafka `raw-events`; queries Neo4j for IP context |
| 1 s | **AnomalyDetectionAgent** | Computes z-score 8.9 — login from RU at 23:00 with 312 ms latency deviates 8.9σ from baseline → **CRITICAL** |
| 2 s | **ThreatIntelAgent** | `185.220.101.47` is in MockThreatFeed — confirmed Tor exit node, 4 feeds → **CRITICAL** |
| 4 s | **ThreatClassifierAgent** | Rule match: Tor + off-hours + robotic speed → `T1078` + `T1110.004` (Credential Stuffing) |
| 5 s | **Orchestrator** | Confidence = `(0.89×0.30) + (1.0×0.40) + (1.0×0.30)` = **0.967 ≥ 0.92** → authorizes response |
| 6 s | **IncidentResponderAgent** | Executes 3 Commands: `BlockIpCommand`, `RevokeSessionCommand`, `ForcePasswordResetCommand` |
| 7 s | **PostgreSQL** | Incident + 3 audit_action rows written immutably |
| 8 s | **Dashboard** | `INCIDENT_CONTAINED` message received — all panels update |

---

## Design Patterns — Viva Map

All 6 mandatory patterns from Ms. Maham's labs are **real** — each solves an actual problem.

| # | Pattern | Lab | File | Role in SentinelMind |
|---|---|---|---|---|
| 1 | **Singleton** | Lab 2 | `backend/…/graph/KnowledgeGraphService.java` | Spring `@Service` creates **one** Neo4j driver shared by all agents. One principal, many teachers. |
| 2 | **Factory Method** | Lab 3 | `backend/…/agents/AgentFactory.java` | Orchestrator asks for `"ANOMALY"` / `"THREAT_INTEL"` / `"CLASSIFIER"` / `"RESPONDER"`. Factory returns the right agent — Orchestrator never uses `new`. |
| 3 | **Builder** | Lab 4 | `backend/…/model/IncidentReport.java` | `IncidentReport.Builder` assembles the incident piece by piece as findings arrive from each agent — 9 fields built step by step. |
| 4 | **Adapter** | Lab 5 | `backend/…/agents/threatintel/VirusTotalAdapter.java` | `VirusTotalAdapter` wraps the VirusTotal REST API behind `IThreatFeed`. `ThreatIntelAgent` never knows if it's talking to the mock or real feed. |
| 5 | **Chain of Responsibility** | Lab 7 | `backend/…/orchestrator/handlers/AbstractEventHandler.java` | `LOW → MEDIUM → HIGH → CRITICAL` handler chain. Each level processes what it cares about and passes the finding up. Identical structure to `AbstractLogger` from Lab 7. |
| 6 | **Command** | Lab 7 | `backend/…/agents/responder/BlockIpCommand.java` | Each response action is a Command object with `execute()`, `undo()`, and `describe()`. `IncidentResponderAgent` is the Broker that queues and fires them. |
| +1 | **Strategy** *(bonus)* | — | `backend/…/agents/classifier/RuleBasedStrategy.java` | `ThreatClassifierAgent` injects `ClassificationStrategy` (interface). Spring injects `RuleBasedStrategy` in mock mode; `LlmStrategy` (@Primary) in real mode. Zero code change to swap — that IS the Strategy pattern. |

**Observer** is at the infrastructure level: Kafka pub/sub IS the Observer pattern.  
Orchestrator = publisher · Agents = subscribers · They never call each other directly.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              React Dashboard (:3000)                │
│  AlertQueue · AgentPipeline · TopologyMap (D3)      │
│  ResponseLog · ThreatMatrix · SystemMetrics         │
└──────────────────▲──────────────────────────────────┘
                   │ WebSocket / STOMP
┌──────────────────┴──────────────────────────────────┐
│        Spring Boot API Layer (:8080)                │
│  POST /api/events · GET /api/incidents              │
│  WebSocketGateway → /topic/events                   │
└──────────────────▲──────────────────────────────────┘
                   │
        ┌──────────┴──────────────────────────────────┐
        │              Apache Kafka                   │
        │  raw-events · agent.* · findings · responses│
        └──┬──────┬────────┬──────────┬──────────┬───┘
           │      │        │          │          │
   ┌───────┴──┐ ┌─┴──────┐ ┌────────┐ ┌────────┐ ┌──────────┐
   │Orchestra-│ │Anomaly │ │Threat  │ │Threat  │ │Incident  │
   │  tor     │ │Detect. │ │Intel   │ │Classif.│ │Responder │
   │(ReAct    │ │(z-score│ │(Adapter│ │(Stratgy│ │(Command  │
   │  loop)   │ │)       │ │)       │ │)       │ │  queue)  │
   └────┬─────┘ └────────┘ └────────┘ └────────┘ └──────────┘
        │
   ┌────┴──────┐   ┌──────────────┐   ┌────────────┐
   │  Neo4j    │   │  PostgreSQL  │   │   Redis    │
   │ MITRE     │   │  incidents + │   │  (cache,   │
   │ ATT&CK    │   │  audit_acts  │   │  optional) │
   └───────────┘   └──────────────┘   └────────────┘
```

### Confidence Score Formula

```
confidence = (anomalyScore × 0.30) + (threatIntelScore × 0.40) + (classifierScore × 0.30)
```

| Agent | Raw output | Normalized |
|---|---|---|
| AnomalyDetectionAgent | z-score | `min(zScore / 10.0, 1.0)` |
| ThreatIntelAgent | feed count | `feedCount >= 1 ? 1.0 : 0.0` |
| ThreatClassifierAgent | rule matched | `ruleMatched ? 1.0 : 0.3` |

Demo walkthrough: `(0.89×0.30) + (1.0×0.40) + (1.0×0.30) = 0.967` ✓ (≥ 0.92 threshold)

---

## Configuration

### Switching mock ↔ real APIs

Edit `docker-compose.yml`:

```yaml
SPRING_PROFILES_ACTIVE: real   # default: mock
```

Also set:
```yaml
VIRUSTOTAL_API_KEY: your-key-here
LLM_API_KEY: your-key-here
```

**What changes in `real` mode:**
- `MockThreatFeed` → `VirusTotalAdapter` (live IP reputation)
- `RuleBasedStrategy` primary → `LlmStrategy` primary (LLM classification first)
- Spring Security enforces HTTP Basic authentication (`admin` / `sentinelmind`)

### Reset demo data

```bash
docker compose down -v   # -v removes volumes → Neo4j and PostgreSQL are wiped
docker compose up --build
```

---

## Project Structure

```
Sentinelmind/
├── docker-compose.yml
├── README.md
├── seed/
│   ├── mitre_attack_seed.cypher       ← MITRE ATT&CK nodes (tactics, techniques)
│   ├── demo_entities.cypher            ← user baseline, attacker IP, target service
│   └── simulate_attack.sh              ← injects the demo event
├── docs/                               ← planning docs (PRD, SRS, ARCHITECTURE, etc.)
├── backend/
│   └── src/main/java/com/sentinelmind/
│       ├── SentinelMindApplication.java
│       ├── config/
│       │   ├── KafkaConfig.java
│       │   ├── WebSocketConfig.java
│       │   ├── CorsConfig.java
│       │   └── SecurityConfig.java     ← NFR-04: mock=open, real=auth enforced
│       ├── orchestrator/
│       │   ├── OrchestratorAgent.java  ← ReAct loop (Reason→Act→Observe)
│       │   ├── ConfidenceCalculator.java
│       │   └── handlers/               ← Chain of Responsibility (Pattern 5)
│       │       ├── AbstractEventHandler.java
│       │       ├── LowSeverityHandler.java
│       │       ├── MediumSeverityHandler.java
│       │       ├── HighSeverityHandler.java
│       │       └── CriticalSeverityHandler.java
│       ├── agents/
│       │   ├── ISecurityAgent.java
│       │   ├── AgentFactory.java       ← Factory Method (Pattern 2)
│       │   ├── anomaly/
│       │   │   └── AnomalyDetectionAgent.java  ← z-score detection
│       │   ├── threatintel/
│       │   │   ├── IThreatFeed.java    ← Adapter target interface (Pattern 4)
│       │   │   ├── MockThreatFeed.java          (@Profile("mock"))
│       │   │   └── VirusTotalAdapter.java        (@Profile("real"))
│       │   ├── classifier/
│       │   │   ├── ClassificationStrategy.java  ← Strategy interface (Bonus)
│       │   │   ├── RuleBasedStrategy.java        (default / mock)
│       │   │   └── LlmStrategy.java              (@Profile("real"), @Primary)
│       │   └── responder/
│       │       ├── ResponseCommand.java ← Command interface (Pattern 6)
│       │       ├── BlockIpCommand.java
│       │       ├── RevokeSessionCommand.java
│       │       └── ForcePasswordResetCommand.java
│       ├── graph/
│       │   └── KnowledgeGraphService.java  ← Singleton (Pattern 1)
│       ├── model/
│       │   └── IncidentReport.java         ← Builder (Pattern 3)
│       ├── audit/
│       │   ├── Incident.java + IncidentRepository.java
│       │   └── AuditEntry.java + AuditActionRepository.java
│       ├── messaging/
│       │   ├── KafkaTopics.java
│       │   └── EventProducer.java
│       └── api/
│           ├── EventController.java    ← POST /api/events
│           └── WebSocketGateway.java   ← STOMP /topic/events
└── frontend/
    └── src/
        ├── App.jsx
        ├── components/
        │   ├── AlertQueue.jsx          ← live incident list
        │   ├── AgentPipeline.jsx       ← agent activation feed
        │   ├── TopologyMap.jsx         ← D3 IP→user→service graph
        │   ├── ResponseLog.jsx         ← executed response actions
        │   ├── ThreatMatrix.jsx        ← MITRE technique grid
        │   └── SystemMetrics.jsx       ← confidence + timing stats
        └── ws/useWebSocket.js          ← STOMP client hook
```

---

## Kafka Topics

| Topic | Producer | Consumer | Purpose |
|---|---|---|---|
| `raw-events` | REST API | Orchestrator | Incoming normalized security events |
| `agent.anomaly` | Orchestrator | AnomalyDetectionAgent | Task dispatch |
| `agent.threatintel` | Orchestrator | ThreatIntelAgent | Task dispatch |
| `agent.classifier` | Orchestrator | ThreatClassifierAgent | Task dispatch |
| `agent.responder` | Orchestrator | IncidentResponderAgent | Task dispatch |
| `findings` | All agents | Orchestrator | Analysis results back to Orchestrator |
| `responses` | IncidentResponderAgent | AuditWriter, WebSocketGateway | Actions → audit + dashboard |

---

## Viva Q&A

**Q: Why Neo4j instead of PostgreSQL for everything?**  
The core questions are about *relationships and paths* — "trace the lateral movement path from patient zero", "find all services hit by this CVE". Multi-hop traversals are natural in Cypher but slow/awkward as SQL JOINs. PostgreSQL handles flat audit logs where rows, not relationships, are what matter.

**Q: Where is the Observer pattern?**  
At the infrastructure level — Kafka pub/sub IS the Observer pattern. Orchestrator = subject/publisher, agents = observers/subscribers. Total decoupling: agents don't even know each other exist.

**Q: What does the Orchestrator actually decide?**  
Which agents to activate, in what order, and whether combined confidence ≥ 0.92 authorizes the Incident Responder. It never analyzes events itself.

**Q: What's the difference between Factory and Builder?**  
Factory decides *which* object to create. Builder decides *how* to assemble a complex object step by step from parts that arrive at different times.

**Q: How does the Strategy pattern work here?**  
`ThreatClassifierAgent` injects `ClassificationStrategy` by **interface**. In mock mode, Spring finds only `RuleBasedStrategy` → injects it. In real mode, `LlmStrategy` is `@Primary` → injects it instead. The classifier never knows which one it's using. That is the Strategy pattern.

**Q: Why are the Chain of Responsibility handlers logging-only?**  
The handlers log severity classification and escalation tracking. Actual Kafka dispatch is in the Orchestrator's ReAct loop — each concern in its own layer. The pattern is still real: LOW/MEDIUM/HIGH/CRITICAL handlers each do their level's work and pass the finding on, exactly like `AbstractLogger` from Lab 7.

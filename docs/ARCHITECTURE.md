# ARCHITECTURE — SentinelMind

**System Architecture & Technical Design**
Version 1.1

---

## 1. Architectural style

SentinelMind is an **event-driven, multi-agent system** built on three ideas:

1. **Event-driven agent communication** — agents are decoupled and talk only
   through a Kafka event bus. No agent calls another directly.
2. **A shared knowledge graph as the single source of truth** — Neo4j holds every
   entity (IPs, users, CVEs, packages, ATT&CK techniques) and their relationships.
3. **The ReAct reasoning loop as the orchestrator's brain** — Reason → Act →
   Observe → Repeat, until a confidence threshold is met.

## 2. High-level component diagram

```
                         ┌──────────────────────────┐
                         │     React Dashboard       │
                         │  (WebSocket, D3, Recharts)│
                         └────────────▲──────────────┘
                                      │ WebSocket (STOMP)
                         ┌────────────┴──────────────┐
                         │   Spring Boot API Layer    │
                         │  (REST + WebSocket gateway)│
                         └────────────▲──────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                   Apache Kafka (event bus)                 │
        │   topics: raw-events, agent.<name>, findings, responses    │
        └───▲────────▲────────▲────────▲────────▲────────▲───────────┘
            │        │        │        │        │        │
   ┌────────┴──┐ ┌───┴────┐ ┌─┴─────┐ ┌┴──────┐ ┌┴──────┐ ┌┴────────┐
   │Orchestr-  │ │Anomaly │ │Threat │ │Threat │ │Incident│ │ ...other│
   │ ator      │ │Detect. │ │ Intel │ │Classif│ │Responder│ │ agents │
   └────┬──────┘ └───┬────┘ └──┬────┘ └──┬────┘ └──┬─────┘ └────┬────┘
        │            │         │         │         │            │
        └────────────┴─────────┴────┬────┴─────────┴────────────┘
                                     │ read/write
                  ┌──────────────────┼───────────────────┐
                  │                  │                    │
            ┌─────▼─────┐     ┌──────▼──────┐      ┌──────▼──────┐
            │   Neo4j   │     │ PostgreSQL  │      │    Redis    │
            │ knowledge │     │ audit log / │      │   cache     │
            │   graph   │     │ incidents   │      │ (optional)  │
            └───────────┘     └─────────────┘      └─────────────┘
```

## 3. The Orchestrator and the ReAct loop

The Orchestrator never analyzes events itself. It reasons about *which* agents to
activate, in what order, with what context, then merges their findings.

```
  Event arrives ──► REASON: query graph, form hypothesis
                      │
                      ▼
                    ACT: delegate to sub-agent(s) via Kafka
                      │
                      ▼
                  OBSERVE: receive findings, update graph
                      │
                      ▼
              confidence >= 0.92 ? ──no──► loop back to REASON
                      │ yes
                      ▼
              classify severity ──► trigger Incident Responder
```

Implementation notes:
- Use Java 21 virtual threads; use `StructuredTaskScope` to fan out to multiple
  agents in parallel and gather results with clean cancellation.
- Keep a max-iteration cap (e.g. 5) so an inconclusive event can't loop forever.

### 3.1 Confidence score formula (locked for demo reliability)

The confidence score is a weighted combination of three normalized agent scores.
The weights are fixed — do not change them or the demo scenario will not reliably
trigger the Incident Responder.

```
confidence = (anomalyScore × 0.30) + (threatIntelScore × 0.40) + (classifierScore × 0.30)
```

**Score normalization per agent:**

| Agent | Raw output | Normalized score |
|---|---|---|
| Anomaly Detection | z-score value | `min(zScore / 10.0, 1.0)` — z-score of 10+ = 1.0 |
| Threat Intelligence | isMalicious flag + feed count | `feedCount >= 1 ? 1.0 : 0.0` |
| Threat Classifier | ruleMatch boolean | `ruleMatched ? 1.0 : 0.3` |

**Demo scenario walkthrough (must produce ≥ 0.92):**
- Anomaly: z-score = 8.7 → normalized = 0.87 → weighted = 0.87 × 0.30 = **0.261**
- Threat Intel: Tor node confirmed, 4 feeds → score = 1.0 → weighted = 1.0 × 0.40 = **0.400**
- Classifier: T1078 + T1110.004 rule matched → score = 1.0 → weighted = 1.0 × 0.30 = **0.300**
- **Total confidence = 0.961 ✓ (above the 0.92 threshold)**

This must be implemented exactly as specified in
`com.sentinelmind.orchestrator.ConfidenceCalculator`.

## 4. The knowledge graph (Neo4j)

**Why a graph DB and not MySQL/Postgres for this?** Because the core questions are
about *relationships and paths*: "find all services affected by this CVE", "trace
the lateral-movement path from patient zero", "which threat actor is this IP tied
to". Those are multi-hop traversals that are awkward and slow as SQL joins but
natural in a graph. (PostgreSQL is still used — for flat audit logs, where rows,
not relationships, are what matter.)

**Nodes:** IP, User, Service, Host, CVE, Package, ThreatActor, MalwareFamily,
BuildArtifact, AttackTechnique (MITRE), AttackTactic (MITRE).

**Edges:** `EXPLOITS`, `TARGETS`, `COMMUNICATES_WITH`, `IS_VARIANT_OF`,
`AFFECTED_BY`, `DEPLOYED_FROM`, `LATERAL_MOVE_TO`, `MAPS_TO` (finding→technique),
`USED_BY` (technique→actor).

### 4.1 Seed data — demo slice (required for demo to work)

These are the exact nodes and relationships that must exist in Neo4j before the
demo runs. They live in `seed/demo_entities.cypher` and `seed/mitre_attack_seed.cypher`.

**MITRE ATT&CK nodes (mitre_attack_seed.cypher):**
```cypher
// Tactic: Initial Access
CREATE (:AttackTactic {id: 'TA0001', name: 'Initial Access',
  description: 'Attacker tries to get into your network'});

// Tactic: Credential Access
CREATE (:AttackTactic {id: 'TA0006', name: 'Credential Access',
  description: 'Attacker tries to steal account names and passwords'});

// Technique: Valid Accounts (T1078)
CREATE (:AttackTechnique {id: 'T1078', name: 'Valid Accounts',
  tactic: 'TA0001',
  description: 'Adversary uses legitimate credentials to gain access',
  killChainPhase: 'initial-access'});

// Sub-technique: Credential Stuffing (T1110.004)
CREATE (:AttackTechnique {id: 'T1110.004', name: 'Credential Stuffing',
  tactic: 'TA0006',
  description: 'Adversary uses lists of breached credentials to gain access',
  killChainPhase: 'credential-access',
  parentTechnique: 'T1110'});

// Link technique to tactic
MATCH (tac:AttackTactic {id:'TA0001'}), (tech:AttackTechnique {id:'T1078'})
CREATE (tech)-[:BELONGS_TO]->(tac);

MATCH (tac:AttackTactic {id:'TA0006'}), (tech:AttackTechnique {id:'T1110.004'})
CREATE (tech)-[:BELONGS_TO]->(tac);
```

**Demo entities (demo_entities.cypher):**
```cypher
// The victim user — normally logs in from Pakistan, business hours
CREATE (:User {
  id: 'user-001',
  email: 'ahmed@targetcorp.com',
  department: 'Finance',
  typicalCountry: 'PK',
  typicalHourStart: 9,
  typicalHourEnd: 18,
  baselineLoginCount: 245
});

// The attacker's IP — Tor exit node
CREATE (:IP {
  address: '185.220.101.47',
  isTorNode: true,
  country: 'RU',
  reputation: 'MALICIOUS',
  feedCount: 4,
  lastSeen: '2024-01-15'
});

// The target service
CREATE (:Service {
  id: 'svc-auth',
  name: 'AuthService',
  criticality: 'HIGH'
});

// Baseline login behavior for Anomaly Detection agent
// (stored as a property on the user node for the z-score calculation)
MATCH (u:User {id:'user-001'})
SET u.avgLoginHour = 10.5,
    u.stdDevLoginHour = 2.1,
    u.avgLatencyMs = 1850.0,
    u.stdDevLatencyMs = 420.0;
```

**Enhancement (if time):** put a timestamp on every edge so the Forensics agent can
do time-filtered traversals ("connections in the 72h before the alert").

## 5. Event bus (Kafka) — authoritative topic registry

All topic names, producers, consumers, and settings are defined here. Claude Code
must use exactly these names — do not invent new topic names.

| Topic | Producer | Consumer(s) | Partitions | Retention | Purpose |
|---|---|---|---|---|---|
| `raw-events` | REST API / simulate script | Orchestrator | 3 | 7 days | Incoming normalized security events |
| `agent.anomaly` | Orchestrator | AnomalyDetectionAgent | 1 | 1 day | Orchestrator tasks → Anomaly agent |
| `agent.threatintel` | Orchestrator | ThreatIntelAgent | 1 | 1 day | Orchestrator tasks → Threat Intel agent |
| `agent.classifier` | Orchestrator | ThreatClassifierAgent | 1 | 1 day | Orchestrator tasks → Classifier agent |
| `agent.responder` | Orchestrator | IncidentResponderAgent | 1 | 1 day | Orchestrator tasks → Responder agent |
| `findings` | All sub-agents | Orchestrator | 3 | 3 days | Agent analysis results back to Orchestrator |
| `responses` | IncidentResponderAgent | AuditWriter, WebSocketGateway | 3 | 7 days | Executed response actions → audit + dashboard |

**Consumer group IDs** (use exactly these in `@KafkaListener` annotations):
- Orchestrator consuming `raw-events`: `group-id: orchestrator-group`
- AnomalyDetectionAgent consuming `agent.anomaly`: `group-id: anomaly-group`
- ThreatIntelAgent consuming `agent.threatintel`: `group-id: threatintel-group`
- ThreatClassifierAgent consuming `agent.classifier`: `group-id: classifier-group`
- IncidentResponderAgent consuming `agent.responder`: `group-id: responder-group`
- Orchestrator consuming `findings`: `group-id: orchestrator-findings-group`
- AuditWriter consuming `responses`: `group-id: audit-group`
- WebSocketGateway consuming `responses`: `group-id: websocket-group`

This is the **Observer pattern** at the infrastructure level: Orchestrator =
subject/publisher, agents = observers/subscribers.

## 6. Data flow (the demo, step by step)

1. Login event hits `POST /api/events` (or the simulate script) → `raw-events`.
2. Orchestrator consumes it, queries Neo4j for the IP/user → no prior history found.
3. Orchestrator publishes a task to `agent.anomaly`.
4. Anomaly agent computes z-score (unusual country/time/latency) → MEDIUM finding.
5. Orchestrator reads finding, dispatches `agent.threatintel`.
6. Threat Intel: IP is a Tor exit node in 4 feeds → CRITICAL; graph updated.
7. Orchestrator dispatches `agent.classifier`.
8. Classifier maps to T1078 + T1110.004, recognizes kill-chain start; confidence 0.961.
9. Orchestrator (0.961 ≥ 0.92) dispatches `agent.responder`.
10. Responder blocks IP, revokes session, forces reset, notifies → `responses`.
11. Audit writer persists incident + actions to PostgreSQL.
12. WebSocket pushes every step to the dashboard as it happens.

## 7. PostgreSQL schema (authoritative)

These are the only two tables needed for the MVP. Column names here are the
source of truth — `AuditLogRepository` and `IncidentRepository` must match exactly.

```sql
-- Table 1: One row per detected incident
CREATE TABLE incidents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_json      JSONB NOT NULL,           -- the original SecurityEvent that triggered this
    severity        VARCHAR(10) NOT NULL,      -- LOW / MEDIUM / HIGH / CRITICAL
    confidence      DECIMAL(4,3) NOT NULL,     -- e.g. 0.961
    mitre_ids       VARCHAR(100),              -- e.g. 'T1078,T1110.004'
    mitre_names     VARCHAR(200),              -- e.g. 'Valid Accounts,Credential Stuffing'
    reason          TEXT,                      -- human-readable explanation for viva/dashboard
    status          VARCHAR(20) DEFAULT 'OPEN', -- OPEN / CONTAINED / FALSE_POSITIVE
    detected_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    contained_at    TIMESTAMP
);

-- Table 2: One row per response action executed by IncidentResponderAgent
CREATE TABLE audit_actions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id     UUID NOT NULL REFERENCES incidents(id),
    action_type     VARCHAR(50) NOT NULL,      -- BLOCK_IP / REVOKE_SESSION / FORCE_RESET / NOTIFY
    action_description TEXT NOT NULL,          -- human-readable: "Blocked IP 185.220.101.47"
    rollback_token  VARCHAR(200),              -- e.g. "UNBLOCK-185.220.101.47-1705363200000"
    executed_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    executed_by     VARCHAR(50) DEFAULT 'IncidentResponderAgent'
);

-- Index for dashboard queries (most recent incidents first)
CREATE INDEX idx_incidents_detected_at ON incidents(detected_at DESC);
CREATE INDEX idx_audit_incident ON audit_actions(incident_id);
```

## 8. WebSocket message format (authoritative contract)

The Spring Boot backend pushes JSON messages to the React dashboard over STOMP
WebSocket. The dashboard subscribes to `/topic/events`. All messages share a
common envelope — `type` tells the frontend which component to update.

**Subscription endpoint:** `ws://localhost:8080/ws`
**Topic:** `/topic/events`

### Message type: `AGENT_ACTIVATED`
Sent when the Orchestrator dispatches a task to an agent.
```json
{
  "type": "AGENT_ACTIVATED",
  "timestamp": "2024-01-15T23:52:01.234Z",
  "incidentId": "550e8400-e29b-41d4-a716-446655440000",
  "agentName": "AnomalyDetectionAgent",
  "agentStatus": "RUNNING",
  "message": "Analyzing login behavior for ahmed@targetcorp.com"
}
```

### Message type: `FINDING_CREATED`
Sent when an agent publishes its result to the `findings` topic.
```json
{
  "type": "FINDING_CREATED",
  "timestamp": "2024-01-15T23:52:02.891Z",
  "incidentId": "550e8400-e29b-41d4-a716-446655440000",
  "agentName": "AnomalyDetectionAgent",
  "agentStatus": "COMPLETE",
  "severity": "MEDIUM",
  "confidence": 0.261,
  "summary": "Z-score 8.7 — login from RU at 23:52, typical country PK, typical hours 09-18",
  "details": {
    "zScore": 8.7,
    "sourceIp": "185.220.101.47",
    "country": "RU",
    "hour": 23,
    "loginLatencyMs": 312
  }
}
```

### Message type: `INCIDENT_CLASSIFIED`
Sent when the Orchestrator reaches the confidence threshold and classifies the incident.
```json
{
  "type": "INCIDENT_CLASSIFIED",
  "timestamp": "2024-01-15T23:52:05.112Z",
  "incidentId": "550e8400-e29b-41d4-a716-446655440000",
  "severity": "CRITICAL",
  "confidence": 0.961,
  "mitreIds": ["T1078", "T1110.004"],
  "mitreNames": ["Valid Accounts", "Credential Stuffing"],
  "reason": "IP 185.220.101.47 is a known Tor exit node (4 feeds). Login from RU at 23:52 with robotic latency (312ms) deviates 8.7σ from baseline. Matches ransomware initial-access kill chain.",
  "actor": "ahmed@targetcorp.com",
  "sourceIp": "185.220.101.47"
}
```

### Message type: `RESPONSE_EXECUTED`
Sent for each action the Incident Responder takes (one message per action).
```json
{
  "type": "RESPONSE_EXECUTED",
  "timestamp": "2024-01-15T23:52:07.445Z",
  "incidentId": "550e8400-e29b-41d4-a716-446655440000",
  "actionType": "BLOCK_IP",
  "description": "Blocked IP address: 185.220.101.47",
  "rollbackToken": "UNBLOCK-185.220.101.47-1705363927445",
  "success": true
}
```

### Message type: `INCIDENT_CONTAINED`
Sent once when the full playbook completes.
```json
{
  "type": "INCIDENT_CONTAINED",
  "timestamp": "2024-01-15T23:52:08.001Z",
  "incidentId": "550e8400-e29b-41d4-a716-446655440000",
  "totalElapsedMs": 6767,
  "actionsExecuted": 3,
  "message": "Incident contained in 6.8 seconds. 3 response actions executed."
}
```

## 9. Module / package layout (suggested)

```
sentinelmind/
├── docker-compose.yml          ← START HERE on Day 1
├── CLAUDE.md
├── docs/                       (these planning docs)
├── backend/
│   ├── pom.xml
│   └── src/main/java/com/sentinelmind/
│       ├── SentinelMindApplication.java
│       ├── config/             (Kafka, Neo4j, security, websocket config)
│       ├── orchestrator/
│       │   ├── OrchestratorAgent.java
│       │   ├── ReActLoop.java
│       │   ├── ConfidenceCalculator.java   ← implements section 3.1 formula
│       │   └── handlers/                   (Chain of Responsibility)
│       │       ├── AbstractEventHandler.java
│       │       ├── LowSeverityHandler.java
│       │       ├── MediumSeverityHandler.java
│       │       ├── HighSeverityHandler.java
│       │       └── CriticalSeverityHandler.java
│       ├── agents/
│       │   ├── ISecurityAgent.java             (Product interface)
│       │   ├── AgentFactory.java               (Factory Method)
│       │   ├── anomaly/AnomalyDetectionAgent.java
│       │   ├── threatintel/
│       │   │   ├── ThreatIntelAgent.java
│       │   │   ├── IThreatFeed.java             (Adapter target interface)
│       │   │   ├── MockThreatFeed.java          (@Profile("mock"))
│       │   │   └── VirusTotalAdapter.java       (@Profile("real"))
│       │   ├── classifier/
│       │   │   ├── ThreatClassifierAgent.java   (Strategy context)
│       │   │   ├── ClassificationStrategy.java  (Strategy interface)
│       │   │   ├── RuleBasedStrategy.java
│       │   │   └── LlmStrategy.java
│       │   ├── responder/
│       │   │   ├── IncidentResponderAgent.java  (Command invoker)
│       │   │   ├── ResponseCommand.java         (Command interface)
│       │   │   ├── BlockIpCommand.java
│       │   │   ├── RevokeSessionCommand.java
│       │   │   └── ForcePasswordResetCommand.java
│       │   ├── vuln/VulnerabilityScannerAgent.java   (P1)
│       │   ├── forensics/ForensicsAgent.java         (P1)
│       │   └── codesentinel/…                        (P2)
│       ├── graph/KnowledgeGraphService.java    (Singleton)
│       ├── messaging/                          (Kafka producers/consumers, topic constants)
│       │   ├── KafkaTopics.java                (all topic name constants — single source of truth)
│       │   ├── EventProducer.java
│       │   └── FindingsConsumer.java
│       ├── audit/
│       │   ├── IncidentRepository.java         (maps to incidents table)
│       │   └── AuditActionRepository.java      (maps to audit_actions table)
│       ├── model/                              (Event, Finding, Incident, Action DTOs)
│       └── api/
│           ├── EventController.java            (POST /api/events)
│           └── WebSocketController.java        (STOMP /topic/events)
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── components/
│       │   ├── AlertQueue.jsx          (live list of recent incidents)
│       │   ├── AgentActivity.jsx       (shows each agent as it activates)
│       │   ├── IncidentDetail.jsx      (full incident with evidence chain)
│       │   └── TopologyMap.jsx         (D3 graph of IP→user→service)
│       └── ws/
│           └── useWebSocket.js         (STOMP client hook)
└── seed/
    ├── mitre_attack_seed.cypher        (ATT&CK nodes — see section 4.1)
    ├── demo_entities.cypher            (user, IP, service — see section 4.1)
    └── simulate_attack.sh              (see CLAUDE.md for exact spec)
```

## 10. Design patterns — where they live (for the viva)

| Pattern | Lab | File(s) | What to say |
|---|---|---|---|
| **Singleton** | Lab 2 | `graph/KnowledgeGraphService.java` | "Spring @Service creates one instance. All agents share it. Like a school having one principal." |
| **Factory Method** | Lab 3 | `agents/AgentFactory.java` | "Orchestrator says 'give me ANOMALY agent'. Factory returns it. Never uses `new` directly." |
| **Builder** | Lab 4 | `model/IncidentReport.java` | "IncidentReport.Builder assembles the report piece by piece as findings arrive. Like MealBuilder." |
| **Adapter** | Lab 5 | `agents/threatintel/VirusTotalAdapter.java` | "VirusTotal speaks its own language. Adapter translates it into our IThreatFeed interface. Like MediaAdapter." |
| **Chain of Responsibility** | Lab 7 | `orchestrator/handlers/Abstract/Low/Medium/High/CriticalSeverityHandler.java` | "Finding enters at LOW, flows up to CRITICAL. Each handler does its job and passes it on. Like AbstractLogger." |
| **Command** | Lab 7 | `agents/responder/BlockIpCommand.java` etc. | "Each response action is a Command object with execute() and undo(). Responder is the Broker." |
| **Strategy** (bonus) | — | `agents/classifier/RuleBasedStrategy.java`, `LlmStrategy.java` | "Classifier swaps algorithms at runtime. Rule-based by default, LLM for novel patterns." |
| **Observer** (infra) | — | Kafka pub/sub across all agents | "Orchestrator publishes, agents subscribe. The decoupling IS the Observer pattern." |

## 11. Technology stack (fixed)

| Layer | Tech |
|---|---|
| Backend | Java 21 (virtual threads), Spring Boot 3 |
| Concurrency | StructuredTaskScope, CompletableFuture |
| Event bus | Apache Kafka |
| Graph DB | Neo4j (+ Cypher) |
| Relational | PostgreSQL |
| Cache | Redis (optional) |
| AI | LLM API (Claude/GPT) — mockable via Spring profiles |
| Frontend | React 18, WebSocket/STOMP, D3.js, Recharts, TailwindCSS |
| Infra | Docker + Docker Compose |

## 12. Deferred / future architecture (out of MVP)

ChromaDB vector search, Kubernetes deployment, Prometheus/Grafana, threat-hunting
mode, federated multi-tenant intel sharing, explainable-AI audit trail. These are
mentioned in the report's "Future Expansion" section but not built now.

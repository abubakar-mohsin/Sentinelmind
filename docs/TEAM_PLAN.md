# SentinelMind — 3-Day Team Build Plan
**Project:** SE-211L · Software Design & Architecture  
**Team:** 3 People · AI-Assisted Build · ~72 Hours  
**Goal:** One flawless 10-second demo. Everything else is secondary.

---

## Who Does What (Overview)

| Person | Role | Owns |
|---|---|---|
| **You (Captain)** | Person A — The Brain | Orchestrator, Kafka, Neo4j, WebSocket, Docker |
| **Person B** | The Agents | All 4 agents, design patterns, PostgreSQL repositories |
| **Person C** | The Face | React dashboard, WebSocket UI, dark theme, demo button |

> **Rule #1:** Never leave the repo in a broken state. Every commit must compile.  
> **Rule #2:** Person B cannot start until Person A sends them `ISecurityAgent.java` and `KafkaTopics.java` — this happens in the first hour of Day 1.  
> **Rule #3:** Person C only needs the WebSocket message format (ARCHITECTURE.md Section 8) to build the full frontend. Share it immediately Day 1.

---

## PERSON A — Captain (You)

You own the spine of the entire system. If your code breaks, everyone's code breaks. Build in this exact order.

### Day 1 — Foundation

**Hour 1 (do this before anything else):**
- Get `docker compose up` running (the `docker-compose.yml` is already written in your project files)
- Write `ISecurityAgent.java` (10-line interface) — **send to Person B immediately**
- Write `KafkaTopics.java` (constants file with all topic name strings) — **send to Person B immediately**
- Share `ARCHITECTURE.md` Section 8 (WebSocket messages) with Person C — **they can't start without it**

**Rest of Day 1:**
- Kafka wiring: one producer posting to `raw-events`, one consumer logging it
- `KnowledgeGraphService.java` — the Singleton pattern (Lab 2). Spring `@Service` makes it a singleton automatically. Two methods: `query(cypher)` and `saveNode(label, props)`
- Both Neo4j seed scripts: `mitre_attack_seed.cypher` and `demo_entities.cypher` — the exact Cypher from ARCHITECTURE.md Section 4.1. Confirm nodes exist at `localhost:7474`
- `AgentFactory.java` — the Factory Method pattern (Lab 3). Full code is in `DESIGN_PATTERNS.md`
- `ConfidenceCalculator.java` — implement the exact formula: `(anomaly × 0.30) + (threatIntel × 0.40) + (classifier × 0.30)`. Write a unit test: demo values should return 0.961

**End of Day 1 checkpoint:** `docker compose up` works. An event posted to the REST endpoint appears in the Kafka consumer log. Neo4j browser at `localhost:7474` shows the seeded nodes.

### Day 2 — The Brain Comes Alive

- `OrchestratorAgent.java` with the full ReAct loop: consume `raw-events` → query Neo4j → publish to `agent.anomaly` → read `findings` → publish to `agent.threatintel` → continue chain → when confidence ≥ 0.92, publish to `agent.responder`
- Chain of Responsibility handlers: `AbstractEventHandler`, `LowSeverityHandler`, `MediumSeverityHandler`, `HighSeverityHandler`, `CriticalSeverityHandler` — full code is in `DESIGN_PATTERNS.md`
- PostgreSQL: confirm the two tables (`incidents`, `audit_actions`) from ARCHITECTURE.md Section 7 are created by schema migration
- WebSocket gateway: Kafka `responses` topic → STOMP push to `/topic/events`
- End-to-end smoke test: run `simulate_attack.sh`, trace the event through every log

**End of Day 2 checkpoint:** Running `simulate_attack.sh` produces a chain of log entries — Orchestrator → Anomaly → ThreatIntel → Classifier → Responder. Incident written to PostgreSQL.

### Day 3 — Polish and Viva Prep

- Fix bugs from Day 2 smoke test
- Add the `reason` field to every incident: a human-readable sentence explaining exactly why it was classified CRITICAL
- Add plain-English comments to every pattern class (copy from `DESIGN_PATTERNS.md` — each pattern section has the exact comment text already written)
- Write `simulate_attack.sh` exactly as specified in `CLAUDE.md`
- Write the `README.md`: how to run it, table of where each design pattern lives
- Full dry run: time the demo. It must complete under 10 seconds.

**Your viva answers to memorize:**
- "Why Neo4j?" → "Core questions are about relationships and paths — multi-hop traversals are natural in Cypher but awkward as SQL joins"
- "Where is Observer?" → "At the infrastructure level — Kafka pub/sub IS the Observer pattern. Orchestrator publishes, agents subscribe"
- "What does the Orchestrator actually decide?" → "Which agents to activate, in what order, and whether combined confidence ≥ 0.92 to authorize the Incident Responder"

---

## PERSON B — The Agents

You build the four workers that the Orchestrator calls. You can build and unit test each one completely independently — you don't need the Orchestrator running to test your agents.

**You need from Person A on Day 1 morning:**
- `ISecurityAgent.java` — the interface all agents implement
- `KafkaTopics.java` — the topic name constants
- The `IncidentReport.java` model class (you can write this yourself — it's in `DESIGN_PATTERNS.md`)

### Day 1 — Build All 4 Agents (Locally, Without Kafka)

Build each agent with a simple `main()` test — hardcode the demo input and verify the output is correct. Don't wire Kafka yet.

**AnomalyDetectionAgent:**
- Z-score formula: `(value - mean) / stdDeviation`
- Demo user baseline is in `demo_entities.cypher`: `avgLoginHour=10.5`, `stdDevLoginHour=2.1`, `avgLatencyMs=1850.0`, `stdDevLatencyMs=420.0`
- Input: hour=23, latencyMs=312, country=RU (vs typical PK)
- Expected output: z-score ≈ 8.7, severity = MEDIUM, normalized score = 0.87

**ThreatIntelAgent + Adapter Pattern (Lab 5):**
- `IThreatFeed.java` — the interface (one method: `checkIp(String ip)`)
- `MockThreatFeed.java` — hardcoded Set of bad IPs including `185.220.101.47`
- `VirusTotalAdapter.java` — even if never called in demo, write this class. The teacher WILL ask about the Adapter pattern
- Test: pass `185.220.101.47` into MockThreatFeed → expect CRITICAL result with "Known Tor exit node, 4 feeds"

**ThreatClassifierAgent + Strategy Pattern (Bonus):**
- `ClassificationStrategy.java` — the interface
- `RuleBasedStrategy.java` — the 5-line rule: Tor IP + hour ≥ 22 or ≤ 6 + latency < 500ms → T1078 + T1110.004, confidence = 1.0
- `LlmStrategy.java` — write it, mark it `@Profile("real")`, even if the LLM call is mocked
- Test: pass demo values → expect ["T1078", "T1110.004"], ["Valid Accounts", "Credential Stuffing"]

**IncidentResponderAgent + Command Pattern (Lab 7):**
- `ResponseCommand.java` — interface with `execute()`, `undo()`, `describe()`
- `BlockIpCommand.java`, `RevokeSessionCommand.java`, `ForcePasswordResetCommand.java`
- `IncidentResponderAgent.java` — the Broker: `addCommand()` + `executePlaybook(incidentId)`
- Full code for all of these is in `DESIGN_PATTERNS.md` — it is essentially ready to paste

**Also build:**
- `IncidentReport.java` with inner Builder class (Lab 4) — full code in `DESIGN_PATTERNS.md`
- `AuditActionRepository.java` and `IncidentRepository.java` — Spring Data JPA, map to the exact column names in ARCHITECTURE.md Section 7

**End of Day 1 checkpoint:** Each agent has a passing unit test with the demo input values.

### Day 2 — Wire to Kafka

- Add `@KafkaListener` annotations to each agent. Use the exact group IDs from ARCHITECTURE.md Section 5
- Each agent consumes from its topic, does its analysis, publishes a `Finding` to the `findings` topic
- `IncidentResponderAgent` consumes from `agent.responder`, executes the playbook, publishes each action to `responses`, writes each action to PostgreSQL via `AuditActionRepository`

**End of Day 2 checkpoint:** When Orchestrator publishes to `agent.anomaly`, AnomalyDetectionAgent receives it, computes z-score, publishes finding. Verify in logs.

### Day 3 — Bonus Agents (Only If Time Permits)

> **Cut-line rule:** If Day 2 wiring is still buggy, fix that first. Do NOT start bonus agents with broken core agents.

**VulnerabilityScannerAgent (P1):** Accept a package name + version string. Return 1-2 hardcoded CVEs from the seeded Neo4j data. This is 50 lines of code.

**ForensicsAgent (P1):** Run one Cypher traversal query on Neo4j for a given incident ID — return a timeline of events. The query is essentially: "find all nodes connected to this IP in the last 24 hours."

**Your viva answers to memorize:**
- "What is the Builder pattern for?" → "IncidentReport has 9 fields arriving at different times from different agents. Builder lets the Orchestrator add each piece as it arrives. Same as MealBuilder from Lab 4."
- "What is the Adapter for?" → "VirusTotal speaks its own API format. VirusTotalAdapter translates it into our IThreatFeed interface. ThreatIntelAgent never knows which one is behind it. Like MediaAdapter from Lab 5."
- "What is the Command pattern for?" → "Each response action is a Command object with execute() and undo(). This lets us log every action to PostgreSQL with a rollback token, and theoretically undo them. Like BuyStock/SellStock + Broker from Lab 7."

---

## PERSON C — The Face

You own everything the teacher sees first. A beautiful dashboard running live makes a 10x impression over a terminal window. Start from Day 1 — you do not need the backend to be running to build the UI.

**You need from Person A:**
- ARCHITECTURE.md Section 8 (the WebSocket message format — all 5 message types defined with exact JSON)

### Day 1 — Build the Full UI Against Mock Data

Scaffold the React 18 project with TailwindCSS dark theme. Build every component with hardcoded mock data first — this way you can see and polish the UI immediately without waiting for the backend.

**`useWebSocket.js`:** STOMP client hook. Subscribe to `/topic/events`. Even if the backend isn't up yet, write the hook — it will just fail silently and you'll connect it on Day 3.

**`AlertQueue.jsx`:** Live scrolling list of recent incidents. Each row shows: timestamp, actor email, source IP, severity badge (red=CRITICAL, orange=HIGH, yellow=MEDIUM, green=LOW), status (OPEN/CONTAINED). Mock it with 3-4 hardcoded rows first.

**`AgentActivity.jsx`:** This is the most visually impressive component and the heart of the demo. Shows the 4 agents as cards in a row. As each agent activates (on `AGENT_ACTIVATED` messages), its card lights up with a pulsing green border. When it completes (`FINDING_CREATED`), it shows its result summary. Mock this by cycling through all 4 agents lighting up on a timer.

**`IncidentDetail.jsx`:** When you click an incident in AlertQueue, this panel shows the full detail: MITRE technique IDs and names, confidence score as a percentage bar, the `reason` string (the human-readable explanation), and a list of response actions taken with their rollback tokens.

**`TopologyMap.jsx`:** A D3 force graph with 3 nodes: a red IP node (`185.220.101.47`), a user node (`ahmed@targetcorp.com`), and a service node (`AuthService`). During the demo, the IP node flashes red. Even this simple graph looks extremely professional.

**End of Day 1 checkpoint:** The React app runs at `localhost:3000`. All four components render with mock data. The AgentActivity mock animation cycles through all 4 agents lighting up.

### Day 2 — Wire to Real Backend

- Wire `useWebSocket.js` to the real STOMP endpoint. Test with `simulate_attack.sh`.
- Wire `AlertQueue.jsx` to receive `INCIDENT_CLASSIFIED` messages
- Wire `AgentActivity.jsx` to receive `AGENT_ACTIVATED` and `FINDING_CREATED` messages
- Wire `IncidentDetail.jsx` to receive `INCIDENT_CONTAINED` and `RESPONSE_EXECUTED` messages

**End of Day 2 checkpoint:** Run simulate script. Watch the dashboard update live. Each agent card lights up in sequence.

### Day 3 — Polish Until It Looks Stunning

- Add a **"Simulate Attack" button** directly on the dashboard. It calls `POST http://localhost:8080/api/events` with the demo payload. This is far more impressive than running a shell script during the demo.
- Add a timer to `AgentActivity.jsx` — show elapsed milliseconds as each agent completes. The final `INCIDENT_CONTAINED` message should show "Contained in X.X seconds" prominently.
- Make the topology map node pulse red and draw a red edge during the attack
- Add a "SYSTEM ALERT" banner that appears at the top of the screen during a CRITICAL incident
- Make severity badges have subtle pulsing animations
- Record a backup video of the complete demo working

**Your viva answers to memorize:**
- "How does the dashboard know what's happening?" → "WebSocket (STOMP protocol). The backend pushes JSON messages on every agent activation. No polling, purely event-driven. React updates state and re-renders in real time."
- "What framework did you use?" → "React 18 with TailwindCSS. WebSocket connection via the STOMP.js library. D3.js for the topology graph."

---

## Shared Rules (Everyone Follows These)

**Communication:**
- Person A broadcasts `ISecurityAgent.java` and `KafkaTopics.java` in the first hour of Day 1. No exceptions.
- Any change to the WebSocket message format (ARCHITECTURE.md Section 8) must be announced to Person C immediately.
- Any change to the Kafka topic names must be announced to Person B immediately.

**Claude Code usage (your AI teammate):**
- Don't ask it "how should I design X" — the design is already done in your docs. Ask it "implement this class exactly as shown in DESIGN_PATTERNS.md Section X"
- Give it the exact spec, not a vague description. The more specific you are, the faster it works.
- After every Claude Code session: compile and run. Commit only if it compiles.

**Cut-line rule (from ROADMAP.md):**
If something is broken at the end of Day 2, fix it before adding anything new. A working demo with 4 agents beats a broken system with 11 half-built agents.

---

## Design Patterns — Who Writes What

| Pattern | Lab | Class | Owner |
|---|---|---|---|
| Singleton | Lab 2 | `KnowledgeGraphService.java` | **Person A** |
| Factory Method | Lab 3 | `AgentFactory.java` | **Person A** |
| Builder | Lab 4 | `IncidentReport.Builder` | **Person B** |
| Adapter | Lab 5 | `VirusTotalAdapter.java` | **Person B** |
| Chain of Responsibility | Lab 7 | `AbstractEventHandler` chain | **Person A** |
| Command | Lab 7 | `BlockIpCommand` etc. | **Person B** |
| Strategy (Bonus) | — | `RuleBasedStrategy` / `LlmStrategy` | **Person B** |

All pattern code is fully written out in `DESIGN_PATTERNS.md` — it is essentially copy-paste + adapting to your project structure.

---

## Demo Script (Practice This Until Automatic)

1. Open browser: `localhost:3000` — dashboard is visible
2. Say: *"This is SentinelMind. It detects and contains cyber attacks autonomously."*
3. Click the **"Simulate Attack"** button on the dashboard
4. Point to AgentActivity: *"Watch the agents activate in sequence"*
5. Anomaly card lights up → *"Anomaly Detection flags a login at 11:52 PM from Russia — 8.7 standard deviations from this user's normal behavior"*
6. ThreatIntel card lights up → *"Threat Intelligence confirms the IP is a known Tor exit node from 4 different threat feeds"*
7. Classifier card lights up → *"Threat Classifier maps this to MITRE ATT&CK T1078 and T1110.004 — credential stuffing"*
8. Responder card lights up → *"Incident Responder automatically blocks the IP, revokes the session, forces a password reset"*
9. "INCIDENT CONTAINED" banner appears → *"Total time: under 10 seconds. No human intervention required."*
10. Click the incident in AlertQueue → show IncidentDetail with the full evidence chain
11. Say: *"Every action is logged immutably to PostgreSQL with a rollback token."*

**Total demo time: 60-90 seconds.**

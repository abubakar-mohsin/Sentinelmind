# DESIGN_PATTERNS_UPDATED.md — SentinelMind

> **Status:** Generated from the actual source code on 2026-06-18.
> Every class name, method signature, file path, and code excerpt in this
> document was verified directly from the compiled Java source files.
> Do not confuse this with `DESIGN_PATTERNS.md`, which shows intended design.
> This file shows what is actually built and running.

---

## Quick summary

| # | Pattern | Category | Lab | Class | Status |
|---|---|---|---|---|---|
| 1 | Singleton | Creational | Lab 2 | `KnowledgeGraphService` | ✅ Implemented |
| 2 | Factory Method | Creational | Lab 3 | `AgentFactory` | ✅ Implemented |
| 3 | Builder | Creational | Lab 4 | `IncidentReport.Builder` | ✅ Implemented |
| 4 | Adapter | Structural | Lab 5 | `VirusTotalAdapter` | ✅ Implemented |
| 5 | Chain of Responsibility | Behavioral | Lab 7 | `AbstractEventHandler` chain | ✅ Implemented |
| 6 | Command | Behavioral | Lab 7 | `BlockIpCommand`, `RevokeSessionCommand`, `ForcePasswordResetCommand` | ✅ Implemented |
| 7 | Strategy | Behavioral | Bonus | `LlmStrategy` / `RuleBasedStrategy` | ✅ Implemented |
| — | Observer | Behavioral | Infra | Kafka pub/sub (`@KafkaListener`) | ✅ Infrastructure-level |

---

## Pattern 1 — Singleton
**Category:** Creational | **Lab:** Lab 2 | **Status:** ✅ Mandatory

### What it is in plain English
A Singleton ensures only ONE object of a class ever exists in the entire application.
No matter how many places ask for it, they all get the same shared instance back.

### The problem it solves here
Every agent needs to query or write to the Neo4j knowledge graph.
Without Singleton, each agent would open its own database connection — 8+ connections wasting memory and risking write conflicts.
With Singleton, there is exactly ONE `Driver` connection shared by all.

### File
`backend/src/main/java/com/sentinelmind/graph/KnowledgeGraphService.java`

### How Spring implements it
`@Service` is Spring's Singleton annotation. Spring Boot creates exactly one bean per `@Service` class and reuses it everywhere it is injected. This is the standard Spring idiom for the Singleton pattern — no manual `getInstance()` needed.

### Actual class declaration
```java
@Service
public class KnowledgeGraphService {

    private final Driver driver;

    public KnowledgeGraphService(Driver driver) {   // Spring injects the Neo4j Driver
        this.driver = driver;
    }
```

### Real public API (every method that exists in the source)
| Method | Purpose |
|---|---|
| `query(String cypher)` | Run a read-only Cypher query, return `List<Map<String,Object>>` |
| `query(String cypher, Map<String,Object> params)` | Parameterized version of above |
| `queryOne(String cypher)` | Return first row or `null` |
| `queryOne(String cypher, Map<String,Object> params)` | Parameterized version |
| `saveNode(String label, Map<String,Object> props)` | `CREATE` a node |
| `runCypher(String cypher)` | Write query, no return value |
| `runCypher(String cypher, Map<String,Object> params)` | Parameterized write |
| `execute(String cypher, Map<String,Object> params)` | Alias for `runCypher` with params |
| `createIncidentNode(String incidentId, String severity, double confidence, String status)` | `MERGE` an Incident node |
| `linkIncidentToUser(String incidentId, String userEmail)` | `MERGE (i)-[:TARGETS]->(u)` |
| `linkIncidentToIp(String incidentId, String ipAddress)` | `MERGE (i)-[:INVOLVES_IP]->(ip)` |
| `linkIncidentToTechnique(String incidentId, String techniqueId)` | `MERGE (i)-[:USES_TECHNIQUE]->(t)` |
| `markIpBlocked(String ipAddress)` | `SET ip.blocked = true` |
| `markIncidentContained(String incidentId)` | `SET i.status = 'CONTAINED'` |
| `getFullGraph()` | Returns `{nodes:[...], edges:[...]}` for D3 visualization |
| `getIncidentSubgraph(String incidentId)` | 3-hop subgraph from one incident |
| `getBlastRadius(String userEmail)` | All assets reachable from a user |

### What to say in the viva
> "KnowledgeGraphService is our Singleton. Spring's `@Service` creates exactly one bean
> and injects the same object everywhere. All 8 agents that need the knowledge graph
> call the same `KnowledgeGraphService` object. This is exactly like Lab 2 — one instance,
> shared by everyone, created once at startup."

---

## Pattern 2 — Factory Method
**Category:** Creational | **Lab:** Lab 3 | **Status:** ✅ Mandatory

### What it is in plain English
A Factory is a class whose single job is to CREATE or RESOLVE other objects.
The caller asks for an object by type name; the factory returns the right thing.
The caller never uses `new` on the target class directly.

### The problem it solves here
The Orchestrator needs to dispatch four different agents (Anomaly, ThreatIntel, Classifier, Responder) and must know each agent's Kafka topic to send events to it.
Without a Factory, the Orchestrator would contain hardcoded `if/else` blocks and be tightly coupled to every agent class.
With the Factory, it calls `agentFactory.getAgent("ANOMALY")` and gets back the agent bean AND its Kafka topic in one call.

### File
`backend/src/main/java/com/sentinelmind/agents/AgentFactory.java`

### Key implementation detail vs. the design doc
The actual `AgentFactory` returns an `AgentRegistration` record (not just `ISecurityAgent`) so the Orchestrator can get the Kafka topic alongside the agent reference.
This is MORE than the design doc described — the factory is a full agent registry.

### Actual class declaration
```java
@Component
public class AgentFactory {

    // AgentRegistration bundles everything the Orchestrator needs to dispatch to an agent
    public record AgentRegistration(
        String type,
        ISecurityAgent agent,
        String kafkaTopic
    ) {}

    private final Map<String, AgentRegistration> registry = new LinkedHashMap<>();

    public AgentFactory(AnomalyDetectionAgent anomalyAgent,
                        ThreatIntelAgent threatIntelAgent,
                        ThreatClassifierAgent classifierAgent,
                        IncidentResponderAgent responderAgent) {

        registry.put("ANOMALY",      new AgentRegistration("ANOMALY",      anomalyAgent,    KafkaTopics.AGENT_ANOMALY));
        registry.put("THREAT_INTEL", new AgentRegistration("THREAT_INTEL", threatIntelAgent, KafkaTopics.AGENT_THREATINTEL));
        registry.put("CLASSIFIER",   new AgentRegistration("CLASSIFIER",   classifierAgent,  KafkaTopics.AGENT_CLASSIFIER));
        registry.put("RESPONDER",    new AgentRegistration("RESPONDER",    responderAgent,   KafkaTopics.AGENT_RESPONDER));
    }

    public AgentRegistration getAgent(String agentType) {
        AgentRegistration reg = registry.get(agentType.toUpperCase());
        if (reg == null) throw new IllegalArgumentException("Unknown agent type: " + agentType);
        return reg;
    }

    public String getAgentTopic(String agentType) { return getAgent(agentType).kafkaTopic(); }

    public Set<String> getRegisteredTypes() { return Collections.unmodifiableSet(registry.keySet()); }
}
```

### How the Orchestrator uses it
```java
// The Orchestrator never uses "new AnomalyDetectionAgent()" directly.
// It always goes through the factory, which returns the registration record:
AgentFactory.AgentRegistration anomalyReg = agentFactory.getAgent("ANOMALY");
eventProducer.publishToAgent(anomalyReg.kafkaTopic(), event);  // sends to Kafka topic
```

### What to say in the viva
> "AgentFactory is our Factory pattern from Lab 3. The Orchestrator asks for an agent
> by name — 'ANOMALY', 'THREAT_INTEL', 'CLASSIFIER', 'RESPONDER' — and the factory
> returns an `AgentRegistration` record containing both the agent bean and its Kafka topic.
> The Orchestrator never calls `new` on any agent class directly.
> This is like ShapeFactory from Lab 3 — pass a type string, get the right object."

---

## Pattern 3 — Builder
**Category:** Creational | **Lab:** Lab 4 | **Status:** ✅ Mandatory

### What it is in plain English
Builder constructs a complex object piece by piece instead of passing everything to one giant constructor.
Each setter returns `this` so calls can be chained fluently.
`build()` at the end produces the final immutable object.

### The problem it solves here
An `IncidentReport` has 14 fields. They arrive at different times from different agents:
- `anomalyScore` arrives after Anomaly Detection Agent runs
- `threatIntelResult` arrives after Threat Intel Agent runs
- `mitreIds` arrives after Threat Classifier Agent runs

You cannot pass all 14 to a constructor because you don't have them all upfront.
The Builder lets the Orchestrator add each piece as it arrives, then call `build()`.

### File
`backend/src/main/java/com/sentinelmind/model/IncidentReport.java`

### Actual class declaration (abbreviated)
```java
public class IncidentReport {

    // All fields are final — the object is immutable once built
    private final String incidentId;
    private final SecurityEvent triggeringEvent;
    private final double anomalyScore;
    private final String anomalySummary;
    private final double threatIntelScore;
    private final String threatIntelSummary;
    private final String threatIntelResult;
    private final double classifierScore;
    private final List<String> mitreIds;       // unmodifiable after build()
    private final List<String> mitreNames;     // unmodifiable after build()
    private final double confidenceScore;
    private final String severity;
    private final String reason;
    private final List<String> responseActions;
    private final long detectedAt;

    private IncidentReport(Builder builder) { /* copies all fields */ }

    public static Builder builder() { return new Builder(); }  // static factory entry point

    public static class Builder {

        // All fields are mutable during assembly
        private String incidentId;
        private SecurityEvent triggeringEvent;
        // ... (14 fields total) ...
        private List<String> mitreIds     = new ArrayList<>();
        private List<String> mitreNames   = new ArrayList<>();
        private List<String> responseActions = new ArrayList<>();
        private long detectedAt = System.currentTimeMillis();

        public Builder incidentId(String id)               { this.incidentId = id;              return this; }
        public Builder triggeringEvent(SecurityEvent e)    { this.triggeringEvent = e;          return this; }
        public Builder anomalyScore(double score)          { this.anomalyScore = score;         return this; }
        public Builder anomalySummary(String s)            { this.anomalySummary = s;           return this; }
        public Builder threatIntelScore(double score)      { this.threatIntelScore = score;     return this; }
        public Builder threatIntelSummary(String s)        { this.threatIntelSummary = s;       return this; }
        public Builder threatIntelResult(String r)         { this.threatIntelResult = r;        return this; }
        public Builder classifierScore(double score)       { this.classifierScore = score;      return this; }
        public Builder mitreIds(List<String> ids)          { this.mitreIds = new ArrayList<>(ids); return this; }
        public Builder mitreNames(List<String> names)      { this.mitreNames = new ArrayList<>(names); return this; }
        public Builder confidenceScore(double score)       { this.confidenceScore = score;      return this; }
        public Builder severity(String severity)           { this.severity = severity;          return this; }
        public Builder reason(String reason)               { this.reason = reason;              return this; }
        public Builder addResponseAction(String action)    { this.responseActions.add(action);  return this; }

        // composeReason() runs automatically if no explicit reason was set
        private String composeReason() { /* builds human-readable summary from all fields */ }

        public IncidentReport build() {
            if (incidentId == null) throw new IllegalStateException("incidentId is required");
            if (triggeringEvent == null) throw new IllegalStateException("triggeringEvent is required");
            if (this.reason == null || this.reason.isEmpty()) this.reason = composeReason();
            return new IncidentReport(this);
        }
    }
}
```

### How the Orchestrator uses it (actual code from OrchestratorAgent.java)
```java
// Builder created at start of investigation with only the mandatory fields
IncidentReport.Builder reportBuilder = IncidentReport.builder()
        .incidentId(incidentId)
        .triggeringEvent(event);

// ... anomaly agent runs ...
reportBuilder.anomalyScore(anomalyFinding.getZScore())
             .anomalySummary(anomalyFinding.getSummary());

// ... threat intel agent runs ...
reportBuilder.threatIntelResult(threatFinding.getSummary())
             .threatIntelScore(threatFinding.getConfidence())
             .threatIntelSummary(threatFinding.getSummary());

// ... classifier agent runs ...
reportBuilder.classifierScore(classifierFinding.getConfidence())
             .mitreIds(mitreIds)
             .mitreNames(mitreNames);

// Final fields added just before build()
reportBuilder.confidenceScore(confidence)
             .severity(finalSeverity)
             .addResponseAction("Blocked IP: " + event.getSourceIp())
             .addResponseAction("Revoked session for: " + event.getActor());

// Build the final immutable object
IncidentReport report = reportBuilder.build();
```

### What to say in the viva
> "IncidentReport uses the Builder pattern from Lab 4. A complete incident has 14 fields
> that arrive at different times from different agents. Instead of a constructor with 14
> parameters, we have a Builder. The Orchestrator creates the Builder at the start with
> just the incidentId and event, then adds anomaly score, threat intel, MITRE mappings,
> and confidence as each agent reports back. `build()` at the end validates the required
> fields and returns the final immutable report. Same idea as MealBuilder from Lab 4."

---

## Pattern 4 — Adapter
**Category:** Structural | **Lab:** Lab 5 | **Status:** ✅ Mandatory

### What it is in plain English
An Adapter makes two incompatible interfaces work together.
The caller knows only a target interface. The Adapter implements that interface but
internally delegates to a completely different class that speaks a different "language."

### The problem it solves here
`ThreatIntelAgent` needs to check if an IP is malicious. There are two possible sources:
1. **MockThreatFeed** — a hardcoded `Set<String>` of known-bad IPs for the demo
2. **VirusTotalAdapter** — the real VirusTotal REST API with its own response format

Both must present the same interface to the agent. `VirusTotalAdapter` translates
VirusTotal's `maliciousVotes` count into our standard `ThreatResult` format.

The agent also supports **runtime switching** between mock and real feeds via a dashboard toggle backed by `ThreatIntelConfigService` — no restart required.

### Files
```
backend/src/main/java/com/sentinelmind/agents/threatintel/IThreatFeed.java
backend/src/main/java/com/sentinelmind/agents/threatintel/MockThreatFeed.java
backend/src/main/java/com/sentinelmind/agents/threatintel/VirusTotalAdapter.java
backend/src/main/java/com/sentinelmind/agents/threatintel/ThreatIntelAgent.java
```

### IThreatFeed — the common interface
```java
// IThreatFeed — Adapter target interface (Lab 5)
// "MediaPlayer" from Lab 5 — ThreatIntelAgent ONLY knows about this interface.
public interface IThreatFeed {
    ThreatResult checkIp(String ipAddress);
}
```

### MockThreatFeed — @Primary default implementation
```java
@Component
@Primary
public class MockThreatFeed implements IThreatFeed {

    private static final Set<String> BAD_IPS = Set.of(
        "185.220.101.47",  // Credential Stuffing + Account Takeover — primary demo IP
        "45.33.32.156",    // Brute Force
        "192.168.1.45",    // Insider Threat
        "8.8.8.8",         // Impossible Travel
        "10.0.0.99"        // Impersonation
    );

    @Override
    public ThreatResult checkIp(String ipAddress) {
        if (BAD_IPS.contains(ipAddress)) {
            return ThreatResult.builder()
                    .severity("CRITICAL").isMalicious(true).feedCount(4).isTorNode(true)
                    .description("Known malicious IP — appears in 4 threat feeds").build();
        }
        return ThreatResult.builder()
                .severity("CLEAN").isMalicious(false).feedCount(0).isTorNode(false)
                .description("No threats found").build();
    }
}
```

### VirusTotalAdapter — THE ADAPTER
```java
@Component
public class VirusTotalAdapter implements IThreatFeed {

    private final VirusTotalApiClient virusTotalClient;

    public VirusTotalAdapter(VirusTotalApiClient virusTotalClient) {
        this.virusTotalClient = virusTotalClient;
    }

    @Override
    public ThreatResult checkIp(String ipAddress) {
        VirusTotalResponse vtResponse = virusTotalClient.getIpReport(ipAddress);  // VirusTotal's format

        // TRANSLATE: VirusTotal's maliciousVotes → our standard ThreatResult
        boolean malicious   = vtResponse.getMaliciousVotes() > 5;
        String  description = "VirusTotal: " + vtResponse.getMaliciousVotes()
                            + " engines flagged this IP as malicious";

        return ThreatResult.builder()
                .severity(malicious ? "CRITICAL" : "CLEAN")
                .isMalicious(malicious)
                .feedCount(vtResponse.getMaliciousVotes())
                .isTorNode(false)  // VirusTotal does not expose Tor status directly
                .description(description).build();
    }
}
```

### How ThreatIntelAgent uses the Adapter at runtime
```java
@Component
public class ThreatIntelAgent implements ISecurityAgent {

    // Both feeds are always injected — @Qualifier distinguishes them
    private final IThreatFeed mockFeed;
    private final IThreatFeed realFeed;
    private final ThreatIntelConfigService configService;

    public ThreatIntelAgent(
            @Qualifier("mockThreatFeed")    IThreatFeed mockFeed,
            @Qualifier("virusTotalAdapter") IThreatFeed realFeed,
            ThreatIntelConfigService configService,
            EventProducer eventProducer) { ... }

    // Dashboard toggle switches mode at runtime without restart
    private IThreatFeed getActiveFeed() {
        return configService.isUsingMock() ? mockFeed : realFeed;
    }

    @Override
    public Finding process(SecurityEvent event) {
        ThreatResult result = getActiveFeed().checkIp(event.getSourceIp());
        // Agent doesn't care whether it just called Mock or VirusTotal
        ...
    }
}
```

### What to say in the viva
> "VirusTotalAdapter is our Adapter pattern from Lab 5. `IThreatFeed` is our MediaPlayer
> interface — `ThreatIntelAgent` only knows `checkIp(ip)`. MockThreatFeed checks a
> hardcoded Set. VirusTotalAdapter wraps the real VirusTotal API, translating its vote
> count into our `ThreatResult` format. The agent doesn't know which one runs —
> it's switched at runtime by a dashboard toggle. Identical to MediaAdapter from Lab 5."

---

## Pattern 5 — Chain of Responsibility
**Category:** Behavioral | **Lab:** Lab 7 | **Status:** ✅ Mandatory

### What it is in plain English
A Chain of Responsibility is a sequence of handlers. A request passes down the chain.
Each handler either acts (if the request matches its level) and then forwards to the next.
No handler "swallows" the event — every matching handler runs.

### The problem it solves here
After all agents have reported, the Orchestrator needs to take different actions at different severity levels:
- **LOW** — always log the finding to the audit trail
- **MEDIUM** — query Neo4j for prior incidents involving this IP
- **HIGH** — check for active campaign correlation in Neo4j, broadcast CAMPAIGN_ALERT
- **CRITICAL** — broadcast CRITICAL_ALERT to the dashboard

One method call `handlerChain.handle(finding)` triggers all applicable levels automatically.

### Files
```
backend/src/main/java/com/sentinelmind/orchestrator/handlers/AbstractEventHandler.java
backend/src/main/java/com/sentinelmind/orchestrator/handlers/LowSeverityHandler.java
backend/src/main/java/com/sentinelmind/orchestrator/handlers/MediumSeverityHandler.java
backend/src/main/java/com/sentinelmind/orchestrator/handlers/HighSeverityHandler.java
backend/src/main/java/com/sentinelmind/orchestrator/handlers/CriticalSeverityHandler.java
backend/src/main/java/com/sentinelmind/orchestrator/handlers/HandlerChainConfig.java
```

### AbstractEventHandler — the base class
```java
// AbstractEventHandler — Chain of Responsibility base class (Lab 7)
// This is our AbstractLogger from Lab 7.
public abstract class AbstractEventHandler {

    public static final int LOW      = 1;
    public static final int MEDIUM   = 2;
    public static final int HIGH     = 3;
    public static final int CRITICAL = 4;

    protected int handlerLevel;
    protected AbstractEventHandler nextHandler;

    public void setNextHandler(AbstractEventHandler next) { this.nextHandler = next; }

    public void handle(Finding finding) {
        if (this.handlerLevel <= finding.getSeverityLevel()) {
            process(finding);  // this handler does its work
        }
        if (nextHandler != null) {
            nextHandler.handle(finding);  // always forward up the chain
        }
    }

    protected abstract void process(Finding finding);
}
```

### What each handler actually does (from source)

| Handler | Level | Actual behaviour in `process()` |
|---|---|---|
| `LowSeverityHandler` | LOW = 1 | `log.info("[AUDIT] severity={} sourceIp={}...")` — structured SLF4J audit log |
| `MediumSeverityHandler` | MEDIUM = 2 | Cypher query for prior victims from this IP in Neo4j; sets `finding.setPriorIncidentCount(n)` |
| `HighSeverityHandler` | HIGH = 3 | Cypher query for related incidents in last 30 days sharing the same MITRE technique; broadcasts `CAMPAIGN_ALERT` via WebSocket if `relatedIncidents > 1` |
| `CriticalSeverityHandler` | CRITICAL = 4 | Broadcasts `CRITICAL_ALERT` via WebSocket (`type`, `severity`, `sourceIp`, `actor`, `message`, `timestamp`) |

### HandlerChainConfig — wires the chain
```java
@Configuration
public class HandlerChainConfig {

    @Bean
    @Primary  // @Primary because Low/Medium/High/Critical are also @Component beans of the same type
    public AbstractEventHandler severityHandlerChain() {
        lowHandler.setNextHandler(mediumHandler);
        mediumHandler.setNextHandler(highHandler);
        highHandler.setNextHandler(criticalHandler);
        return lowHandler;  // Orchestrator injects the HEAD of the chain
    }
}
```

### How the Orchestrator uses it
```java
// OrchestratorAgent.java — single call processes all levels
handlerChain.handle(finalFinding);
// LOW fires always → MEDIUM if severity >= MEDIUM → HIGH if >= HIGH → CRITICAL if CRITICAL
```

### What to say in the viva
> "Chain of Responsibility is from Lab 7 — it's our `AbstractLogger` structure.
> `LowSeverityHandler` matches everything (logs it all). `MediumSeverityHandler` queries
> Neo4j for prior victims. `HighSeverityHandler` checks for active campaigns.
> `CriticalSeverityHandler` fires the dashboard alert. The Orchestrator calls
> `handlerChain.handle(finding)` once and all matching levels fire automatically.
> `HandlerChainConfig` wires the chain and the bean is `@Primary` so Spring injects it."

---

## Pattern 6 — Command
**Category:** Behavioral | **Lab:** Lab 7 | **Status:** ✅ Mandatory

### What it is in plain English
Command wraps an action inside an object. Instead of calling a method directly, you create
a `Command` object that knows how to execute (and optionally undo) that action.
The Invoker collects commands and fires them in order, logging each one.

### The problem it solves here
When the Orchestrator authorizes a response (confidence ≥ 0.92), the `IncidentResponderAgent`
must execute three actions: block the IP, revoke the session, force a password reset.
Each action must be logged to PostgreSQL with a rollback token in case the incident
turns out to be a false positive.
Wrapping each action as a Command object gives this for free.

### Files
```
backend/src/main/java/com/sentinelmind/agents/responder/ResponseCommand.java
backend/src/main/java/com/sentinelmind/agents/responder/BlockIpCommand.java
backend/src/main/java/com/sentinelmind/agents/responder/RevokeSessionCommand.java
backend/src/main/java/com/sentinelmind/agents/responder/ForcePasswordResetCommand.java
backend/src/main/java/com/sentinelmind/agents/responder/IncidentResponderAgent.java
```

### ResponseCommand — the interface
```java
// ResponseCommand — Command interface (Lab 7) — "Order" from Lab 7
public interface ResponseCommand {
    void execute();   // perform the action
    void undo();      // reverse it (if the incident was a false positive)
    String describe(); // human-readable text logged to PostgreSQL
}
```

### Concrete Commands
```java
// BlockIpCommand — "BuyStock" from Lab 7
public class BlockIpCommand implements ResponseCommand {
    private final String ipAddress;
    private final String rollbackToken;  // "UNBLOCK-{ip}-{timestamp}"

    public BlockIpCommand(String ipAddress) {
        this.ipAddress     = ipAddress;
        this.rollbackToken = "UNBLOCK-" + ipAddress + "-" + System.currentTimeMillis();
    }

    @Override public void execute() { log.warn("[RESPONSE] BLOCKING IP: {}", ipAddress); }
    @Override public void undo()    { log.info("[ROLLBACK] UNBLOCKING IP: {} | Token: {}", ipAddress, rollbackToken); }
    @Override public String describe() { return "Blocked IP address: " + ipAddress + " | Rollback token: " + rollbackToken; }
    public String getRollbackToken() { return rollbackToken; }
}

// RevokeSessionCommand
public class RevokeSessionCommand implements ResponseCommand {
    private final String userId;
    private final String sessionId;
    // execute() logs "[RESPONSE] REVOKING SESSION"
    // undo() prints "Cannot restore session — user must log in again."
}

// ForcePasswordResetCommand
public class ForcePasswordResetCommand implements ResponseCommand {
    private final String userId;
    // execute() logs "[RESPONSE] FORCING PASSWORD RESET"
    // undo() prints "Password reset cannot be undone automatically."
}
```

### IncidentResponderAgent — THE INVOKER (Broker from Lab 7)
```java
@Component
public class IncidentResponderAgent implements ISecurityAgent {

    private final AuditActionRepository auditRepo;
    private final EventProducer         eventProducer;
    private final KnowledgeGraphService graphService;
    private final IncidentRepository    incidentRepo;

    @Override
    public Finding process(SecurityEvent event) {
        // Build the playbook — one Command per action
        List<ResponseCommand> playbook = new ArrayList<>();
        playbook.add(new BlockIpCommand(event.getSourceIp()));
        playbook.add(new RevokeSessionCommand(event.getActor(), UUID.randomUUID().toString()));
        playbook.add(new ForcePasswordResetCommand(event.getActor()));

        // Execute and log every command
        for (ResponseCommand command : playbook) {
            command.execute();

            AuditEntry entry = AuditEntry.builder()
                    .incidentId(UUID.fromString(incidentId))
                    .actionType(command.getClass().getSimpleName())
                    .actionDescription(command.describe())
                    .executedBy("IncidentResponderAgent")
                    .build();
            auditRepo.save(entry);

            // Broadcast each action to the React dashboard
            eventProducer.publishResponse(WebSocketMessage.responseExecuted(...));
        }

        // After all commands: mark IP blocked + incident CONTAINED in Neo4j and PostgreSQL
        graphService.markIpBlocked(event.getSourceIp());
        graphService.markIncidentContained(incidentId);
        incidentRepo.findById(uuid).ifPresent(inc -> {
            inc.setStatus("CONTAINED");
            inc.setContainedAt(LocalDateTime.now());
            incidentRepo.save(inc);
        });
    }
}
```

### What to say in the viva
> "IncidentResponderAgent uses the Command pattern from Lab 7.
> `ResponseCommand` is our `Order` interface — it has `execute()`, `undo()`, and `describe()`.
> `BlockIpCommand`, `RevokeSessionCommand`, `ForcePasswordResetCommand` are concrete Commands.
> `IncidentResponderAgent` is the Broker — it builds a `playbook` list, executes all
> commands in order, and persists every `command.describe()` to the `audit_actions` table.
> Identical structure to `BuyStock`/`SellStock` + `Broker` from Lab 7."

---

## Pattern 7 — Strategy (Bonus)
**Category:** Behavioral | **Status:** ✅ Implemented | **Lab:** Bonus (GoF)

### What it is in plain English
Strategy defines a family of algorithms behind one interface and lets you swap them at runtime.
The context class (ThreatClassifierAgent) only calls the interface method — it never knows
which concrete algorithm is running behind it.

### The problem it solves here
The Threat Classifier needs to map events to MITRE ATT&CK techniques.
Two approaches exist:
1. **RuleBasedStrategy** — deterministic, works offline, no API key required. Perfect for demo.
2. **LlmStrategy** — calls Groq's `llama-3.3-70b-versatile` for novel patterns. Requires `GROQ_API_KEY`.

When `GROQ_API_KEY` is set in environment, `LlmStrategy` runs first and falls back to
`RuleBasedStrategy` internally if Groq is unavailable or returns no result.
When no key is set, `LlmStrategy.isConfigured()` returns false and it immediately
delegates to `RuleBasedStrategy` — the demo always works offline.

### Files
```
backend/src/main/java/com/sentinelmind/agents/classifier/ClassificationStrategy.java
backend/src/main/java/com/sentinelmind/agents/classifier/RuleBasedStrategy.java
backend/src/main/java/com/sentinelmind/agents/classifier/LlmStrategy.java
backend/src/main/java/com/sentinelmind/agents/classifier/ThreatClassifierAgent.java
```

### ClassificationStrategy — the interface
```java
public interface ClassificationStrategy {
    ClassificationResult classify(Finding finding);
}
```

### RuleBasedStrategy — default, always available
```java
@Component
public class RuleBasedStrategy implements ClassificationStrategy {

    @Override
    public ClassificationResult classify(Finding finding) {

        // Rule 1: Tor + off-hours (22:00–06:00) + robotic speed (<500ms) = credential stuffing
        if (finding.isTorNode()
                && (finding.getHour() >= 22 || finding.getHour() <= 6)
                && finding.getLoginLatencyMs() < 500) {
            return ClassificationResult.builder()
                    .techniqueIds(List.of("T1078", "T1110.004"))
                    .techniqueNames(List.of("Valid Accounts", "Credential Stuffing"))
                    .confidence(1.0)
                    .reason("Rule match: Tor exit node + off-hours login + robotic speed (<500ms)")
                    .unknown(false).build();
        }

        // Rule 2: Tor node only (partial match)
        if (finding.isTorNode()) {
            return ClassificationResult.builder()
                    .techniqueIds(List.of("T1078")).techniqueNames(List.of("Valid Accounts"))
                    .confidence(0.7).reason("Partial rule match: Tor exit node detected")
                    .unknown(false).build();
        }

        return ClassificationResult.unknown();
    }
}
```

### LlmStrategy — PRIMARY, calls Groq (model: llama-3.3-70b-versatile)
```java
@Component("llmStrategy")
@Primary  // Spring injects this when ClassificationStrategy is requested without @Qualifier
public class LlmStrategy implements ClassificationStrategy {

    private final GroqClient groqClient;
    private final RuleBasedStrategy fallback;  // used when Groq is unavailable

    @Override
    public ClassificationResult classify(Finding finding) {
        if (!groqClient.isConfigured()) {   // no GROQ_API_KEY set
            broadcastRuleBasedFallback();
            return fallback.classify(finding);  // immediate rule-based fallback
        }
        // Send finding to Groq, parse JSON response with techniqueIds/techniqueNames/confidence
        // Falls back to fallback.classify() if Groq returns empty/malformed JSON
    }
}
```

### ThreatClassifierAgent — the Strategy CONTEXT
```java
@Component
public class ThreatClassifierAgent implements ISecurityAgent {

    private final ClassificationStrategy primaryStrategy;   // @Qualifier("llmStrategy")
    private final RuleBasedStrategy      fallbackStrategy;  // always available

    public ThreatClassifierAgent(
            @Qualifier("llmStrategy") ClassificationStrategy primaryStrategy,
            RuleBasedStrategy fallbackStrategy, ...) { ... }

    @Override
    public Finding process(SecurityEvent event) {
        // Strategy pattern: call classify() on the interface — never know which runs
        ClassificationResult result = primaryStrategy.classify(inputFinding);

        // If primary returns unknown (e.g. LLM inconclusive), fall back to rules
        if (result.isUnknown()) {
            result = fallbackStrategy.classify(inputFinding);
        }

        return Finding.builder()
                .mitreIds(result.getTechniqueIds())
                .mitreNames(result.getTechniqueNames())
                .confidence(result.getConfidence())
                .ruleMatched(!result.isUnknown())
                ...build();
    }
}
```

### What to say in the viva
> "Strategy is our bonus pattern. `ClassificationStrategy` is the interface.
> `LlmStrategy` is `@Primary` — it's always the first strategy tried. When `GROQ_API_KEY`
> is set, it calls the Groq LLM for classification. When the key is not set, it immediately
> falls back to `RuleBasedStrategy` internally. `ThreatClassifierAgent` never calls either
> class directly — it only calls `primaryStrategy.classify(finding)`. That's the Strategy
> pattern. Switching the algorithm requires zero code change."

---

## Observer Pattern — Kafka as Infrastructure Observer
**Category:** Behavioral | **Status:** ✅ Infrastructure-level (not a Java class, but an architectural pattern)

### Where it is
Kafka pub/sub is the Observer pattern at the infrastructure level.
The Orchestrator (Subject/Publisher) publishes events to agent Kafka topics.
Each agent (Observer/Subscriber) declares `@KafkaListener` on its topic and reacts.

### Kafka topics and their listener declarations
| Topic constant | String value | Listener (Observer) |
|---|---|---|
| `KafkaTopics.RAW_EVENTS` | `"raw-events"` | `OrchestratorAgent.onEvent(SecurityEvent)` |
| `KafkaTopics.FINDINGS` | `"findings"` | `OrchestratorAgent.onFinding(Finding)` |
| `KafkaTopics.AGENT_ANOMALY` | `"agent-anomaly"` | `AnomalyDetectionAgent.onEvent(SecurityEvent)` |
| `KafkaTopics.AGENT_THREATINTEL` | `"agent-threatintel"` | `ThreatIntelAgent.onEvent(SecurityEvent)` |
| `KafkaTopics.AGENT_CLASSIFIER` | `"agent-classifier"` | `ThreatClassifierAgent.onEvent(SecurityEvent)` |
| `KafkaTopics.AGENT_RESPONDER` | `"agent-responder"` | `IncidentResponderAgent.onEvent(SecurityEvent)` |

### Example listener
```java
@KafkaListener(topics = KafkaTopics.AGENT_ANOMALY, groupId = "anomaly-group")
public void onEvent(SecurityEvent event) {
    Finding finding = process(event);
    eventProducer.publishFinding(finding);  // publishes back to "findings" topic
}
```

### What to say in the viva
> "Kafka IS the Observer pattern at the infrastructure level. The Orchestrator is the
> Publisher — it calls `eventProducer.publishToAgent(topic, event)`. Each agent is a
> Subscriber — it declares `@KafkaListener(topics = ...)` on its own topic. The agents
> are completely decoupled — they don't know the Orchestrator exists and the Orchestrator
> doesn't call any agent method directly. That's the Observer pattern."

---

## Confidence Formula
**Class:** `ConfidenceCalculator` (`backend/src/main/java/com/sentinelmind/orchestrator/ConfidenceCalculator.java`)

### Formula (exact from source)
```
confidence = (anomalyScore × 0.30) + (threatIntelScore × 0.40) + (classifierScore × 0.30)
```

Where:
- `anomalyScore = Math.min(zScore / 10.0, 1.0)`
- `threatIntelScore = feedCount >= 1 ? 1.0 : 0.0`
- `classifierScore = ruleMatched ? 1.0 : 0.3`

### Demo scenario values (from ConfidenceCalculator.java comment)
| Agent | Raw value | Normalized | Weight | Contribution |
|---|---|---|---|---|
| AnomalyDetectionAgent | zScore = 8.9 | 0.89 | 0.30 | **0.267** |
| ThreatIntelAgent | feedCount = 4 | 1.0 | 0.40 | **0.400** |
| ThreatClassifierAgent | ruleMatched = true | 1.0 | 0.30 | **0.300** |
| **Total** | | | | **0.967 ≥ 0.92 ✓** |

### Threshold
The response authorization threshold is `0.92` (configurable via `sentinelmind.confidence-threshold` in `application.yml`).
A `Finding` with `confidence = 0.967` triggers the `IncidentResponderAgent`.

### `calculatePartial()` — for mid-pipeline confidence updates
```java
// Called after each agent to broadcast intermediate confidence to the dashboard
public double calculatePartial(Double zScore, Integer feedCount, Boolean ruleMatched) {
    // Any null argument = 0.0 contribution (that agent hasn't run yet)
}
```

---

## Tier 2 Agents

### AnomalyDetectionAgent
**File:** `backend/src/main/java/com/sentinelmind/agents/anomaly/AnomalyDetectionAgent.java`

**Algorithm:** Z-score comparison against per-user baseline stored in Neo4j.
- Reads `avgLoginHour`, `stdDevLoginHour`, `avgLatencyMs`, `stdDevLatencyMs`, `typicalCountry`, `sessionCount` from Neo4j for the event actor
- Falls back to demo defaults: `avgHour=10.5`, `stdHour=2.1`, `avgLatency=1850ms`, `country="PK"`
- `zScore = max(|hour - avgHour| / stdHour, |latency - avgLatency| / stdLatency)`

**6 attack vector boosters:**
| Attack | Trigger | z-score boost |
|---|---|---|
| Credential Stuffing | country mismatch | +2.0 |
| Brute Force | `failedAttempts > 10` | `+failedAttempts/50.0` |
| Insider Threat | `filesAccessed > 100` | +4.0 (+dataVolumeGB/10.0) |
| Account Takeover | `action=PASSWORD_RESET_REQUEST` + `curl` User-Agent | +5.0 |
| Impossible Travel | prev country != current, speed > 50 units | +10.0 |
| Impersonation | `action=ASSUME_ROLE` + `targetUser` set | +8.0 |

**Severity thresholds:** `zScore >= 7.0 → CRITICAL`, `>= 3.5 → HIGH`, `>= 2.0 → MEDIUM`, else `LOW`

**Baseline update:** Low-severity events trigger an EMA (alpha=0.1) update of the user's
Neo4j baseline properties. Also triggered by `OrchestratorAgent.updateBaseline()` when
confidence falls below the threshold (clean event confirmed).

---

### ForensicsAgent
**File:** `backend/src/main/java/com/sentinelmind/agents/forensics/ForensicsAgent.java`

**How it's used:** REST-only — not in the Kafka pipeline. `GET /api/forensics/{incidentId}`

**What `generateReport(String incidentId)` does:**
1. Loads `Incident` from PostgreSQL by UUID
2. Queries Neo4j for all nodes connected to the attacker IP (`-[r]->(n)`)
3. Counts impacted users and services → blast radius summary
4. Loads `AuditEntry` rows from PostgreSQL → chronological response timeline
5. Calls `generateTimeline()` → 4 Cypher queries (attack path, services, MITRE techniques, lateral movement)
6. Calls Groq LLM for a narrative answer to 5 forensic questions (if configured), falls back to rule-based summary

**`generateTimeline()` produces `ForensicsTimeline` with events:**
`RECONNAISSANCE → INITIAL_ACCESS → ANOMALY_DETECTED → TECHNIQUE_IDENTIFIED (×n) → LATERAL_MOVEMENT (×n) → CONTAINMENT`

---

### VulnerabilityScannerAgent
**File:** `backend/src/main/java/com/sentinelmind/agents/vuln/VulnerabilityScannerAgent.java`

**How it's used:** REST-only. `POST /api/scan/vulnerability {packageName, version}`

**Priority formula:**
```
priority = (epss × 0.60) + ((cvss / 10.0) × 0.30) + (exploitedInWild ? 0.07 : 0) + (cisaKev ? 0.03 : 0)
```
EPSS carries 60% weight because real-world exploitation probability is more actionable than theoretical CVSS severity.

**Data source:** CVE nodes pre-seeded in Neo4j (`demo_entities.cypher`). Queries `CVE` nodes by `affectedPackage` property. No live NVD API needed for demo.

---

### DependencyScanner
**File:** `backend/src/main/java/com/sentinelmind/agents/supply/DependencyScanner.java`

**How it's used:** REST-only. `POST /api/scan/dependency`

**Algorithm:** Levenshtein (edit) distance between submitted package name and ~100 popular packages.
- Distance 0 → TRUSTED
- Distance 1 → CRITICAL risk, riskScore = 0.95
- Distance 2 → HIGH risk, riskScore = 0.65 (boosted to 0.80 if submitted name contains digits)
- Distance > 2 → UNKNOWN, riskScore = 0.30

Methods: `scan(List<String>)` (batch), `scanDependency(String)` (single)

---

## PostgreSQL Audit Layer

### Incident
**File:** `backend/src/main/java/com/sentinelmind/audit/Incident.java` | **Table:** `incidents`

```
UUID id (PK, set by OrchestratorAgent — not @GeneratedValue)
String eventJson (TEXT)
String severity
BigDecimal confidence
String mitreIds (comma-separated: "T1078,T1110.004")
String mitreNames (comma-separated)
String reason (TEXT)
String status (@Builder.Default = "OPEN" | "CONTAINED")
LocalDateTime detectedAt (@CreationTimestamp)
LocalDateTime containedAt
```

### AuditEntry
**File:** `backend/src/main/java/com/sentinelmind/audit/AuditEntry.java` | **Table:** `audit_actions`

```
UUID id (PK, @GeneratedValue UUID)
UUID incidentId (FK to incidents.id)
String actionType (e.g. "BlockIpCommand")
String actionDescription (e.g. "Blocked IP address: 185.220.101.47 | Rollback token: UNBLOCK-...")
String rollbackToken
LocalDateTime executedAt (@CreationTimestamp)
String executedBy (@Builder.Default = "IncidentResponderAgent")
```

---

## GroqClient
**File:** `backend/src/main/java/com/sentinelmind/llm/GroqClient.java`

- `@Component` singleton — injected into `LlmStrategy` and `OrchestratorAgent`
- Uses Java 21's `java.net.http.HttpClient` (no SDK dependency)
- Model: `llama-3.3-70b-versatile` (configurable via `groq.model`)
- `isConfigured()` returns `true` only when `GROQ_API_KEY` env var is set (not "not-set")
- `chat(String systemPrompt, String userMessage)` → POST `/openai/v1/chat/completions`
- Fallback behaviour: all callers check `isConfigured()` before calling `chat()` — never throws in mock mode

---

## OrchestratorAgent — full ReAct loop
**File:** `backend/src/main/java/com/sentinelmind/orchestrator/OrchestratorAgent.java`

The Orchestrator implements a **ReAct (Reason + Act)** loop:

```
1. onEvent(SecurityEvent) ← @KafkaListener("raw-events")
2. REASON: Query Neo4j for IP context (isTorNode, feedCount, reputation, priorIncidents)
3. GRAPH STEP 1: createIncidentNode() + linkIncidentToUser() + linkIncidentToIp()
4. ACT: getAgent("ANOMALY") → publish to Kafka → waitForFinding(anomalyQueue, 5s)
5. REASON: Ask Groq — "should I escalate to threat intel?" (falls back to CONTINUE if no key)
6. ACT: getAgent("THREAT_INTEL") → publish to Kafka → waitForFinding(threatIntelQueue, 5s)
7. GRAPH STEP 2: linkIncidentToIp() with TARGETED edge (if malicious)
8. REASON: Ask Groq — "should I classify and authorize response?"
9. ACT: getAgent("CLASSIFIER") → publish to Kafka → waitForFinding(classifierQueue, 5s)
10. GRAPH STEP 3: linkIncidentToTechnique() for each MITRE ID
11. confidence = confidenceCalc.calculate(zScore, feedCount, ruleMatched)
12. severity = CRITICAL/HIGH/MEDIUM/LOW based on confidence threshold
13. reportBuilder.build() → saveIncident() to PostgreSQL
14. handlerChain.handle(finalFinding) — Chain of Responsibility fires
15. correlateCampaign() — PART_OF_CAMPAIGN edges in Neo4j (72-hour window)
16. IF confidence >= 0.92:
       getAgent("RESPONDER") → publish to Kafka → IncidentResponderAgent executes
    ELSE:
       flag for human review, call anomalyDetectionAgent.updateBaseline()
```

**Confidence threshold:** `0.92` (configurable via `sentinelmind.confidence-threshold`)
**Max ReAct iterations:** `5` (configurable via `sentinelmind.react-max-iterations`)

**Severity mapping in `determineSeverity(double confidence)`:**
- `>= 0.92` → CRITICAL
- `>= 0.70` → HIGH
- `>= 0.40` → MEDIUM
- else → LOW

---

## Summary Table for the Viva

| # | Pattern | Lab | Category | Key Class(es) | In the demo? |
|---|---|---|---|---|---|
| 1 | **Singleton** | Lab 2 | Creational | `KnowledgeGraphService` (@Service) | Yes — all agents share one Neo4j connection |
| 2 | **Factory Method** | Lab 3 | Creational | `AgentFactory` + `AgentRegistration` record | Yes — Orchestrator dispatches 4 agents via factory |
| 3 | **Builder** | Lab 4 | Creational | `IncidentReport.Builder` (14 fields) | Yes — report assembled across 3 agent response steps |
| 4 | **Adapter** | Lab 5 | Structural | `IThreatFeed`, `MockThreatFeed`, `VirusTotalAdapter` | Yes — MockThreatFeed confirms demo IP as CRITICAL |
| 5 | **Chain of Responsibility** | Lab 7 | Behavioral | `AbstractEventHandler` → Low→Medium→High→Critical | Yes — fires after confidence computed |
| 6 | **Command** | Lab 7 | Behavioral | `BlockIpCommand`, `RevokeSessionCommand`, `ForcePasswordResetCommand` | Yes — 3 commands execute, each logged to PostgreSQL |
| 7 | **Strategy** | Bonus | Behavioral | `LlmStrategy` (@Primary), `RuleBasedStrategy` | Yes — LlmStrategy (Groq or rule fallback) runs on classifier |
| — | **Observer** | Infra | Behavioral | Kafka `@KafkaListener` on each agent | Yes — Kafka is the pub/sub bus the entire system runs on |

---

## Viva Cheat Sheet — One Answer Per Common Question

**Q: Why Neo4j instead of just PostgreSQL?**
Graph traversal. "Which services are reachable from this compromised user?" is a multi-hop
Cypher query (`MATCH (u:User)-[:HAS_ACCESS_TO]->(a:Asset)-[:CONNECTED_TO*1..3]->(downstream)`).
That's natural in Neo4j and awkward as recursive SQL joins. PostgreSQL handles flat rows
(incidents, audit_actions). Neo4j handles relationships (attack paths, campaign correlation).

**Q: Where is the Observer pattern?**
Kafka. `OrchestratorAgent` publishes to `KafkaTopics.AGENT_ANOMALY`. `AnomalyDetectionAgent`
is `@KafkaListener(topics = KafkaTopics.AGENT_ANOMALY)`. The agents don't even know the
Orchestrator exists. That IS the Observer pattern — at the infrastructure level.

**Q: What does the Orchestrator actually decide?**
Which agents to run, in what order, and whether combined confidence ≥ 0.92. It never
analyzes events itself. It uses `ConfidenceCalculator` to combine three signals (z-score,
feed count, rule match) and authorizes the `IncidentResponderAgent` only when the threshold
is exceeded. Between each agent step it consults Groq LLM (if configured) to reason about
next steps, falling back to deterministic pipeline flow if no key is set.

**Q: What's the difference between Builder and Factory?**
Factory decides WHICH object to create — "give me the ANOMALY agent".
Builder decides HOW to assemble one complex object — "add anomaly score, add threat intel,
add MITRE IDs, then build the final IncidentReport". They solve different problems and
run at different points in the pipeline. Both are used here.

**Q: What's the difference between Adapter and Strategy?**
Adapter is structural — it makes an incompatible interface compatible without changing the
caller or the adaptee. `VirusTotalAdapter` translates VirusTotal's format into `IThreatFeed`.
Strategy is behavioral — it lets you pick an algorithm at runtime. `LlmStrategy` and
`RuleBasedStrategy` are interchangeable algorithms behind `ClassificationStrategy`. The
classifier switches between them; the threat intel agent switches between feeds. Different
patterns solving different problems.

**Q: How does the demo always work without API keys?**
Three mechanisms:
1. `MockThreatFeed` is `@Primary` — it's always the default threat feed and confirms `185.220.101.47` as CRITICAL.
2. `LlmStrategy` checks `groqClient.isConfigured()` first — if no key, it immediately delegates to `RuleBasedStrategy`, which deterministically produces `T1078 + T1110.004` with confidence 1.0.
3. `OrchestratorAgent.askGroq()` checks `isConfigured()` — if no key, it returns `"CONTINUE"` so the pipeline flows through all agents without pausing for AI reasoning.

**Q: Why is the confidence threshold 0.92?**
Demo values: zScore 8.9 → 0.267 contribution; feedCount 4 → 0.400; ruleMatched true → 0.300.
Total: 0.967. The 0.92 threshold is calibrated so the demo scenario reliably crosses it
(0.967 ≥ 0.92 ✓) while still requiring all three signals to be positive.

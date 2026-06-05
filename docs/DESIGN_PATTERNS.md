# DESIGN_PATTERNS.md — SentinelMind

> This file explains every design pattern used in SentinelMind.
> Read this before writing any code. Use it during your viva to explain
> each pattern to your teacher in plain English.
>
> All 6 patterns below come directly from Ms. Maham's labs (Lab 2–7).
> Each one is REAL — it solves an actual problem in this system,
> not just added for the sake of having a pattern.

---

## How to read this file

Each pattern has 4 parts:
1. **What it is** — plain English, no jargon
2. **The problem it solves in SentinelMind** — why we needed it
3. **The real-world analogy** — something you already understand
4. **The Java code** — exactly what the class looks like

---

## Pattern 1 — Singleton
**Category:** Creational | **Lab:** Lab 2

### What it is
A Singleton means: this class can only ever have ONE object.
No matter how many times you ask for it, you always get the same one back.

### The problem it solves in SentinelMind
Every single agent in the system needs to talk to the Neo4j knowledge graph.
If each agent created its own database connection, we would have 10+ connections
open at once, wasting memory and causing conflicts.
With Singleton, there is ONE connection shared by everyone.

### Real-world analogy
The principal of a school. There is only one principal.
Every teacher, student, and staff member interacts with the same person.
You don't have a different principal for each classroom.

### Where it lives in the code
**File:** `src/main/java/com/sentinelmind/graph/KnowledgeGraphService.java`

```java
/**
 * KnowledgeGraphService — Singleton Pattern
 *
 * This class manages the single connection to our Neo4j knowledge graph.
 * There is EXACTLY ONE instance of this class in the entire application.
 * Every agent that needs to read/write the graph goes through this one object.
 *
 * Why Singleton here? Because database connections are expensive to create.
 * One shared connection = fast and efficient.
 */
@Service  // Spring's @Service annotation makes this a Singleton automatically
public class KnowledgeGraphService {

    private final Driver neo4jDriver;

    // Spring creates this once and reuses it everywhere — this IS the Singleton
    public KnowledgeGraphService(Driver neo4jDriver) {
        this.neo4jDriver = neo4jDriver;
    }

    // Any agent can call this to query the graph
    public List<Map<String, Object>> query(String cypher) {
        try (Session session = neo4jDriver.session()) {
            return session.run(cypher).list(r -> r.asMap());
        }
    }

    // Store a new threat finding in the graph
    public void saveNode(String label, Map<String, Object> properties) {
        try (Session session = neo4jDriver.session()) {
            session.run("CREATE (n:" + label + " $props)", Map.of("props", properties));
        }
    }
}
```

### What to say in the viva
> "KnowledgeGraphService is our Singleton. Spring Boot manages one instance of it
> for the whole application. Every agent that needs the graph calls this same object.
> This is exactly like the SingleObject class from Lab 2 — private constructor,
> one instance, global access point."

---

## Pattern 2 — Factory Method
**Category:** Creational | **Lab:** Lab 3

### What it is
A Factory is a class whose only job is to CREATE other objects.
You tell the factory WHAT you want, and it figures out HOW to make it.
The caller never needs to know which specific class gets created.

### The problem it solves in SentinelMind
The Orchestrator needs to create different agents depending on what kind of
security event arrives. Without a factory, the Orchestrator would be full of
`if/else` statements and would need to know about every agent class.
With a Factory, the Orchestrator just says "give me an ANOMALY agent"
and the factory handles the rest.

### Real-world analogy
A car dealership. You walk in and say "I want a red SUV."
You don't go to the factory floor and assemble it yourself.
The dealership (factory) handles creating the right vehicle for you.

### Where it lives in the code
**File:** `src/main/java/com/sentinelmind/agents/AgentFactory.java`

```java
/**
 * AgentFactory — Factory Method Pattern
 *
 * This class is responsible for creating the correct security agent
 * based on the type of task the Orchestrator needs done.
 *
 * The Orchestrator NEVER uses "new AnomalyDetectionAgent()" directly.
 * It always goes through this factory. This means:
 * - Adding a new agent type = change only this file
 * - The Orchestrator stays clean and simple
 *
 * Exactly like ShapeFactory from Lab 3 — you ask for a shape type,
 * you get back the right object without knowing how it was created.
 */
@Component
public class AgentFactory {

    // Spring injects these — the factory doesn't create them from scratch,
    // it picks the right one to hand over
    private final AnomalyDetectionAgent anomalyAgent;
    private final ThreatIntelAgent threatIntelAgent;
    private final ThreatClassifierAgent classifierAgent;
    private final IncidentResponderAgent responderAgent;

    public AgentFactory(AnomalyDetectionAgent anomalyAgent,
                        ThreatIntelAgent threatIntelAgent,
                        ThreatClassifierAgent classifierAgent,
                        IncidentResponderAgent responderAgent) {
        this.anomalyAgent = anomalyAgent;
        this.threatIntelAgent = threatIntelAgent;
        this.classifierAgent = classifierAgent;
        this.responderAgent = responderAgent;
    }

    /**
     * Give me the right agent for this task type.
     * The Orchestrator calls this — it doesn't need to know about
     * any specific agent class.
     */
    public ISecurityAgent getAgent(String agentType) {
        return switch (agentType.toUpperCase()) {
            case "ANOMALY"      -> anomalyAgent;
            case "THREAT_INTEL" -> threatIntelAgent;
            case "CLASSIFIER"   -> classifierAgent;
            case "RESPONDER"    -> responderAgent;
            default -> throw new IllegalArgumentException(
                "Unknown agent type: " + agentType
            );
        };
    }
}
```

### What to say in the viva
> "AgentFactory is our Factory pattern. The Orchestrator asks for an agent by name —
> ANOMALY, THREAT_INTEL, CLASSIFIER — and the factory returns the right object.
> The Orchestrator never uses 'new' directly. This is identical to the ShapeFactory
> from Lab 3 where you passed CIRCLE or RECTANGLE and got back the right Shape."

---

## Pattern 3 — Builder
**Category:** Creational | **Lab:** Lab 4

### What it is
The Builder pattern is for creating complex objects step by step.
Instead of one giant constructor with 10 parameters, you build the object
piece by piece, adding only what you need.

### The problem it solves in SentinelMind
An Incident report is a complex object. It has: a source event, an anomaly score,
a threat intel result, a MITRE technique mapping, a confidence score, a severity level,
and a list of response actions taken. You can't pass all of that to a constructor.
The Builder lets us assemble it piece by piece as agents report their findings.

### Real-world analogy
Building a custom burger at a restaurant.
First the bun, then the patty, then the cheese, then the sauce.
Each step is separate. You only add what you want.
This is exactly the MealBuilder from Lab 4.

### Where it lives in the code
**File:** `src/main/java/com/sentinelmind/model/IncidentReport.java`

```java
/**
 * IncidentReport — Built using the Builder Pattern
 *
 * An incident report is assembled step by step as the Orchestrator
 * collects findings from each agent. We don't know all the details
 * upfront — they arrive one by one.
 *
 * The Builder lets us add each piece when it arrives and call build()
 * at the end to get the final complete object.
 *
 * Compare to MealBuilder from Lab 4: prepareVegMeal() adds a VegBurger
 * then a Coke then returns the Meal. Our IncidentBuilder adds findings
 * one by one and returns the final IncidentReport.
 */
public class IncidentReport {

    // These are all the pieces of a complete incident report
    private final String incidentId;
    private final SecurityEvent triggeringEvent;
    private final double anomalyScore;
    private final String threatIntelResult;
    private final String mitreAttackId;       // e.g. "T1078"
    private final String mitreTechniqueName;  // e.g. "Valid Accounts"
    private final double confidenceScore;
    private final String severity;            // LOW / MEDIUM / HIGH / CRITICAL
    private final List<String> responseActions;
    private final long detectedAt;

    // Private constructor — you MUST use the Builder to create this
    private IncidentReport(Builder builder) {
        this.incidentId       = builder.incidentId;
        this.triggeringEvent  = builder.triggeringEvent;
        this.anomalyScore     = builder.anomalyScore;
        this.threatIntelResult = builder.threatIntelResult;
        this.mitreAttackId    = builder.mitreAttackId;
        this.mitreTechniqueName = builder.mitreTechniqueName;
        this.confidenceScore  = builder.confidenceScore;
        this.severity         = builder.severity;
        this.responseActions  = builder.responseActions;
        this.detectedAt       = builder.detectedAt;
    }

    // Getters...
    public String getIncidentId()      { return incidentId; }
    public String getSeverity()        { return severity; }
    public double getConfidenceScore() { return confidenceScore; }
    public String getMitreAttackId()   { return mitreAttackId; }
    // ... etc

    /**
     * The Builder — this is the class that assembles the IncidentReport
     * step by step. The Orchestrator uses this as it collects findings.
     */
    public static class Builder {
        private String incidentId;
        private SecurityEvent triggeringEvent;
        private double anomalyScore;
        private String threatIntelResult;
        private String mitreAttackId;
        private String mitreTechniqueName;
        private double confidenceScore;
        private String severity;
        private List<String> responseActions = new ArrayList<>();
        private long detectedAt = System.currentTimeMillis();

        public Builder incidentId(String id) {
            this.incidentId = id;
            return this;  // returning 'this' allows method chaining
        }

        public Builder triggeringEvent(SecurityEvent event) {
            this.triggeringEvent = event;
            return this;
        }

        public Builder anomalyScore(double score) {
            this.anomalyScore = score;
            return this;
        }

        public Builder threatIntelResult(String result) {
            this.threatIntelResult = result;
            return this;
        }

        public Builder mitreMapping(String id, String name) {
            this.mitreAttackId = id;
            this.mitreTechniqueName = name;
            return this;
        }

        public Builder confidenceScore(double score) {
            this.confidenceScore = score;
            return this;
        }

        public Builder severity(String severity) {
            this.severity = severity;
            return this;
        }

        public Builder addResponseAction(String action) {
            this.responseActions.add(action);
            return this;
        }

        // Final step — build the complete IncidentReport
        public IncidentReport build() {
            if (incidentId == null) throw new IllegalStateException("incidentId is required");
            if (triggeringEvent == null) throw new IllegalStateException("event is required");
            return new IncidentReport(this);
        }
    }
}
```

**How the Orchestrator uses it:**
```java
// The Orchestrator builds the report step by step as findings come in
IncidentReport report = new IncidentReport.Builder()
    .incidentId(UUID.randomUUID().toString())
    .triggeringEvent(loginEvent)
    .anomalyScore(8.7)                          // from Anomaly Detection agent
    .threatIntelResult("Tor exit node, 4 feeds") // from Threat Intel agent
    .mitreMapping("T1078", "Valid Accounts")     // from Threat Classifier agent
    .confidenceScore(0.97)
    .severity("CRITICAL")
    .addResponseAction("IP blocked: 185.220.101.47")
    .addResponseAction("Session revoked for user: ahmed@company.com")
    .build();
```

### What to say in the viva
> "IncidentReport uses the Builder pattern from Lab 4. A complete incident has
> 9 different fields that arrive at different times from different agents.
> Instead of a constructor with 9 parameters, we have a Builder that lets the
> Orchestrator add each piece as it arrives. It's the same idea as MealBuilder —
> add a burger, add a drink, call build() to get the final Meal."

---

## Pattern 4 — Adapter
**Category:** Structural | **Lab:** Lab 5

### What it is
An Adapter makes two incompatible things work together.
You have Thing A that expects one interface, and Thing B that has a different interface.
The Adapter sits in the middle and translates between them.

### The problem it solves in SentinelMind
The Threat Intelligence agent needs to check if an IP address is malicious.
It has two sources:
- A **mock list** (a simple text file of bad IPs for demo mode)
- The **VirusTotal API** (a real web service with its own format and response structure)

Both do the same job but have totally different interfaces.
The Adapter wraps both behind one common interface so the agent
doesn't care which one it's actually using.

### Real-world analogy
A plug adapter when travelling abroad.
Your Pakistani phone charger has a different plug shape than a UK socket.
The adapter doesn't change the charger or the socket — it just makes them compatible.
This is exactly the MediaAdapter from Lab 5.

### Where it lives in the code
**File:** `src/main/java/com/sentinelmind/agents/threatintel/`

```java
/**
 * IThreatFeed — The common interface ALL threat sources must implement
 *
 * This is our "MediaPlayer" interface from Lab 5.
 * The ThreatIntelAgent ONLY knows about this interface — it never
 * knows whether it's talking to the mock or VirusTotal.
 */
public interface IThreatFeed {
    ThreatResult checkIp(String ipAddress);
}

// -----------------------------------------------------------------

/**
 * MockThreatFeed — The simple version used in demo mode
 *
 * Just a list of known-bad IPs hardcoded for the demo.
 * This is our "VlcPlayer" — already works natively with our interface.
 */
@Component
public class MockThreatFeed implements IThreatFeed {

    // Pre-loaded list of Tor exit nodes and known-bad IPs for the demo
    private static final Set<String> BAD_IPS = Set.of(
        "185.220.101.47",   // Known Tor exit node — used in demo
        "185.220.100.253",
        "198.98.56.161"
    );

    @Override
    public ThreatResult checkIp(String ipAddress) {
        boolean isBad = BAD_IPS.contains(ipAddress);
        return new ThreatResult(
            ipAddress,
            isBad ? "CRITICAL" : "CLEAN",
            isBad ? "Known Tor exit node — appears in 4 threat feeds" : "No threats found",
            isBad
        );
    }
}

// -----------------------------------------------------------------

/**
 * VirusTotalAdapter — THE ADAPTER
 *
 * VirusTotal has its own API format — it speaks a different "language."
 * This adapter translates between VirusTotal's language and our
 * IThreatFeed interface that the agent expects.
 *
 * This is our "MediaAdapter" from Lab 5 — it implements MediaPlayer
 * (our IThreatFeed) but internally uses AdvancedMediaPlayer (VirusTotal API).
 */
@Component
public class VirusTotalAdapter implements IThreatFeed {

    private final VirusTotalApiClient virusTotalClient;  // The real VirusTotal API

    public VirusTotalAdapter(VirusTotalApiClient virusTotalClient) {
        this.virusTotalClient = virusTotalClient;
    }

    @Override
    public ThreatResult checkIp(String ipAddress) {
        // VirusTotal returns its own response format — we translate it
        VirusTotalResponse vtResponse = virusTotalClient.getIpReport(ipAddress);

        // Translate VirusTotal's format → our standard ThreatResult format
        String severity = vtResponse.getMaliciousVotes() > 5 ? "CRITICAL" : "CLEAN";
        String description = "VirusTotal: " + vtResponse.getMaliciousVotes()
            + " engines flagged this IP";

        return new ThreatResult(
            ipAddress,
            severity,
            description,
            vtResponse.getMaliciousVotes() > 5
        );
    }
}
```

**How the ThreatIntelAgent uses it:**
```java
@Component
public class ThreatIntelAgent implements ISecurityAgent {

    private final IThreatFeed threatFeed;  // Could be Mock OR VirusTotal — agent doesn't care

    // Spring injects whichever one is active (controlled by config flag)
    public ThreatIntelAgent(IThreatFeed threatFeed) {
        this.threatFeed = threatFeed;
    }

    public Finding analyze(SecurityEvent event) {
        // Agent calls the same method regardless of which feed is behind it
        ThreatResult result = threatFeed.checkIp(event.getSourceIp());
        // ... build and return finding
    }
}
```

### What to say in the viva
> "VirusTotalAdapter is our Adapter pattern from Lab 5.
> The ThreatIntelAgent only knows about the IThreatFeed interface.
> Behind the scenes it could be our mock list or the real VirusTotal API.
> The Adapter translates VirusTotal's response format into our standard format.
> This is identical to MediaAdapter from Lab 5 — it implements MediaPlayer
> but internally uses VlcPlayer or Mp4Player."

---

## Pattern 5 — Chain of Responsibility
**Category:** Behavioral | **Lab:** Lab 7

### What it is
A Chain of Responsibility is a line of handlers.
A request comes in and passes along the chain until someone handles it.
Each handler either handles it (if it matches) or passes it to the next one.

### The problem it solves in SentinelMind
When the Orchestrator receives a security finding, different severity levels
need different handling:
- LOW severity → just log it
- MEDIUM severity → log it + run threat intelligence check
- HIGH severity → log + threat intel + classify the attack technique
- CRITICAL severity → everything above + trigger automatic response

Instead of one giant `if/else` block, we chain the handlers.
Each handler in the chain handles its level and passes everything up the chain.

### Real-world analogy
Customer service escalation.
You call the call center → Level 1 handles basic questions.
If they can't help → escalates to Level 2 supervisor.
If still unresolved → escalates to the Manager.
This is EXACTLY the AbstractLogger chain from Lab 7.

### Where it lives in the code
**File:** `src/main/java/com/sentinelmind/orchestrator/handlers/`

```java
/**
 * AbstractEventHandler — Chain of Responsibility base class
 *
 * This is our AbstractLogger from Lab 7.
 * Each handler has a severity level it handles AND a reference
 * to the next handler in the chain.
 *
 * The chain: LowSeverityHandler → MediumSeverityHandler
 *          → HighSeverityHandler → CriticalSeverityHandler
 */
public abstract class AbstractEventHandler {

    // Severity levels — same idea as INFO=1, DEBUG=2, ERROR=3 in Lab 7
    public static final int LOW      = 1;
    public static final int MEDIUM   = 2;
    public static final int HIGH     = 3;
    public static final int CRITICAL = 4;

    protected int handlerLevel;
    protected AbstractEventHandler nextHandler;  // The next handler in the chain

    // Set the next handler (used when building the chain)
    public void setNextHandler(AbstractEventHandler next) {
        this.nextHandler = next;
    }

    // Pass the finding along the chain
    public void handle(Finding finding) {
        if (this.handlerLevel <= finding.getSeverityLevel()) {
            process(finding);  // This handler does its work
        }
        if (nextHandler != null) {
            nextHandler.handle(finding);  // Pass up the chain
        }
    }

    // Each subclass defines what it actually does
    protected abstract void process(Finding finding);
}

// -----------------------------------------------------------------

/**
 * LowSeverityHandler — handles ALL findings (logs them all)
 * Like ConsoleLogger in Lab 7 — handles INFO level and above
 */
@Component
public class LowSeverityHandler extends AbstractEventHandler {

    public LowSeverityHandler() {
        this.handlerLevel = LOW;
    }

    @Override
    protected void process(Finding finding) {
        // Always log every finding to the audit trail
        System.out.println("[AUDIT LOG] Finding received: " + finding.getDescription());
    }
}

// -----------------------------------------------------------------

/**
 * MediumSeverityHandler — handles MEDIUM, HIGH, CRITICAL
 * Triggers a Threat Intelligence check
 */
@Component
public class MediumSeverityHandler extends AbstractEventHandler {

    private final AgentFactory agentFactory;

    public MediumSeverityHandler(AgentFactory agentFactory) {
        this.handlerLevel = MEDIUM;
        this.agentFactory = agentFactory;
    }

    @Override
    protected void process(Finding finding) {
        // Dispatch Threat Intelligence agent
        System.out.println("[THREAT INTEL] Running IP reputation check for: "
            + finding.getSourceIp());
        agentFactory.getAgent("THREAT_INTEL").process(finding);
    }
}

// -----------------------------------------------------------------

/**
 * CriticalSeverityHandler — handles CRITICAL only
 * Triggers the full automated response (block IP, revoke session, notify)
 */
@Component
public class CriticalSeverityHandler extends AbstractEventHandler {

    private final AgentFactory agentFactory;

    public CriticalSeverityHandler(AgentFactory agentFactory) {
        this.handlerLevel = CRITICAL;
        this.agentFactory = agentFactory;
    }

    @Override
    protected void process(Finding finding) {
        System.out.println("[CRITICAL RESPONSE] Triggering automated response!");
        agentFactory.getAgent("RESPONDER").process(finding);
    }
}
```

**How the Orchestrator builds and uses the chain:**
```java
// Build the chain: LOW → MEDIUM → HIGH → CRITICAL
// (Same as errorLogger → fileLogger → consoleLogger in Lab 7)
LowSeverityHandler low         = new LowSeverityHandler();
MediumSeverityHandler medium   = new MediumSeverityHandler(agentFactory);
HighSeverityHandler high       = new HighSeverityHandler(agentFactory);
CriticalSeverityHandler critical = new CriticalSeverityHandler(agentFactory);

low.setNextHandler(medium);
medium.setNextHandler(high);
high.setNextHandler(critical);

// Now when a finding arrives, just pass it to the start of the chain
low.handle(incomingFinding);
// It automatically flows through LOW → MEDIUM → HIGH → CRITICAL
// Each handler that matches does its work and passes it on
```

### What to say in the viva
> "Our Orchestrator uses Chain of Responsibility from Lab 7.
> When a security finding comes in, it enters at the LowSeverityHandler.
> LOW just logs it. MEDIUM adds a threat intel check. CRITICAL triggers
> the full automated response. Each handler passes the finding up the chain.
> It's the same structure as AbstractLogger — ConsoleLogger handles INFO,
> FileLogger handles DEBUG, ErrorLogger handles ERROR."

---

## Pattern 6 — Command
**Category:** Behavioral | **Lab:** Lab 7

### What it is
The Command pattern wraps an action inside an object.
Instead of calling a method directly, you create a Command object
that represents "do this action." Then you give it to an Invoker
that decides when to execute it.

This gives you three powerful abilities:
- **Queue** commands (do them in order)
- **Log** commands (record what was done)
- **Undo** commands (reverse the action)

### The problem it solves in SentinelMind
The Incident Responder needs to take multiple actions when it responds:
block the IP, revoke the session, force a password reset, notify on-call.
Each action needs to be logged with a timestamp, confidence score, and
a rollback token in case the response was wrong and needs to be undone.

Wrapping each action as a Command object gives us this for free.

### Real-world analogy
A waiter taking your order at a restaurant.
The waiter writes your order on a notepad (the Command object).
He doesn't run to the kitchen immediately — he collects all orders, then
passes them all at once. The kitchen executes them.
If there's a mistake, the waiter can cancel a specific order.
This is exactly BuyStock/SellStock + Broker from Lab 7.

### Where it lives in the code
**File:** `src/main/java/com/sentinelmind/agents/responder/`

```java
/**
 * ResponseCommand — The Command interface
 *
 * This is our Order interface from Lab 7.
 * Every response action (block IP, revoke session, etc.)
 * must implement this interface.
 */
public interface ResponseCommand {
    void execute();    // Do the action
    void undo();       // Reverse the action (rollback)
    String describe(); // Human-readable description for the audit log
}

// -----------------------------------------------------------------

/**
 * BlockIpCommand — Blocks a malicious IP address
 *
 * This is our BuyStock from Lab 7 — a concrete Command.
 */
public class BlockIpCommand implements ResponseCommand {

    private final String ipAddress;
    private final String rollbackToken;

    public BlockIpCommand(String ipAddress) {
        this.ipAddress = ipAddress;
        this.rollbackToken = "UNBLOCK-" + ipAddress + "-" + System.currentTimeMillis();
    }

    @Override
    public void execute() {
        // In real life: call firewall API. In demo: log it.
        System.out.println("[RESPONSE] BLOCKING IP: " + ipAddress);
        // firewall.blockIp(ipAddress);
    }

    @Override
    public void undo() {
        System.out.println("[ROLLBACK] UNBLOCKING IP: " + ipAddress
            + " | Token: " + rollbackToken);
    }

    @Override
    public String describe() {
        return "Blocked IP address: " + ipAddress
            + " | Rollback token: " + rollbackToken;
    }
}

// -----------------------------------------------------------------

/**
 * RevokeSessionCommand — Kills the attacker's active session
 */
public class RevokeSessionCommand implements ResponseCommand {

    private final String userId;
    private final String sessionId;

    public RevokeSessionCommand(String userId, String sessionId) {
        this.userId = userId;
        this.sessionId = sessionId;
    }

    @Override
    public void execute() {
        System.out.println("[RESPONSE] REVOKING SESSION for user: " + userId);
        // sessionStore.invalidate(sessionId);
    }

    @Override
    public void undo() {
        System.out.println("[ROLLBACK] Cannot restore session — user must log in again.");
    }

    @Override
    public String describe() {
        return "Revoked session " + sessionId + " for user: " + userId;
    }
}

// -----------------------------------------------------------------

/**
 * ForcePasswordResetCommand — Forces the compromised account to reset password
 */
public class ForcePasswordResetCommand implements ResponseCommand {

    private final String userId;

    public ForcePasswordResetCommand(String userId) {
        this.userId = userId;
    }

    @Override
    public void execute() {
        System.out.println("[RESPONSE] FORCING PASSWORD RESET for: " + userId);
    }

    @Override
    public void undo() {
        System.out.println("[ROLLBACK] Password reset cannot be undone automatically.");
    }

    @Override
    public String describe() {
        return "Forced password reset for user: " + userId;
    }
}

// -----------------------------------------------------------------

/**
 * IncidentResponderAgent — The INVOKER (like Broker from Lab 7)
 *
 * This is our Broker. It collects all the Response Commands,
 * then executes them all in order and logs every action.
 *
 * The Orchestrator tells it WHAT to do by adding commands.
 * The Responder decides WHEN and HOW to execute them.
 */
@Component
public class IncidentResponderAgent implements ISecurityAgent {

    private final AuditLogRepository auditLog;
    private final List<ResponseCommand> commandQueue = new ArrayList<>();

    public IncidentResponderAgent(AuditLogRepository auditLog) {
        this.auditLog = auditLog;
    }

    // Orchestrator adds commands one by one
    public void addCommand(ResponseCommand command) {
        commandQueue.add(command);
    }

    // Execute all queued commands and log each one
    public void executePlaybook(String incidentId) {
        System.out.println("[RESPONDER] Executing response playbook for incident: " + incidentId);

        for (ResponseCommand command : commandQueue) {
            command.execute();
            // Log every action to PostgreSQL with full audit trail
            auditLog.save(new AuditEntry(incidentId, command.describe(), System.currentTimeMillis()));
        }

        commandQueue.clear();
        System.out.println("[RESPONDER] Playbook complete. All actions logged.");
    }
}
```

**How the Orchestrator uses it:**
```java
// When confidence >= 0.92 and severity is CRITICAL:
responderAgent.addCommand(new BlockIpCommand("185.220.101.47"));
responderAgent.addCommand(new RevokeSessionCommand("ahmed@company.com", sessionId));
responderAgent.addCommand(new ForcePasswordResetCommand("ahmed@company.com"));
responderAgent.executePlaybook(incident.getIncidentId());
// Every action is automatically logged to PostgreSQL
```

### What to say in the viva
> "IncidentResponderAgent uses the Command pattern from Lab 7.
> Each response action — BlockIpCommand, RevokeSessionCommand,
> ForcePasswordResetCommand — is a Command object implementing the execute() method.
> The IncidentResponder is the Broker — it collects commands and fires them.
> This lets us log every action, queue them, and even roll them back if needed.
> Identical structure to BuyStock/SellStock + Broker from Lab 7."

---

## Pattern 7 — Strategy (Bonus)
**Category:** Behavioral | **Status:** Bonus / extra credit (not from Ms. Maham's labs)

### What it is
The Strategy pattern lets you define a family of algorithms, put each one in its
own class, and switch between them at runtime — without changing the code that
uses them.

### The problem it solves in SentinelMind
The Threat Classifier needs to map observed behaviors to MITRE ATT&CK techniques.
There are two ways to do this:
1. **Rule-based** — fast, deterministic, works offline. Checks a hard-coded list
   of known patterns ("Tor IP + off-hours login + robotic latency = T1110.004").
2. **LLM-based** — flexible, handles novel patterns, but slower and costs money.
   Sends the event description to Claude/GPT-4 and asks it to classify.

The Strategy pattern lets the classifier switch between these two approaches at
runtime (controlled by Spring profile or a config flag) without the Classifier
class itself knowing which one it's using.

### Real-world analogy
A GPS navigation app that can route by fastest time, shortest distance, or avoid
tolls. The driver picks a strategy. The app uses it. The underlying road data
doesn't change — only which algorithm is applied to it.

### Where it lives in the code
**Files:** `src/main/java/com/sentinelmind/agents/classifier/`

```java
/**
 * ClassificationStrategy — Strategy interface
 *
 * Both classification approaches (rule-based and LLM) must implement this.
 * The ThreatClassifierAgent only knows about this interface — it never
 * calls RuleBasedStrategy or LlmStrategy directly.
 */
public interface ClassificationStrategy {
    ClassificationResult classify(Finding finding);
}

// -----------------------------------------------------------------

/**
 * RuleBasedStrategy — fast, offline classification
 *
 * Checks the finding against a hard-coded map of known patterns.
 * This is the DEFAULT strategy used in mock/demo mode.
 * @Profile is NOT needed here since it's the default — it's always available.
 */
@Component
public class RuleBasedStrategy implements ClassificationStrategy {

    @Override
    public ClassificationResult classify(Finding finding) {
        // Tor IP + off-hours (22-06) + low latency (<500ms) → credential stuffing
        if (finding.isTorIp()
                && (finding.getHour() >= 22 || finding.getHour() <= 6)
                && finding.getLoginLatencyMs() < 500) {
            return new ClassificationResult(
                List.of("T1078", "T1110.004"),
                List.of("Valid Accounts", "Credential Stuffing"),
                1.0,
                "Rule match: Tor exit node + off-hours + robotic login speed"
            );
        }
        // Add more rules for other attack patterns here
        return ClassificationResult.unknown();
    }
}

// -----------------------------------------------------------------

/**
 * LlmStrategy — flexible classification for novel patterns
 *
 * Calls the LLM API when rule-based matching returns unknown.
 * Only active under @Profile("real") — never called in demo/mock mode.
 * This avoids API costs during development and demos.
 */
@Component
@Profile("real")
public class LlmStrategy implements ClassificationStrategy {

    private final LlmApiClient llmClient;

    public LlmStrategy(LlmApiClient llmClient) {
        this.llmClient = llmClient;
    }

    @Override
    public ClassificationResult classify(Finding finding) {
        String prompt = "Analyze this security event and return MITRE ATT&CK technique IDs: "
            + finding.toDescription();
        String response = llmClient.complete(prompt);
        return ClassificationResult.parseFromLlm(response);
    }
}

// -----------------------------------------------------------------

/**
 * ThreatClassifierAgent — the Strategy CONTEXT
 *
 * Uses whichever ClassificationStrategy is injected by Spring.
 * In mock profile: gets RuleBasedStrategy.
 * In real profile: gets LlmStrategy (if it returns unknown, falls back to rule-based).
 *
 * The agent never knows which strategy is active. This is the Strategy pattern.
 */
@Component
public class ThreatClassifierAgent implements ISecurityAgent {

    private final ClassificationStrategy primaryStrategy;
    private final RuleBasedStrategy fallbackStrategy;  // always available

    public ThreatClassifierAgent(ClassificationStrategy primaryStrategy,
                                  RuleBasedStrategy fallbackStrategy) {
        this.primaryStrategy = primaryStrategy;
        this.fallbackStrategy = fallbackStrategy;
    }

    public Finding analyze(SecurityEvent event) {
        ClassificationResult result = primaryStrategy.classify(buildFinding(event));

        // If primary strategy returns unknown, fall back to rules
        if (result.isUnknown()) {
            result = fallbackStrategy.classify(buildFinding(event));
        }

        return Finding.builder()
            .mitreIds(result.getTechniqueIds())
            .mitreNames(result.getTechniqueNames())
            .confidence(result.getConfidence())
            .reason(result.getReason())
            .build();
    }
}
```

### What to say in the viva
> "Strategy is our bonus pattern — it's not from a specific lab but it's a
> well-known Gang of Four pattern. The ThreatClassifier uses it to switch between
> rule-based classification and LLM-based classification. In demo mode, only the
> rule-based strategy runs — it's fast and works offline. In production mode, the
> LLM strategy handles novel patterns the rules don't know about. The Classifier
> never knows which one is active — it just calls classify() on whatever was
> injected. That's the Strategy pattern."

---

## Summary Table — for quick viva reference

| # | Pattern | Lab | Category | Class in SentinelMind | Status | The Key Benefit |
|---|---|---|---|---|---|---|
| 1 | Singleton | Lab 2 | Creational | `KnowledgeGraphService` | **Mandatory** | One Neo4j connection shared by all agents |
| 2 | Factory | Lab 3 | Creational | `AgentFactory` | **Mandatory** | Orchestrator gets agents without knowing their classes |
| 3 | Builder | Lab 4 | Creational | `IncidentReport.Builder` | **Mandatory** | Assembles complex incident report step by step |
| 4 | Adapter | Lab 5 | Structural | `VirusTotalAdapter` | **Mandatory** | Wraps VirusTotal API behind standard `IThreatFeed` interface |
| 5 | Chain of Responsibility | Lab 7 | Behavioral | `AbstractEventHandler` chain | **Mandatory** | LOW→MEDIUM→HIGH→CRITICAL severity escalation |
| 6 | Command | Lab 7 | Behavioral | `BlockIpCommand`, `RevokeSessionCommand`, etc. | **Mandatory** | Each response action is loggable, queueable, undoable |
| 7 | Strategy | Bonus | Behavioral | `RuleBasedStrategy` / `LlmStrategy` | **Bonus** | Classifier swaps algorithms at runtime without changing its own code |

**Clean story for the viva:**
> "We implemented all 6 mandatory patterns from Ms. Maham's Labs 2–7, plus one
> bonus pattern (Strategy) for extra credit. That gives us 7 patterns total."

---

## How Claude Code should use this file

When building each component:
1. `KnowledgeGraphService` → implement as Singleton (@Service Spring bean)
2. `AgentFactory` → implement exactly as shown above
3. `IncidentReport` → implement with inner Builder class
4. `ThreatIntelAgent` → create `IThreatFeed` interface, `MockThreatFeed`, `VirusTotalAdapter`
5. Orchestrator handlers → extend `AbstractEventHandler`, build the chain
6. `IncidentResponderAgent` → implement `ResponseCommand` interface + 3 concrete commands
7. `ThreatClassifierAgent` → implement `ClassificationStrategy` interface + `RuleBasedStrategy`
   (mandatory) + `LlmStrategy` (@Profile("real"), optional/bonus)

Every pattern must have a comment at the top of the class explaining its role
in plain English — this is the viva cheat-sheet built into the code itself.

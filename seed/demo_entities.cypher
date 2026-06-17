// ─── Runtime demo entities ───────────────────────────────────────────────────

// ─── Users ───────────────────────────────────────────────────────────────────
// The victim user — normally logs in from Pakistan during business hours
CREATE (:User {id:'user-001', email:'ahmed@targetcorp.com', name:'Ahmed', department:'Finance', role:'Financial Analyst', riskScore:0.2, typicalCountry:'PK', typicalHourStart:9, typicalHourEnd:18, baselineLoginCount:245, avgLoginHour:10.5, stdDevLoginHour:2.1, avgLatencyMs:1850.0, stdDevLatencyMs:420.0});

// Additional users for the organisation baseline
CREATE (:User {id:'user-002', email:'fatima@targetcorp.com', name:'Fatima', department:'Finance', role:'Finance Manager', riskScore:0.15, typicalCountry:'PK', typicalHourStart:9, typicalHourEnd:17, baselineLoginCount:310, avgLoginHour:9.5, stdDevLoginHour:1.8, avgLatencyMs:1650.0, stdDevLatencyMs:380.0});
CREATE (:User {id:'user-003', email:'sarah@targetcorp.com', name:'Sarah', department:'HR', role:'HR Director', riskScore:0.1, typicalCountry:'PK', typicalHourStart:8, typicalHourEnd:17, baselineLoginCount:280, avgLoginHour:9.0, stdDevLoginHour:1.5, avgLatencyMs:1720.0, stdDevLatencyMs:350.0});

// ─── Departments ─────────────────────────────────────────────────────────────
CREATE (:Department {id:'dept-finance', name:'Finance', headCount:12, criticalityLevel:'HIGH'});
CREATE (:Department {id:'dept-hr', name:'HR', headCount:8, criticalityLevel:'MEDIUM'});
CREATE (:Department {id:'dept-engineering', name:'Engineering', headCount:25, criticalityLevel:'HIGH'});

// ─── Assets ──────────────────────────────────────────────────────────────────
CREATE (:Asset {id:'asset-payroll', name:'Payroll System', type:'Financial', criticality:'CRITICAL', dataClassification:'CONFIDENTIAL'});
CREATE (:Asset {id:'asset-customer-db', name:'Customer Database', type:'Database', criticality:'CRITICAL', dataClassification:'PII'});
CREATE (:Asset {id:'asset-admin-portal', name:'Admin Portal', type:'Management', criticality:'HIGH', dataClassification:'INTERNAL'});
CREATE (:Asset {id:'asset-vendor-contracts', name:'Vendor Contracts', type:'Financial', criticality:'HIGH', dataClassification:'CONFIDENTIAL'});
CREATE (:Asset {id:'asset-employee-records', name:'Employee Records', type:'HR', criticality:'HIGH', dataClassification:'PII'});

// ─── Threat Actors (intel context) ───────────────────────────────────────────
CREATE (:ThreatActor {id:'ta-credential-stuffer', name:'Credential Stuffer', type:'Cybercriminal', sophistication:'MEDIUM', firstSeen:'2023-06-10', campaignCount:47});
CREATE (:ThreatActor {id:'ta-tor-infra', name:'Tor Infrastructure', type:'Infrastructure', sophistication:'LOW', firstSeen:'2022-01-01', campaignCount:200});
CREATE (:ThreatActor {id:'ta-apt-sim', name:'APT Simulation', type:'Red Team', sophistication:'HIGH', firstSeen:'2024-01-01', campaignCount:3});

// ─── IP addresses ────────────────────────────────────────────────────────────
// The attacker IP — a known Tor exit node, in 4 threat feeds
CREATE (:IP {address:'185.220.101.47', isTorNode:true, country:'RU', reputation:'MALICIOUS', feedCount:4, lastSeen:'2024-01-15', blocked:false});
// Benign reference IP
CREATE (:IP {address:'8.8.8.8', isTorNode:false, country:'US', reputation:'CLEAN', feedCount:0, lastSeen:'2024-06-01', blocked:false});

// ─── Services ────────────────────────────────────────────────────────────────
// The target service
CREATE (:Service {id:'svc-auth', name:'AuthService', criticality:'HIGH'});

// ─── Baseline relationships ──────────────────────────────────────────────────
// Users → Departments
MATCH (u:User {id:'user-001'}), (d:Department {id:'dept-finance'}) CREATE (u)-[:BELONGS_TO]->(d);
MATCH (u:User {id:'user-002'}), (d:Department {id:'dept-finance'}) CREATE (u)-[:BELONGS_TO]->(d);
MATCH (u:User {id:'user-003'}), (d:Department {id:'dept-hr'})      CREATE (u)-[:BELONGS_TO]->(d);

// Users → Assets (access permissions)
MATCH (u:User {id:'user-001'}), (a:Asset {id:'asset-payroll'})          CREATE (u)-[:HAS_ACCESS_TO]->(a);
MATCH (u:User {id:'user-001'}), (a:Asset {id:'asset-vendor-contracts'}) CREATE (u)-[:HAS_ACCESS_TO]->(a);
MATCH (u:User {id:'user-002'}), (a:Asset {id:'asset-payroll'})          CREATE (u)-[:HAS_ACCESS_TO]->(a);
MATCH (u:User {id:'user-002'}), (a:Asset {id:'asset-customer-db'})      CREATE (u)-[:HAS_ACCESS_TO]->(a);
MATCH (u:User {id:'user-003'}), (a:Asset {id:'asset-employee-records'}) CREATE (u)-[:HAS_ACCESS_TO]->(a);
MATCH (u:User {id:'user-003'}), (a:Asset {id:'asset-admin-portal'})     CREATE (u)-[:HAS_ACCESS_TO]->(a);

// Asset → Asset (internal system connections — for blast radius traversal)
MATCH (a1:Asset {id:'asset-payroll'}), (a2:Asset {id:'asset-vendor-contracts'}) CREATE (a1)-[:CONNECTED_TO]->(a2);
MATCH (a1:Asset {id:'asset-customer-db'}), (a2:Asset {id:'asset-admin-portal'}) CREATE (a1)-[:CONNECTED_TO]->(a2);

// Threat Actors → IPs (attribution)
MATCH (ta:ThreatActor {id:'ta-credential-stuffer'}), (ip:IP {address:'185.220.101.47'}) CREATE (ta)-[:OPERATES_FROM]->(ip);
MATCH (ta:ThreatActor {id:'ta-tor-infra'}), (ip:IP {address:'185.220.101.47'})          CREATE (ta)-[:OPERATES_FROM]->(ip);

// Attacker IP → User and Service (existing relationships kept)
MATCH (u:User {email:'ahmed@targetcorp.com'}), (ip:IP {address:'185.220.101.47'}) CREATE (ip)-[:TARGETS]->(u);
MATCH (ip:IP {address:'185.220.101.47'}), (s:Service {id:'svc-auth'}) CREATE (ip)-[:COMMUNICATES_WITH]->(s);

// Lateral movement path
MATCH (u:User {email:'ahmed@targetcorp.com'}), (a:Asset {id:'asset-payroll'}) CREATE (u)-[:LATERAL_MOVE_TO]->(a);

// ─── CVE data for VulnerabilityScannerAgent ───────────────────────────────────
// Package nodes + CVE nodes connected by AFFECTED_BY relationships.
// EPSS score = probability this CVE is actively exploited in the wild (0–1).
// Results sorted by EPSS (not CVSS) so the most dangerous CVEs surface first.

// log4j-core — affected by Log4Shell (the most exploited CVE of 2021)
CREATE (:Package {name:'log4j-core', latestSafe:'2.17.2'});
CREATE (:CVE {id:'CVE-2021-44228', description:'Log4Shell: Remote code execution via JNDI lookup in log4j-core < 2.15.0. Attacker sends a crafted string like ${jndi:ldap://...} and the logging library resolves it, loading arbitrary code.', cvssScore:10.0, epssScore:0.97531, severity:'CRITICAL'});
CREATE (:CVE {id:'CVE-2021-45046', description:'Incomplete fix for CVE-2021-44228: context lookup patterns still allow RCE in certain non-default configs.', cvssScore:9.0, epssScore:0.89412, severity:'CRITICAL'});
MATCH (p:Package {name:'log4j-core'}), (c:CVE {id:'CVE-2021-44228'}) CREATE (p)-[:AFFECTED_BY]->(c);
MATCH (p:Package {name:'log4j-core'}), (c:CVE {id:'CVE-2021-45046'}) CREATE (p)-[:AFFECTED_BY]->(c);

// spring-core — affected by Spring4Shell
CREATE (:Package {name:'spring-core', latestSafe:'5.3.18'});
CREATE (:CVE {id:'CVE-2022-22965', description:'Spring4Shell: Remote code execution in Spring MVC/WebFlux apps running on JDK 9+ via class loader manipulation through DataBinder.', cvssScore:9.8, epssScore:0.95033, severity:'CRITICAL'});
MATCH (p:Package {name:'spring-core'}), (c:CVE {id:'CVE-2022-22965'}) CREATE (p)-[:AFFECTED_BY]->(c);

// jackson-databind — affected by polymorphic deserialization RCE
CREATE (:Package {name:'jackson-databind', latestSafe:'2.13.4.2'});
CREATE (:CVE {id:'CVE-2022-42003', description:'Jackson-databind deep wrapper array nesting can cause a denial of service via stack overflow.', cvssScore:7.5, epssScore:0.18245, severity:'HIGH'});
MATCH (p:Package {name:'jackson-databind'}), (c:CVE {id:'CVE-2022-42003'}) CREATE (p)-[:AFFECTED_BY]->(c);

// Link the AuthService to its dependencies so forensics traversals find them
MATCH (s:Service {id:'svc-auth'}), (p:Package {name:'spring-core'})      CREATE (s)-[:USES]->(p);
MATCH (s:Service {id:'svc-auth'}), (p:Package {name:'log4j-core'})       CREATE (s)-[:USES]->(p);
MATCH (s:Service {id:'svc-auth'}), (p:Package {name:'jackson-databind'}) CREATE (s)-[:USES]->(p);

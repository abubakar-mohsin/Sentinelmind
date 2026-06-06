// ─── Runtime demo entities ───────────────────────────────────────────────────

// The victim user — normally logs in from Pakistan during business hours
CREATE (:User {id:'user-001', email:'ahmed@targetcorp.com', department:'Finance', typicalCountry:'PK', typicalHourStart:9, typicalHourEnd:18, baselineLoginCount:245, avgLoginHour:10.5, stdDevLoginHour:2.1, avgLatencyMs:1850.0, stdDevLatencyMs:420.0});

// The attacker IP — a known Tor exit node, in 4 threat feeds
CREATE (:IP {address:'185.220.101.47', isTorNode:true, country:'RU', reputation:'MALICIOUS', feedCount:4, lastSeen:'2024-01-15'});

// The target service
CREATE (:Service {id:'svc-auth', name:'AuthService', criticality:'HIGH'});

// Relationships: attacker IP targets the user and communicates with the service
MATCH (u:User {email:'ahmed@targetcorp.com'}), (ip:IP {address:'185.220.101.47'}) CREATE (ip)-[:TARGETS]->(u);
MATCH (ip:IP {address:'185.220.101.47'}), (s:Service {id:'svc-auth'}) CREATE (ip)-[:COMMUNICATES_WITH]->(s);

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

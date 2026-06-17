// cve_seed.cypher — 10 high-profile CVE nodes for the Vulnerability Scanner demo.
// Each CVE is tagged with affectedPackage so scanPackage() can match directly
// without needing a separate Package node — keeps the schema simple.
//
// Priority scoring formula (used in VulnerabilityScannerAgent):
//   priority = (epss * 0.60) + ((cvss / 10.0) * 0.30)
//            + (exploitedInWild ? 0.07 : 0.0)
//            + (cisaKev ? 0.03 : 0.0)
// EPSS = exploitation probability (0.0–1.0), CVSS = theoretical severity (0–10)

// ── CVE-2021-44228 — Log4Shell (log4j-core) ──────────────────────────────
MERGE (c:CVE {id: 'CVE-2021-44228'})
SET c.affectedPackage   = 'log4j-core',
    c.description       = 'Apache Log4j2 JNDI lookup remote code execution (Log4Shell). ' +
                          'Attacker sends a crafted log message containing a JNDI URI that causes ' +
                          'the server to reach out to an attacker-controlled LDAP server and execute arbitrary code.',
    c.cvssScore         = 10.0,
    c.epssScore         = 0.975,
    c.severity          = 'CRITICAL',
    c.exploitedInWild   = true,
    c.cisaKev           = true,
    c.affectedVersions  = '<2.15.0',
    c.patchedVersion    = '2.15.0',
    c.publishedDate     = '2021-12-10';

// ── CVE-2022-22965 — Spring4Shell (spring-webmvc) ─────────────────────────
MERGE (c:CVE {id: 'CVE-2022-22965'})
SET c.affectedPackage   = 'spring-webmvc',
    c.description       = 'Spring Framework RCE via DataBinder on JDK 9+ (Spring4Shell). ' +
                          'A Spring MVC or Spring WebFlux application running on JDK 9+ may be vulnerable ' +
                          'to remote code execution via data binding.',
    c.cvssScore         = 9.8,
    c.epssScore         = 0.971,
    c.severity          = 'CRITICAL',
    c.exploitedInWild   = true,
    c.cisaKev           = true,
    c.affectedVersions  = '<5.3.18,<5.2.20',
    c.patchedVersion    = '5.3.18',
    c.publishedDate     = '2022-03-31';

// ── CVE-2017-5638 — Apache Struts RCE (struts2-core) ─────────────────────
MERGE (c:CVE {id: 'CVE-2017-5638'})
SET c.affectedPackage   = 'struts2-core',
    c.description       = 'Apache Struts Jakarta Multipart parser RCE. ' +
                          'The Jakarta Multipart parser in Apache Struts 2 allows remote attackers to ' +
                          'execute arbitrary commands via a #cmd= string in a crafted Content-Type header. ' +
                          'Exploited in the Equifax breach (147M records).',
    c.cvssScore         = 10.0,
    c.epssScore         = 0.982,
    c.severity          = 'CRITICAL',
    c.exploitedInWild   = true,
    c.cisaKev           = true,
    c.affectedVersions  = '2.3.x before 2.3.32, 2.5.x before 2.5.10.1',
    c.patchedVersion    = '2.3.32',
    c.publishedDate     = '2017-03-10';

// ── CVE-2020-36518 — Jackson Databind DoS (jackson-databind) ─────────────
MERGE (c:CVE {id: 'CVE-2020-36518'})
SET c.affectedPackage   = 'jackson-databind',
    c.description       = 'Jackson Databind allows a Java StackOverflow exception and denial of service ' +
                          'via a large depth of nested objects. Affects deeply nested JSON deserialization.',
    c.cvssScore         = 7.5,
    c.epssScore         = 0.152,
    c.severity          = 'HIGH',
    c.exploitedInWild   = false,
    c.cisaKev           = false,
    c.affectedVersions  = '<2.13.2.1',
    c.patchedVersion    = '2.13.2.2',
    c.publishedDate     = '2022-03-11';

// ── CVE-2023-25194 — Apache Kafka JNDI RCE (kafka-clients) ───────────────
MERGE (c:CVE {id: 'CVE-2023-25194'})
SET c.affectedPackage   = 'kafka-clients',
    c.description       = 'Apache Kafka Connect REST API JNDI injection remote code execution. ' +
                          'By sending a specially crafted request to the Kafka Connect REST API, ' +
                          'an authenticated attacker with access to the Kafka cluster can execute ' +
                          'arbitrary code on the Kafka Connect worker nodes.',
    c.cvssScore         = 8.8,
    c.epssScore         = 0.624,
    c.severity          = 'HIGH',
    c.exploitedInWild   = true,
    c.cisaKev           = false,
    c.affectedVersions  = '2.3.0–3.3.2',
    c.patchedVersion    = '3.4.0',
    c.publishedDate     = '2023-02-07';

// ── CVE-2022-22978 — Spring Security Auth Bypass (spring-security-web) ───
MERGE (c:CVE {id: 'CVE-2022-22978'})
SET c.affectedPackage   = 'spring-security-web',
    c.description       = 'Spring Security RegexRequestMatcher authentication bypass. ' +
                          'Applications using RegexRequestMatcher with a pattern containing a dot (.) ' +
                          'may be vulnerable to authorization rule bypass in certain configurations.',
    c.cvssScore         = 9.8,
    c.epssScore         = 0.421,
    c.severity          = 'CRITICAL',
    c.exploitedInWild   = false,
    c.cisaKev           = false,
    c.affectedVersions  = '5.5.x before 5.5.7, 5.6.x before 5.6.4',
    c.patchedVersion    = '5.6.4',
    c.publishedDate     = '2022-05-19';

// ── CVE-2022-21724 — PostgreSQL JDBC driver RCE (postgresql) ─────────────
MERGE (c:CVE {id: 'CVE-2022-21724'})
SET c.affectedPackage   = 'postgresql',
    c.description       = 'PostgreSQL JDBC driver arbitrary code execution when attacker controls ' +
                          'the JDBC connection URL. The pgjdbc driver allows loading of arbitrary ' +
                          'classes from the classpath via the loggerLevel and loggerFile connection properties.',
    c.cvssScore         = 9.8,
    c.epssScore         = 0.381,
    c.severity          = 'CRITICAL',
    c.exploitedInWild   = false,
    c.cisaKev           = false,
    c.affectedVersions  = '<42.2.25,<42.3.2',
    c.patchedVersion    = '42.3.2',
    c.publishedDate     = '2022-02-02';

// ── CVE-2021-23463 — Neo4j Path Traversal (neo4j-java-driver) ────────────
MERGE (c:CVE {id: 'CVE-2021-23463'})
SET c.affectedPackage   = 'neo4j-java-driver',
    c.description       = 'Neo4j Java driver SSRF vulnerability. The Neo4j Java driver before 4.2.9 ' +
                          'allows server-side request forgery via Bolt connections to arbitrary hosts, ' +
                          'potentially allowing an attacker to reach internal network services.',
    c.cvssScore         = 7.5,
    c.epssScore         = 0.089,
    c.severity          = 'HIGH',
    c.exploitedInWild   = false,
    c.cisaKev           = false,
    c.affectedVersions  = '<4.2.9',
    c.patchedVersion    = '4.2.9',
    c.publishedDate     = '2021-12-09';

// ── CVE-2022-24816 — Netty HTTP request smuggling (netty-codec-http) ─────
MERGE (c:CVE {id: 'CVE-2022-24816'})
SET c.affectedPackage   = 'netty-codec-http',
    c.description       = 'Netty HTTP/2 codec allows HTTP request smuggling. Specially crafted ' +
                          'HTTP/2 headers can be used to cause a Netty server to misparse HTTP requests, ' +
                          'potentially allowing request smuggling and cache poisoning attacks.',
    c.cvssScore         = 6.5,
    c.epssScore         = 0.098,
    c.severity          = 'MEDIUM',
    c.exploitedInWild   = false,
    c.cisaKev           = false,
    c.affectedVersions  = '<4.1.76.Final',
    c.patchedVersion    = '4.1.76.Final',
    c.publishedDate     = '2022-04-06';

// ── CVE-2022-3171 — Google Protobuf DoS (protobuf-java) ──────────────────
MERGE (c:CVE {id: 'CVE-2022-3171'})
SET c.affectedPackage   = 'protobuf-java',
    c.description       = 'Google protobuf-java parsing DoS via crafted binary payload. ' +
                          'A parsing issue with binary data in protobuf-java allows a malicious actor ' +
                          'to send a crafted message that causes a temporary stack overflow, ' +
                          'resulting in a denial of service.',
    c.cvssScore         = 7.5,
    c.epssScore         = 0.243,
    c.severity          = 'HIGH',
    c.exploitedInWild   = false,
    c.cisaKev           = false,
    c.affectedVersions  = '<3.21.7',
    c.patchedVersion    = '3.21.7',
    c.publishedDate     = '2022-10-22';

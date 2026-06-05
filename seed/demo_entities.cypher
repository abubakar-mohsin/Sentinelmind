CREATE (:User {id:'user-001', email:'ahmed@targetcorp.com', department:'Finance', typicalCountry:'PK', typicalHourStart:9, typicalHourEnd:18, baselineLoginCount:245, avgLoginHour:10.5, stdDevLoginHour:2.1, avgLatencyMs:1850.0, stdDevLatencyMs:420.0});
CREATE (:IP {address:'185.220.101.47', isTorNode:true, country:'RU', reputation:'MALICIOUS', feedCount:4, lastSeen:'2024-01-15'});
CREATE (:Service {id:'svc-auth', name:'AuthService', criticality:'HIGH'});
MATCH (u:User {email:'ahmed@targetcorp.com'}), (ip:IP {address:'185.220.101.47'}) CREATE (ip)-[:TARGETS]->(u);
MATCH (ip:IP {address:'185.220.101.47'}), (s:Service {id:'svc-auth'}) CREATE (ip)-[:COMMUNICATES_WITH]->(s);

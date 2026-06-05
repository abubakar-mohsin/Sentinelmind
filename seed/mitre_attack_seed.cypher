CREATE (:AttackTactic {id:'TA0001', name:'Initial Access', description:'Attacker tries to get into your network'});
CREATE (:AttackTactic {id:'TA0006', name:'Credential Access', description:'Attacker tries to steal account names and passwords'});
CREATE (:AttackTechnique {id:'T1078', name:'Valid Accounts', tactic:'TA0001', description:'Adversary uses legitimate credentials to gain access', killChainPhase:'initial-access'});
CREATE (:AttackTechnique {id:'T1110.004', name:'Credential Stuffing', tactic:'TA0006', description:'Adversary uses lists of breached credentials to gain access', killChainPhase:'credential-access', parentTechnique:'T1110'});
MATCH (tac:AttackTactic {id:'TA0001'}), (tech:AttackTechnique {id:'T1078'}) CREATE (tech)-[:BELONGS_TO]->(tac);
MATCH (tac:AttackTactic {id:'TA0006'}), (tech:AttackTechnique {id:'T1110.004'}) CREATE (tech)-[:BELONGS_TO]->(tac);

import { Shield, Brain, Network, Search, AlertTriangle, GitBranch, Database, Zap } from 'lucide-react';

export const featuresData = [
  {
    id: 1,
    title: 'Orchestrator',
    date: 'Core Engine',
    content:
      'The ReAct reasoning loop. Consumes events, queries the Neo4j knowledge graph, delegates to agents, and decides when confidence is high enough to authorize automated response.',
    category: 'Core',
    icon: Brain,
    relatedIds: [2, 3, 4],
    status: 'completed',
    energy: 100,
  },
  {
    id: 2,
    title: 'Anomaly Detection',
    date: 'Layer 3',
    content:
      'Z-score behavioral analysis against per-user baselines. Detects unusual login times, countries, latency patterns. Adaptive — baselines update after every clean event.',
    category: 'Detection',
    icon: AlertTriangle,
    relatedIds: [1, 3],
    status: 'completed',
    energy: 92,
  },
  {
    id: 3,
    title: 'Threat Intel',
    date: 'Layer 2',
    content:
      'Checks every source IP against threat feeds. Mock mode uses a curated bad-IP list. Live mode queries VirusTotal in real time. Switchable at runtime without restart.',
    category: 'Intelligence',
    icon: Search,
    relatedIds: [1, 2, 4],
    status: 'completed',
    energy: 88,
  },
  {
    id: 4,
    title: 'MITRE Classifier',
    date: 'ATT&CK',
    content:
      'Maps observed behavior to MITRE ATT&CK techniques. Rule-based strategy for known patterns. Groq LLM strategy for novel attacks. Switches at runtime via Strategy pattern.',
    category: 'Classification',
    icon: GitBranch,
    relatedIds: [1, 3, 5],
    status: 'completed',
    energy: 85,
  },
  {
    id: 5,
    title: 'Incident Responder',
    date: 'Response',
    content:
      'Executes automated playbooks above 92% confidence. Block IP. Revoke session. Force password reset. Each action is a Command object — loggable, queueable, and reversible.',
    category: 'Response',
    icon: Shield,
    relatedIds: [4, 6],
    status: 'completed',
    energy: 96,
  },
  {
    id: 6,
    title: 'Knowledge Graph',
    date: 'Neo4j',
    content:
      'The shared memory of the entire system. Pre-loaded with MITRE ATT&CK. Enriched after every incident with ATTACKED, USED_TECHNIQUE, and PART_OF_CAMPAIGN relationships.',
    category: 'Data',
    icon: Network,
    relatedIds: [1, 5, 7],
    status: 'completed',
    energy: 90,
  },
  {
    id: 7,
    title: 'Forensics Agent',
    date: 'Analysis',
    content:
      'Post-incident graph traversal. Traces ATTACKED → COMMUNICATES_WITH → LATERAL_MOVE_TO relationships. Reconstructs full attack timeline with patient zero identification.',
    category: 'Forensics',
    icon: Database,
    relatedIds: [6, 8],
    status: 'completed',
    energy: 78,
  },
  {
    id: 8,
    title: 'Kafka Event Bus',
    date: 'Infrastructure',
    content:
      'The Observer pattern at infrastructure level. Orchestrator publishes, agents subscribe. Complete decoupling — no agent knows another exists. Durable, replayable, horizontally scalable.',
    category: 'Infrastructure',
    icon: Zap,
    relatedIds: [1, 2, 3, 4, 5],
    status: 'completed',
    energy: 95,
  },
];

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from './ws/useWebSocket';

import BootOverlay     from './components/BootOverlay';
import StatusBar       from './components/StatusBar';
import SimulateButton  from './components/SimulateButton';
import AgentPipeline   from './components/AgentPipeline';
import ThreatMatrix    from './components/ThreatMatrix';
import ResponseLog     from './components/ResponseLog';
import AlertQueue      from './components/AlertQueue';
import TopologyMap     from './components/TopologyMap';
import SystemMetrics   from './components/SystemMetrics';

/* ─── Initial state shapes ──────────────────────────────────── */

const INITIAL_AGENTS = {
  AnomalyDetectionAgent:  { status: 'IDLE', summary: null, elapsed: null, startTime: null },
  ThreatIntelAgent:       { status: 'IDLE', summary: null, elapsed: null, startTime: null },
  ThreatClassifierAgent:  { status: 'IDLE', summary: null, elapsed: null, startTime: null },
  IncidentResponderAgent: { status: 'IDLE', summary: null, elapsed: null, startTime: null },
};

const INITIAL_METRICS = {
  detectionMs:     null,
  responseMs:      null,
  confidence:      null,
  actionsExecuted: null,
};

/* ─── App ───────────────────────────────────────────────────── */

export default function App() {
  const { connected, lastMessage } = useWebSocket();

  // Boot overlay
  const [booted,         setBooted]        = useState(false);

  // Incident tracking
  const [incidentActive, setIncidentActive] = useState(false);
  const [currentId,      setCurrentId]      = useState(null);
  const [threatLevel,    setThreatLevel]    = useState('NOMINAL');
  const [contained,      setContained]      = useState(false);

  // Agent pipeline
  const [agentStates,    setAgentStates]    = useState(INITIAL_AGENTS);

  // Dashboard data
  const [classifiedData, setClassifiedData] = useState(null);
  const [responses,      setResponses]      = useState([]);
  const [incidents,      setIncidents]      = useState([]);
  const [metrics,        setMetrics]        = useState(INITIAL_METRICS);

  // Refs for timing (don't trigger re-renders)
  const currentIdRef    = useRef(null);
  const activatedAtRef  = useRef(null);
  const classifiedAtRef = useRef(null);

  /* ─── Message processor ──────────────────────────────────── */

  useEffect(() => {
    if (!lastMessage) return;
    const msg = lastMessage;

    /* Detect new incident — any message with a new incidentId resets state */
    if (msg.incidentId && msg.incidentId !== currentIdRef.current) {
      currentIdRef.current   = msg.incidentId;
      activatedAtRef.current = Date.now();
      classifiedAtRef.current = null;

      setCurrentId(msg.incidentId);
      setIncidentActive(true);
      setContained(false);
      setThreatLevel('ELEVATED');
      setAgentStates({ ...INITIAL_AGENTS });
      setResponses([]);
      setClassifiedData(null);
      setMetrics(INITIAL_METRICS);
    }

    switch (msg.type) {

      case 'AGENT_ACTIVATED':
        if (msg.agentName === 'OrchestratorAgent') break; // handled above by incidentId change
        setAgentStates(prev => ({
          ...prev,
          [msg.agentName]: {
            status:   'RUNNING',
            summary:  null,
            elapsed:  null,
            startTime: Date.now(),
          },
        }));
        break;

      case 'FINDING_CREATED':
        setAgentStates(prev => {
          const a = prev[msg.agentName];
          if (!a) return prev;
          return {
            ...prev,
            [msg.agentName]: {
              ...a,
              status:  'COMPLETE',
              summary: msg.summary || msg.message,
              elapsed: a.startTime ? Date.now() - a.startTime : null,
            },
          };
        });
        break;

      case 'INCIDENT_CLASSIFIED':
        classifiedAtRef.current = Date.now();
        setClassifiedData(msg);
        setThreatLevel(
          msg.severity === 'CRITICAL' ? 'CRITICAL' :
          msg.severity === 'HIGH'     ? 'ELEVATED' : 'ELEVATED'
        );
        setMetrics(prev => ({
          ...prev,
          confidence:   msg.confidence,
          detectionMs:  activatedAtRef.current
            ? Date.now() - activatedAtRef.current
            : null,
        }));
        setIncidents(prev =>
          [{ ...msg, receivedAt: Date.now() }, ...prev].slice(0, 10)
        );
        break;

      case 'RESPONSE_EXECUTED':
        setResponses(prev => [...prev, { ...msg, receivedAt: Date.now() }]);
        break;

      case 'INCIDENT_CONTAINED':
        setIncidentActive(false);
        setContained(true);
        setThreatLevel('NOMINAL');
        setMetrics(prev => ({
          ...prev,
          responseMs: classifiedAtRef.current
            ? Date.now() - classifiedAtRef.current
            : msg.totalElapsedMs,
          actionsExecuted: msg.actionsExecuted,
        }));
        setResponses(prev => [
          ...prev,
          { ...msg, isContained: true, receivedAt: Date.now() },
        ]);
        break;

      default:
        break;
    }
  }, [lastMessage]);

  /* ─── Render ─────────────────────────────────────────────── */

  return (
    <>
      {!booted && <BootOverlay onComplete={() => setBooted(true)} />}

      <div className="app-grid">

        <StatusBar
          connected={connected}
          incidentActive={incidentActive}
          currentIncidentId={currentId}
          threatLevel={threatLevel}
        />

        <SimulateButton disabled={incidentActive} />

        {/* LEFT: Incident queue */}
        <div className="grid-queue">
          <AlertQueue incidents={incidents} />
        </div>

        {/* CENTER: Pipeline + analysis panels */}
        <div className="grid-main">
          <AgentPipeline agentStates={agentStates} />

          <div className="grid-main-bottom">
            <ThreatMatrix classifiedData={classifiedData} />
            <ResponseLog  responses={responses} />
          </div>
        </div>

        {/* RIGHT: Topology map */}
        <div className="grid-topo">
          <TopologyMap
            attackActive={incidentActive}
            contained={contained}
          />
        </div>

        <SystemMetrics metrics={metrics} />

      </div>
    </>
  );
}

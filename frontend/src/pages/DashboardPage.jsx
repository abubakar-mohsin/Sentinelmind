import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket }    from '../ws/useWebSocket';
import Sidebar             from '../components/layout/Sidebar';
import DashboardHeader     from '../components/layout/DashboardHeader';
import AgentPipeline       from '../components/AgentPipeline';
import AIReasoningPanel    from '../components/AIReasoningPanel';
import ForensicsTimeline   from '../components/ForensicsTimeline';
import ThreatGraph         from '../components/ThreatGraph';
import GraphInsights       from '../components/GraphInsights';
import ThreatMatrix        from '../components/ThreatMatrix';
import ResponseLog         from '../components/ResponseLog';
import AlertQueue          from '../components/AlertQueue';
import TopologyMap         from '../components/TopologyMap';

/* ── Initial state shapes ───────────────────────── */

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

/* ── Stat card ──────────────────────────────────── */

function StatCard({ label, value, unit = '', sub, color }) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value" style={{ color: color || 'var(--text-1)' }}>
        {value != null ? `${typeof value === 'number' && value > 999 ? (value / 1000).toFixed(1) : value}${unit}` : '—'}
      </div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}

/* ── DashboardPage ──────────────────────────────── */

export default function DashboardPage() {
  const [activePage,     setActivePage]     = useState('overview');
  const [incidentActive, setIncidentActive] = useState(false);
  const [currentId,      setCurrentId]      = useState(null);
  const [threatLevel,    setThreatLevel]    = useState('NOMINAL');
  const [contained,      setContained]      = useState(false);
  const [agentStates,    setAgentStates]    = useState(INITIAL_AGENTS);
  const [classifiedData, setClassifiedData] = useState(null);
  const [responses,      setResponses]      = useState([]);
  const [incidents,      setIncidents]      = useState([]);
  const [metrics,        setMetrics]        = useState(INITIAL_METRICS);
  const [reasoningSteps, setReasoningSteps] = useState([]);
  const [baseline,       setBaseline]       = useState(null);
  const [currentActor,   setCurrentActor]   = useState('ahmed@targetcorp.com');
  const [graphEvents,    setGraphEvents]    = useState([]);

  const currentIdRef    = useRef(null);
  const activatedAtRef  = useRef(null);
  const classifiedAtRef = useRef(null);

  /* ── Baseline fetcher ── */
  useEffect(() => {
    async function fetchBaseline() {
      try {
        const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';
        const headers = new Headers();
        headers.set('Authorization', 'Basic ' + btoa('admin:sentinelmind'));
        const res = await fetch(`${API_BASE}/api/baseline/${currentActor}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setBaseline(data);
        }
      } catch (err) {
        console.error('Failed to fetch baseline:', err);
      }
    }
    fetchBaseline();
  }, [currentActor, contained]); // Re-fetch when contained (attack finishes) so we see updates if it was normal

  /* ── Message processor ── */

  const handleMessage = useCallback((msg) => {
    if (msg.incidentId && msg.incidentId !== currentIdRef.current) {
      currentIdRef.current    = msg.incidentId;
      activatedAtRef.current  = Date.now();
      classifiedAtRef.current = null;
      setCurrentId(msg.incidentId);
      setIncidentActive(true);
      setContained(false);
      setThreatLevel('ELEVATED');
      setAgentStates({ ...INITIAL_AGENTS });
      setResponses([]);
      setClassifiedData(null);
      setMetrics(INITIAL_METRICS);
      setReasoningSteps([]);
    }

    switch (msg.type) {
      case 'AGENT_ACTIVATED':
        if (msg.agentName === 'OrchestratorAgent') {
          setReasoningSteps([]);
          break;
        }
        setAgentStates(prev => ({
          ...prev,
          [msg.agentName]: { status: 'RUNNING', summary: null, elapsed: null, startTime: Date.now() },
        }));
        break;

      case 'AI_REASONING':
        setReasoningSteps(prev => [...prev, {
          timestamp:  msg.timestamp,
          agentName:  msg.agentName,
          decision:   msg.agentStatus,
          reasoning:  msg.message,
          situation:  msg.summary,
          dataSource: msg.dataSource,
          stepNumber: prev.length + 1,
        }]);
        break;

      case 'FINDING_CREATED':
        setAgentStates(prev => {
          const a = prev[msg.agentName];
          if (!a) return prev;
          // For ThreatIntelAgent, also store usedRealApi and isMalicious so
          // AgentPipeline can show the VIRUSTOTAL LIVE / MOCK DATA badge.
          const extra = msg.agentName === 'ThreatIntelAgent'
            ? { usedRealApi: msg.usedRealApi, isMalicious: msg.confidence > 0 }
            : {};
          return {
            ...prev,
            [msg.agentName]: {
              ...a,
              status:  'COMPLETE',
              summary: msg.summary || msg.message,
              elapsed: a.startTime ? Date.now() - a.startTime : null,
              ...extra,
            },
          };
        });
        break;

      case 'CONFIDENCE_UPDATED':
        setMetrics(prev => ({
          ...prev,
          confidence: msg.confidence,
        }));
        break;

      case 'INCIDENT_CLASSIFIED':
        if (msg.actor) {
          setCurrentActor(msg.actor);
        } else if (msg.triggeringEvent && msg.triggeringEvent.actor) {
          setCurrentActor(msg.triggeringEvent.actor);
        }
        classifiedAtRef.current = Date.now();
        setClassifiedData(msg);
        setThreatLevel(msg.severity === 'CRITICAL' ? 'CRITICAL' : 'ELEVATED');
        setMetrics(prev => ({
          ...prev,
          confidence:  msg.confidence,
          detectionMs: activatedAtRef.current ? Date.now() - activatedAtRef.current : null,
        }));
        setIncidents(prev => [{ ...msg, receivedAt: Date.now() }, ...prev].slice(0, 10));
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
          responseMs:      classifiedAtRef.current ? Date.now() - classifiedAtRef.current : msg.totalElapsedMs,
          actionsExecuted: msg.actionsExecuted,
        }));
        setResponses(prev => [...prev, { ...msg, isContained: true, receivedAt: Date.now() }]);
        setAgentStates(prev => ({
          ...prev,
          IncidentResponderAgent: {
            ...prev.IncidentResponderAgent,
            status:  'COMPLETE',
            summary: `Playbook complete - ${msg.actionsExecuted} action${msg.actionsExecuted !== 1 ? 's' : ''} in ${msg.totalElapsedMs}ms`,
            elapsed: msg.totalElapsedMs,
          },
        }));
        break;

      case 'GRAPH_UPDATED':
        setGraphEvents(prev => [...prev, msg]);
        break;

      default: break;
    }
  }, []);

  const { connected } = useWebSocket(handleMessage);

  /* ── Helpers ── */

  function fmt(ms) {
    if (ms == null) return null;
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  }

  /* ── Render ── */

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        incidentActive={incidentActive}
        connected={connected}
        threatLevel={threatLevel}
        onNavigate={setActivePage}
      />

      <div className="main-content">
        <DashboardHeader
          activePage={activePage}
          incidentActive={incidentActive}
        />

        <div className="page-content">
          {baseline && (
            <div style={{ padding: '12px 20px', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
                <strong>User Baseline ({currentActor}):</strong> {baseline.sessionCount} sessions analyzed. Typical login: {baseline.typicalCountry}, {String(Math.max(0, Math.floor(baseline.avgLoginHour - 1))).padStart(2, '0')}:00-{String(Math.min(23, Math.floor(baseline.avgLoginHour + 8))).padStart(2, '0')}:00, avg latency {(baseline.avgLatencyMs / 1000).toFixed(1)}s.
              </span>
            </div>
          )}
          {activePage === 'forensics' ? (
            <ForensicsTimeline incidentId={currentId} />
          ) : activePage === 'threat-graph' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <ThreatGraph
                graphEvents={graphEvents}
                incidentId={currentId}
                incidentActive={incidentActive}
                contained={contained}
                currentActor={currentActor}
              />
              <GraphInsights
                graphNodes={[]}
                graphEdges={[]}
              />
            </div>
          ) : (
            <>
              {/* Stats row */}
              <div className="stats-row">
                <StatCard
                  label="Active Threats"
                  value={incidentActive ? 1 : contained ? 0 : null}
                  color={incidentActive ? 'var(--danger)' : contained ? 'var(--success)' : undefined}
                  sub={incidentActive ? 'Investigating…' : contained ? 'Contained' : 'No active threats'}
                />
                <StatCard
                  label="Detection Time"
                  value={metrics.detectionMs != null ? (metrics.detectionMs / 1000).toFixed(1) : null}
                  unit="s"
                  color={metrics.detectionMs != null ? 'var(--info)' : undefined}
                  sub="From event to classification"
                />
                <StatCard
                  label="AI Confidence"
                  value={metrics.confidence != null ? (metrics.confidence * 100).toFixed(1) : null}
                  unit="%"
                  color={metrics.confidence >= 0.92 ? 'var(--success)' : metrics.confidence != null ? 'var(--warning)' : undefined}
                  sub="Threshold: 92%"
                />
                <StatCard
                  label="Actions Taken"
                  value={metrics.actionsExecuted}
                  color={metrics.actionsExecuted > 0 ? 'var(--warning)' : undefined}
                  sub="Automated responses"
                />
              </div>

              {/* Main grid: pipeline + threat matrix */}
              <div className="dashboard-main">
                <AgentPipeline agentStates={agentStates} />
                <ThreatMatrix  classifiedData={classifiedData} />
              </div>

              <AIReasoningPanel reasoningSteps={reasoningSteps} incidentActive={incidentActive} contained={contained} />

              {/* Bottom grid: alerts + response log + topology */}
              <div className="dashboard-bottom">
                <AlertQueue  incidents={incidents} />
                <ResponseLog responses={responses} />
                <TopologyMap attackActive={incidentActive} contained={contained} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

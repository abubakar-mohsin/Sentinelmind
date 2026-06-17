import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket }    from '../ws/useWebSocket';
import Sidebar             from '../components/layout/Sidebar';
import AgentPipeline       from '../components/AgentPipeline';
import AIReasoningPanel    from '../components/AIReasoningPanel';
import ForensicsTimeline   from '../components/ForensicsTimeline';
import ThreatGraph         from '../components/ThreatGraph';
import GraphInsights       from '../components/GraphInsights';
import ThreatMatrix        from '../components/ThreatMatrix';
import ResponseLog         from '../components/ResponseLog';
import AlertQueue          from '../components/AlertQueue';
import TopologyMap         from '../components/TopologyMap';
import SystemMetrics       from '../components/SystemMetrics';

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

function ElapsedTimer({ startTime, stopped }) {
  const [elapsed, setElapsed] = useState(0);
  const frozenRef = useRef(null);

  useEffect(() => {
    if (!startTime) { setElapsed(0); frozenRef.current = null; return; }
    if (stopped && frozenRef.current === null) {
      frozenRef.current = Date.now() - startTime;
      setElapsed(frozenRef.current);
      return;
    }
    if (frozenRef.current !== null) return;
    const iv = setInterval(() => setElapsed(Date.now() - startTime), 100);
    return () => clearInterval(iv);
  }, [startTime, stopped]);

  if (!startTime) return null;

  const secs = (elapsed / 1000).toFixed(1);
  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      fontWeight: 600,
      color: stopped ? 'var(--success)' : 'var(--danger)',
      fontVariantNumeric: 'tabular-nums',
    }}>
      {secs}s
    </span>
  );
}

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
  const [platformMetrics, setPlatformMetrics] = useState(null);
  const [reasoningSteps, setReasoningSteps] = useState([]);
  const [baseline,       setBaseline]       = useState(null);
  const [currentActor,   setCurrentActor]   = useState('ahmed@targetcorp.com');
  const [graphEvents,    setGraphEvents]    = useState([]);
  const [graphNodes,     setGraphNodes]     = useState([]);
  const [graphEdges,     setGraphEdges]     = useState([]);
  const [systemAlerts,   setSystemAlerts]   = useState([]);

  const currentIdRef    = useRef(null);
  const activatedAtRef  = useRef(null);
  const classifiedAtRef = useRef(null);

  useEffect(() => {
    async function fetchBaseline() {
      try {
        const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';
        const headers = new Headers();
        headers.set('Authorization', 'Basic ' + btoa('admin:sentinelmind'));
        const res = await fetch(`${API_BASE}/api/baseline/${currentActor}`, { headers });
        if (res.ok) setBaseline(await res.json());
      } catch (err) {
        console.error('Failed to fetch baseline:', err);
      }
    }
    fetchBaseline();
  }, [currentActor, contained]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';
        const response = await fetch(`${API_BASE}/api/metrics`);
        if (response.ok) {
          const data = await response.json();
          setPlatformMetrics(data);
        }
      } catch (err) {
        console.error('Failed to fetch metrics:', err);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

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
      setGraphEvents([]);
      setGraphNodes([]);
      setGraphEdges([]);
      setSystemAlerts([]);
    }

    switch (msg.type) {
      case 'AGENT_ACTIVATED':
        if (msg.agentName === 'OrchestratorAgent') { setReasoningSteps([]); break; }
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
          const extra = msg.agentName === 'ThreatIntelAgent'
            ? { usedRealApi: msg.usedRealApi, isMalicious: msg.confidence > 0 }
            : {};
          return {
            ...prev,
            [msg.agentName]: {
              ...a, status: 'COMPLETE',
              summary: msg.summary || msg.message,
              elapsed: a.startTime ? Date.now() - a.startTime : null,
              ...extra,
            },
          };
        });
        break;

      case 'CONFIDENCE_UPDATED':
        setMetrics(prev => ({ ...prev, confidence: msg.confidence }));
        break;

      case 'INCIDENT_CLASSIFIED':
        if (msg.actor) setCurrentActor(msg.actor);
        else if (msg.triggeringEvent?.actor) setCurrentActor(msg.triggeringEvent.actor);
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
            status: 'COMPLETE',
            summary: `Playbook complete — ${msg.actionsExecuted} action${msg.actionsExecuted !== 1 ? 's' : ''} in ${msg.totalElapsedMs}ms`,
            elapsed: msg.totalElapsedMs,
          },
        }));
        break;

      case 'GRAPH_UPDATED':
        setGraphEvents(prev => [...prev, msg]);
        if (msg.details?.newNodes) {
          setGraphNodes(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const newNodes = msg.details.newNodes.filter(n => !existingIds.has(n.id));
            return [...prev, ...newNodes];
          });
        }
        if (msg.details?.newEdges) {
          setGraphEdges(prev => {
            const existingKeys = new Set(prev.map(e => `${e.source}-${e.target}-${e.type}`));
            const newEdges = msg.details.newEdges.filter(e =>
              !existingKeys.has(`${e.source}-${e.target}-${e.type}`)
            );
            return [...prev, ...newEdges];
          });
        }
        break;

      case 'CAMPAIGN_ALERT':
        console.warn('[CAMPAIGN_ALERT]', msg.message);
        setSystemAlerts(prev => [...prev, {
          id: Math.random().toString(),
          type: 'warning',
          message: msg.message,
          timestamp: msg.timestamp || new Date().toISOString()
        }]);
        break;

      case 'CAMPAIGN_CORRELATION':
        console.warn('[CAMPAIGN]', msg.message, '| Related:', msg.relatedIncidents);
        setSystemAlerts(prev => [...prev, {
          id: Math.random().toString(),
          type: 'info',
          message: msg.message,
          timestamp: msg.timestamp || new Date().toISOString()
        }]);
        break;

      case 'CRITICAL_ALERT':
        console.error('[CRITICAL_ALERT]', msg.message);
        setSystemAlerts(prev => [...prev, {
          id: Math.random().toString(),
          type: 'error',
          message: msg.message,
          timestamp: msg.timestamp || new Date().toISOString()
        }]);
        break;

      default: break;
    }
  }, []);

  const { connected } = useWebSocket(handleMessage);

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
        {/* 3px threat bar */}
        <div className={`threat-bar ${incidentActive ? 'active' : ''} ${contained ? 'contained' : ''}`} />

        {/* Status strip during incident */}
        <div className={`status-strip ${incidentActive || contained ? 'visible' : ''} ${contained ? 'contained' : ''}`}>
          <div className="status-strip-inner">
            {contained ? (
              <>
                INCIDENT CONTAINED
                <span style={{ opacity: 0.7 }}>|</span>
                <ElapsedTimer startTime={activatedAtRef.current} stopped />
                <span style={{ opacity: 0.7 }}>|</span>
                {metrics.actionsExecuted} actions executed
              </>
            ) : (
              <>
                THREAT DETECTED
                <span style={{ opacity: 0.7 }}>|</span>
                <ElapsedTimer startTime={activatedAtRef.current} stopped={false} />
                <span style={{ opacity: 0.7 }}>|</span>
                {classifiedData?.severity || 'ANALYZING'}
              </>
            )}
          </div>
        </div>

        <div className="page-content">
          {/* System Alerts Banners */}
          {systemAlerts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {systemAlerts.map(alert => (
                <div key={alert.id} style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: alert.type === 'error' ? '1px solid rgba(239,68,68,0.4)' : alert.type === 'warning' ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(99,102,241,0.4)',
                  background: alert.type === 'error' ? 'rgba(239,68,68,0.08)' : alert.type === 'warning' ? 'rgba(245,158,11,0.08)' : 'rgba(99,102,241,0.08)',
                  color: alert.type === 'error' ? '#EF4444' : alert.type === 'warning' ? '#F59E0B' : '#818CF8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  animation: 'sweep-in 0.25s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{alert.type === 'error' ? '🚨' : alert.type === 'warning' ? '⚠' : 'ℹ'}</span>
                    <strong style={{ textTransform: 'uppercase' }}>[{alert.type}]</strong>
                    <span>{alert.message}</span>
                  </div>
                  <button onClick={() => setSystemAlerts(prev => prev.filter(a => a.id !== alert.id))} style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    fontSize: 14,
                    padding: '0 4px',
                    opacity: 0.6
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0.6}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {activePage === 'forensics' ? (
            <ForensicsTimeline incidentId={currentId} />
          ) : activePage === 'threat-graph' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ThreatGraph
                graphEvents={graphEvents}
                incidentId={currentId}
                incidentActive={incidentActive}
                contained={contained}
                currentActor={currentActor}
              />
              <GraphInsights graphNodes={graphNodes} graphEdges={graphEdges} />
            </div>
          ) : (
            <>
              {platformMetrics && <SystemMetrics metrics={platformMetrics} />}

              {baseline && (
                <div style={{
                  padding: '10px 16px',
                  background: 'var(--accent-dim)',
                  border: '1px solid rgba(99,102,241,0.15)',
                  borderRadius: 8,
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 12,
                  color: 'var(--text-2)',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>
                  <span>
                    <strong style={{ color: 'var(--text-1)' }}>Baseline ({currentActor})</strong>
                    <span style={{ fontFamily: 'var(--font-mono)', marginLeft: 8 }}>
                      {baseline.sessionCount} sessions | {baseline.typicalCountry} | avg {(baseline.avgLatencyMs / 1000).toFixed(1)}s
                    </span>
                  </span>
                </div>
              )}

              <div className="stats-row">
                <StatCard
                  label="Active Threats"
                  value={incidentActive ? 1 : contained ? 0 : null}
                  color={incidentActive ? 'var(--danger)' : contained ? 'var(--success)' : undefined}
                  sub={incidentActive ? 'Investigating' : contained ? 'Contained' : 'No active threats'}
                />
                <StatCard
                  label="Detection Time"
                  value={metrics.detectionMs != null ? (metrics.detectionMs / 1000).toFixed(1) : null}
                  unit="s"
                  color={metrics.detectionMs != null ? 'var(--accent)' : undefined}
                  sub="Event to classification"
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

              <div className="dashboard-main">
                <AgentPipeline agentStates={agentStates} />
                <ThreatMatrix classifiedData={classifiedData} />
              </div>

              <AIReasoningPanel reasoningSteps={reasoningSteps} incidentActive={incidentActive} contained={contained} />

              <div className="dashboard-bottom">
                <AlertQueue incidents={incidents} />
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

import React from 'react';

const AGENTS = [
  { key: 'AnomalyDetectionAgent',  name: 'Anomaly Detection',   desc: 'Z-score behavioral analysis' },
  { key: 'ThreatIntelAgent',       name: 'Threat Intelligence', desc: 'Reputation feed correlation' },
  { key: 'ThreatClassifierAgent',  name: 'Threat Classifier',   desc: 'MITRE ATT&CK mapping' },
  { key: 'IncidentResponderAgent', name: 'Incident Responder',  desc: 'Automated playbook execution' },
];

function getThreatIntelBadge(state) {
  if (!state || state.status !== 'COMPLETE') return null;
  if (state.usedRealApi === true) {
    return state.isMalicious
      ? { text: 'VIRUSTOTAL', cls: 'badge-success' }
      : { text: 'VT: 0 FLAGS', cls: 'badge-warning' };
  }
  if (state.usedRealApi === false) {
    return { text: 'MOCK', cls: 'badge-medium' };
  }
  return null;
}

function AgentCard({ agent, state, badge }) {
  const { status = 'IDLE', summary = null, elapsed = null } = state || {};

  const cfg = {
    IDLE:     { label: 'Idle',     cls: '' },
    RUNNING:  { label: 'Running',  cls: 'running' },
    COMPLETE: { label: 'Complete', cls: 'complete' },
  }[status] || { label: 'Idle', cls: '' };

  return (
    <div className={`agent-card ${cfg.cls}`}>
      {status === 'RUNNING' && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'var(--accent)', opacity: 0.7,
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
            animation: 'shimmer-bar 1.5s ease-in-out infinite',
          }} />
        </div>
      )}

      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>
        {agent.name}
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 8 }}>
        {agent.desc}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto' }}>
        <span className={`status-dot ${
          status === 'RUNNING' ? 'dot-pulse-brand' :
          status === 'COMPLETE' ? 'dot-success' : 'dot-muted'
        }`} />
        <span style={{
          fontSize: 11,
          fontWeight: 500,
          color: status === 'RUNNING' ? 'var(--accent)' :
                 status === 'COMPLETE' ? 'var(--success)' : 'var(--text-4)',
        }}>
          {cfg.label}
        </span>
        {elapsed != null && (
          <span style={{
            marginLeft: 'auto',
            fontSize: 11,
            color: 'var(--text-4)',
            fontFamily: 'var(--font-mono)',
          }}>
            {elapsed < 1000 ? `${elapsed}ms` : `${(elapsed / 1000).toFixed(1)}s`}
          </span>
        )}
      </div>

      {summary && (
        <div style={{
          marginTop: 8, paddingTop: 8,
          borderTop: '1px solid var(--border)',
          fontSize: 11, color: 'var(--text-3)',
          lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          animation: 'fade-in 0.3s ease',
        }}>
          {summary}
        </div>
      )}

      {badge && (
        <div style={{ marginTop: 6 }}>
          <span className={`badge ${badge.cls}`}>{badge.text}</span>
        </div>
      )}
    </div>
  );
}

function Connector({ active }) {
  return (
    <div className="agent-connector">
      <div className={`agent-connector-line ${active ? 'active' : ''}`} />
      <span className={`agent-connector-arrow ${active ? 'active' : ''}`}>&#9656;</span>
    </div>
  );
}

export default function AgentPipeline({ agentStates }) {
  const completeCount = AGENTS.filter(a => agentStates[a.key]?.status === 'COMPLETE').length;
  const allDone = completeCount === AGENTS.length;

  function isConnectorActive(idx) {
    const nextKey = AGENTS[idx + 1]?.key;
    if (!nextKey) return false;
    const s = agentStates[nextKey]?.status;
    return s === 'RUNNING' || s === 'COMPLETE';
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div className="card-header">
        <span className="card-title">Agent Pipeline</span>
        <span style={{ fontSize: 12, color: 'var(--text-4)', fontFamily: 'var(--font-mono)' }}>
          {completeCount}/{AGENTS.length}
        </span>
      </div>

      <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
        <div style={{ height: 2, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${(completeCount / AGENTS.length) * 100}%`,
            background: allDone ? 'var(--success)' : 'var(--accent)',
            transition: 'width 0.5s var(--ease-out)',
            borderRadius: 99,
          }} />
        </div>
      </div>

      <div className="agent-row">
        {AGENTS.map((agent, i) => (
          <React.Fragment key={agent.key}>
            <AgentCard
              agent={agent}
              state={agentStates[agent.key]}
              badge={agent.key === 'ThreatIntelAgent'
                ? getThreatIntelBadge(agentStates['ThreatIntelAgent'])
                : null}
            />
            {i < AGENTS.length - 1 && <Connector active={isConnectorActive(i)} />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

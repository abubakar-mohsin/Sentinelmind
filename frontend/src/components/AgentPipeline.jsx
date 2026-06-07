import React from 'react';

const AGENTS = [
  {
    key:         'AnomalyDetectionAgent',
    name:        'Anomaly Detection',
    desc:        'Z-score behavioral analysis',
    icon:        'M22 12h-4l-3 9L9 3l-3 9H2',
  },
  {
    key:         'ThreatIntelAgent',
    name:        'Threat Intelligence',
    desc:        'Reputation feed correlation',
    icon:        'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  },
  {
    key:         'ThreatClassifierAgent',
    name:        'Threat Classifier',
    desc:        'MITRE ATT&CK mapping',
    icon:        ['M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18'],
  },
  {
    key:         'IncidentResponderAgent',
    name:        'Incident Responder',
    desc:        'Automated playbook execution',
    icon:        ['M13 10V3L4 14h7v7l9-11h-7z'],
  },
];

function AgentIcon({ path, color }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {Array.isArray(path) ? path.map((d, i) => <path key={i} d={d} />) : <path d={path} />}
    </svg>
  );
}

/**
 * Derive the data-source badge for the ThreatIntelAgent card.
 * Returns null for all other agents or when the agent hasn't completed yet.
 */
function getThreatIntelBadge(state) {
  if (!state || state.status !== 'COMPLETE') return null;
  if (state.usedRealApi === true) {
    return state.isMalicious
      ? { text: '✓ VIRUSTOTAL LIVE', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' }
      : { text: '⚠ VIRUSTOTAL: 0 FLAGS', color: '#eab308', bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.3)' };
  }
  if (state.usedRealApi === false) {
    return { text: '⚠ MOCK DATA', color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)' };
  }
  return null;
}

function AgentCard({ agent, state, badge }) {
  const { status = 'IDLE', summary = null, elapsed = null } = state || {};

  const statusConfig = {
    IDLE:     { label: 'Idle',     color: 'var(--text-4)',  bg: 'var(--bg-elevated)',  dot: 'dot-muted',   borderColor: 'var(--border)' },
    RUNNING:  { label: 'Running',  color: 'var(--brand)',   bg: 'var(--bg-elevated)',  dot: 'dot-pulse-brand', borderColor: 'rgba(99,102,241,0.4)' },
    COMPLETE: { label: 'Complete', color: 'var(--success)', bg: 'var(--bg-elevated)',  dot: 'dot-success', borderColor: 'rgba(34,197,94,0.3)' },
  };

  const cfg = statusConfig[status] || statusConfig.IDLE;

  return (
    <div className={`agent-card ${status.toLowerCase()}`}
      style={{ borderColor: cfg.borderColor, boxShadow: status === 'RUNNING' ? '0 0 18px rgba(99,102,241,0.1)' : status === 'COMPLETE' ? '0 0 12px rgba(34,197,94,0.07)' : 'none' }}>

      {/* Running shimmer bar */}
      {status === 'RUNNING' && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'var(--brand)', opacity: 0.6,
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
            animation: 'shimmer-bar 1.5s ease-in-out infinite',
          }} />
        </div>
      )}

      {/* Icon + name row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 6,
          background: status === 'RUNNING' ? 'var(--brand-dim)' : status === 'COMPLETE' ? 'var(--success-bg)' : 'rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <AgentIcon path={agent.icon} color={status === 'RUNNING' ? 'var(--brand)' : status === 'COMPLETE' ? 'var(--success)' : 'var(--text-4)'} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.3 }}>
            {agent.name}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 8, lineHeight: 1.4 }}>
        {agent.desc}
      </div>

      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto' }}>
        <span className={`status-dot ${cfg.dot}`} />
        <span style={{ fontSize: 11.5, fontWeight: 500, color: cfg.color }}>{cfg.label}</span>
        {elapsed != null && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-4)', fontFamily: 'var(--font-mono)' }}>
            {elapsed < 1000 ? `${elapsed}ms` : `${(elapsed / 1000).toFixed(1)}s`}
          </span>
        )}
      </div>

      {/* Summary */}
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

      {/* Data-source badge — only on ThreatIntelAgent after completion */}
      {badge && (
        <div style={{
          marginTop: 7,
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 8px',
          background: badge.bg,
          border: `1px solid ${badge.border}`,
          borderRadius: 4,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
          color: badge.color,
          animation: 'fade-in 0.3s ease',
        }}>
          {badge.text}
        </div>
      )}
    </div>
  );
}

function Connector({ active }) {
  return (
    <div className="agent-connector">
      <div className={`agent-connector-line ${active ? 'active' : ''}`} />
      <span className={`agent-connector-arrow ${active ? 'active' : ''}`}>▸</span>
    </div>
  );
}

export default function AgentPipeline({ agentStates }) {
  const completeCount = AGENTS.filter(a => agentStates[a.key]?.status === 'COMPLETE').length;
  const progressPct   = (completeCount / AGENTS.length) * 100;
  const allDone       = completeCount === AGENTS.length;

  function isConnectorActive(idx) {
    const nextKey = AGENTS[idx + 1]?.key;
    if (!nextKey) return false;
    const s = agentStates[nextKey]?.status;
    return s === 'RUNNING' || s === 'COMPLETE';
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div className="card-header">
        <span className="card-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
          </svg>
          Agent Pipeline
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-4)', fontFamily: 'var(--font-mono)' }}>
          {completeCount}/{AGENTS.length} complete
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '12px 18px 0', flexShrink: 0 }}>
        <div style={{ height: 3, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            height: '100%', borderRadius: 99,
            width: `${progressPct}%`,
            background: allDone ? 'var(--success)' : 'var(--brand)',
            transition: 'width 0.5s ease',
            boxShadow: progressPct > 0 ? `0 0 8px ${allDone ? 'rgba(34,197,94,0.5)' : 'rgba(99,102,241,0.5)'}` : 'none',
          }} />
        </div>
      </div>

      {/* Agent cards */}
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

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

function AnomalyVisual({ status }) {
  return (
    <div className="agent-visual-container">
      <svg viewBox="0 0 160 50" className="agent-visual-svg">
        {/* Grid lines */}
        <line x1="10" y1="40" x2="150" y2="40" stroke="var(--border)" strokeWidth="0.8" />
        <line x1="10" y1="10" x2="10" y2="40" stroke="var(--border)" strokeWidth="0.8" />

        {/* Threshold line */}
        <line x1="10" y1="20" x2="150" y2="20" stroke="var(--danger)" strokeDasharray="3 2" strokeOpacity="0.5" strokeWidth="1" />
        <text x="14" y="16" fill="var(--danger)" fontSize="5" opacity="0.6" fontFamily="var(--font-mono)">Z-THRESHOLD (2.5)</text>

        {/* Wavepath */}
        <path
          d={
            status === 'COMPLETE'
              ? "M 10 35 Q 25 38 40 33 T 70 35 T 100 34 T 120 12 T 135 38 T 150 35"
              : status === 'RUNNING'
              ? "M 10 33 Q 30 25 50 33 T 90 33 T 130 33 T 150 33"
              : "M 10 35 Q 30 32 50 35 T 90 35 T 130 35 T 150 35"
          }
          fill="none"
          stroke={status === 'RUNNING' ? 'var(--accent)' : status === 'COMPLETE' ? 'var(--danger)' : 'var(--text-3)'}
          strokeWidth="1.5"
          className={status === 'RUNNING' ? 'wave-anim' : ''}
        />

        {/* Pulsing indicator node */}
        {status === 'COMPLETE' && (
          <circle cx="120" cy="12" r="3.5" fill="var(--danger)" className="node-pulse" />
        )}
      </svg>
    </div>
  );
}

function IntelVisual({ status }) {
  return (
    <div className="agent-visual-container">
      <svg viewBox="0 0 160 50" className="agent-visual-svg">
        {/* Central IP node */}
        <circle cx="80" cy="22" r="5" fill={status === 'COMPLETE' ? 'var(--danger)' : status === 'RUNNING' ? 'var(--accent)' : 'var(--text-3)'} />
        {status === 'RUNNING' && <circle cx="80" cy="22" r="9" fill="none" stroke="var(--accent)" strokeWidth="1" className="node-ring-pulse" />}
        {status === 'COMPLETE' && <circle cx="80" cy="22" r="9" fill="none" stroke="var(--danger)" strokeWidth="1" className="node-ring-pulse" />}

        {/* Feed lines */}
        {/* Left feed: VT */}
        <line x1="30" y1="22" x2="75" y2="22" stroke={status === 'COMPLETE' ? 'var(--danger)' : status === 'RUNNING' ? 'var(--accent)' : 'var(--text-3)'} strokeWidth="1" strokeDasharray={status === 'RUNNING' ? "4 4" : "0"} className={status === 'RUNNING' ? 'flow-left-right' : ''} />
        <circle cx="30" cy="22" r="3" fill="var(--text-3)" />

        {/* Top-Right feed: TOR */}
        <line x1="125" y1="11" x2="84" y2="19" stroke={status === 'COMPLETE' ? 'var(--danger)' : status === 'RUNNING' ? 'var(--accent)' : 'var(--text-3)'} strokeWidth="1" strokeDasharray={status === 'RUNNING' ? "4 4" : "0"} className={status === 'RUNNING' ? 'flow-right-left' : ''} />
        <circle cx="125" cy="11" r="3" fill="var(--text-3)" />

        {/* Bottom-Right feed: ABUSE */}
        <line x1="125" y1="33" x2="84" y2="25" stroke={status === 'COMPLETE' ? 'var(--danger)' : status === 'RUNNING' ? 'var(--accent)' : 'var(--text-3)'} strokeWidth="1" strokeDasharray={status === 'RUNNING' ? "4 4" : "0"} className={status === 'RUNNING' ? 'flow-right-left' : ''} />
        <circle cx="125" cy="33" r="3" fill="var(--text-3)" />

        {/* Small labels */}
        <text x="30" y="34" fill="var(--text-4)" fontSize="4.5" textAnchor="middle" fontFamily="var(--font-mono)">VT FEED</text>
        <text x="125" y="21" fill="var(--text-4)" fontSize="4.5" textAnchor="middle" fontFamily="var(--font-mono)">TOR NODE</text>
        <text x="125" y="43" fill="var(--text-4)" fontSize="4.5" textAnchor="middle" fontFamily="var(--font-mono)">ABUSE IP</text>
      </svg>
    </div>
  );
}

function ClassifierVisual({ status }) {
  const cells = [
    { x: 15, y: 10, label: 'TA01' },
    { x: 50, y: 10, label: 'TA02' },
    { x: 85, y: 10, label: 'TA03' },
    { x: 120, y: 10, label: 'TA04' },
    { x: 15, y: 28, label: 'T1078' },
    { x: 50, y: 28, label: 'T1110' },
    { x: 85, y: 28, label: 'T1059' },
    { x: 120, y: 28, label: 'T1021' },
  ];

  return (
    <div className="agent-visual-container">
      <svg viewBox="0 0 160 50" className="agent-visual-svg">
        {cells.map((cell, idx) => {
          let fill = 'rgba(255, 255, 255, 0.03)';
          let stroke = 'var(--border)';
          let textFill = 'var(--text-4)';
          let isClassifying = false;
          let isTarget = status === 'COMPLETE' && (cell.label === 'T1078' || cell.label === 'T1110');

          if (status === 'RUNNING') {
            isClassifying = true;
          }

          if (isTarget) {
            fill = 'rgba(239, 68, 68, 0.15)';
            stroke = 'var(--danger)';
            textFill = 'var(--danger)';
          }

          return (
            <g key={cell.label}>
              <rect
                x={cell.x}
                y={cell.y}
                width="28"
                height="12"
                rx="2"
                fill={fill}
                stroke={stroke}
                strokeWidth="0.8"
                className={
                  isTarget ? 'cell-pulse' :
                  isClassifying ? `cell-scan-${idx % 4}` : ''
                }
              />
              <text
                x={cell.x + 14}
                y={cell.y + 6}
                textAnchor="middle"
                dominantBaseline="central"
                fill={textFill}
                fontSize="5.5"
                fontWeight={isTarget ? 'bold' : 'normal'}
                fontFamily="var(--font-mono)"
                className={isClassifying ? `text-scan-${idx % 4}` : ''}
              >
                {cell.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ResponderVisual({ status }) {
  return (
    <div className="agent-visual-container">
      <svg viewBox="0 0 160 50" className="agent-visual-svg">
        {/* Connection line 1 */}
        <line x1="35" y1="21" x2="80" y2="21" stroke={status === 'COMPLETE' ? 'var(--success)' : status === 'RUNNING' ? 'var(--accent)' : 'var(--text-3)'} strokeWidth="1.2" strokeDasharray={status === 'RUNNING' ? "4 4" : "0"} className={status === 'RUNNING' ? 'flow-left-right' : ''} />
        {/* Connection line 2 */}
        <line x1="80" y1="21" x2="125" y2="21" stroke={status === 'COMPLETE' ? 'var(--success)' : status === 'RUNNING' ? 'var(--accent)' : 'var(--text-3)'} strokeWidth="1.2" strokeDasharray={status === 'RUNNING' ? "4 4" : "0"} className={status === 'RUNNING' ? 'flow-left-right' : ''} />

        {/* Step 1: Block IP */}
        <circle cx="35" cy="21" r="7" fill={status === 'COMPLETE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0,0,0,0.2)'} stroke={status === 'COMPLETE' ? 'var(--success)' : status === 'RUNNING' ? 'var(--accent)' : 'var(--text-3)'} strokeWidth="1" />
        <line x1="32" y1="21" x2="38" y2="21" stroke={status === 'COMPLETE' ? 'var(--success)' : 'var(--text-2)'} strokeWidth="1.2" />
        <circle cx="35" cy="21" r="4.5" fill="none" stroke={status === 'COMPLETE' ? 'var(--success)' : 'var(--text-2)'} strokeWidth="1" />

        {/* Step 2: Revoke Session */}
        <circle cx="80" cy="21" r="7" fill={status === 'COMPLETE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0,0,0,0.2)'} stroke={status === 'COMPLETE' ? 'var(--success)' : status === 'RUNNING' ? 'var(--accent)' : 'var(--text-3)'} strokeWidth="1" />
        <circle cx="80" cy="19" r="2" fill="none" stroke={status === 'COMPLETE' ? 'var(--success)' : 'var(--text-2)'} strokeWidth="1" />
        <rect x="78" y="21" width="4" height="4" rx="0.5" fill={status === 'COMPLETE' ? 'var(--success)' : 'var(--text-2)'} />

        {/* Step 3: Notify Admin */}
        <circle cx="125" cy="21" r="7" fill={status === 'COMPLETE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0,0,0,0.2)'} stroke={status === 'COMPLETE' ? 'var(--success)' : status === 'RUNNING' ? 'var(--accent)' : 'var(--text-3)'} strokeWidth="1" />
        <path d="M 123 24 L 127 24 L 126 19 L 124 19 Z" fill={status === 'COMPLETE' ? 'var(--success)' : 'var(--text-2)'} />
        <circle cx="125" cy="25" r="1" fill={status === 'COMPLETE' ? 'var(--success)' : 'var(--text-2)'} />

        {/* Labels below */}
        <text x="35" y="38" fill="var(--text-4)" fontSize="4.5" textAnchor="middle" fontFamily="var(--font-mono)">BLOCK</text>
        <text x="80" y="38" fill="var(--text-4)" fontSize="4.5" textAnchor="middle" fontFamily="var(--font-mono)">REVOKE</text>
        <text x="125" y="38" fill="var(--text-4)" fontSize="4.5" textAnchor="middle" fontFamily="var(--font-mono)">ALERT</text>
      </svg>
    </div>
  );
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

      {agent.key === 'AnomalyDetectionAgent' && <AnomalyVisual status={status} />}
      {agent.key === 'ThreatIntelAgent' && <IntelVisual status={status} />}
      {agent.key === 'ThreatClassifierAgent' && <ClassifierVisual status={status} />}
      {agent.key === 'IncidentResponderAgent' && <ResponderVisual status={status} />}

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

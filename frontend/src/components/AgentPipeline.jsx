import React, { useEffect, useRef } from 'react';

const AGENTS = [
  {
    key:         'AnomalyDetectionAgent',
    codename:    'ANOMALY-1',
    shortName:   'AnomalyDetectionAgent',
    description: 'Z-SCORE BEHAVIORAL ANALYSIS',
    index:       0,
  },
  {
    key:         'ThreatIntelAgent',
    codename:    'INTEL-1',
    shortName:   'ThreatIntelAgent',
    description: 'REPUTATION FEED CORRELATION',
    index:       1,
  },
  {
    key:         'ThreatClassifierAgent',
    codename:    'CLASS-1',
    shortName:   'ThreatClassifierAgent',
    description: 'MITRE ATT&CK MAPPING',
    index:       2,
  },
  {
    key:         'IncidentResponderAgent',
    codename:    'RESP-1',
    shortName:   'IncidentResponderAgent',
    description: 'AUTOMATED PLAYBOOK EXEC',
    index:       3,
  },
];

function StatusDot({ status }) {
  const colors = { IDLE: '#4A5568', RUNNING: '#00F5FF', COMPLETE: '#00FF88' };
  const color  = colors[status] || colors.IDLE;
  return (
    <span style={{
      display:      'inline-block',
      width:        6,
      height:       6,
      borderRadius: '50%',
      background:   color,
      marginRight:  6,
      boxShadow:    status === 'RUNNING' ? `0 0 6px ${color}` : 'none',
      animation:    status === 'RUNNING' ? 'pulse-dot 1.2s ease-in-out infinite' : 'none',
      flexShrink:   0,
    }} />
  );
}

function AgentCard({ agent, state }) {
  const { status = 'IDLE', summary = null, elapsed = null } = state || {};

  const borderColor =
    status === 'RUNNING'  ? 'var(--border-active)' :
    status === 'COMPLETE' ? 'rgba(0,255,136,0.35)' :
                            'var(--border)';

  const boxShadow =
    status === 'RUNNING'  ? '0 0 16px rgba(0,245,255,0.18)' :
    status === 'COMPLETE' ? '0 0 12px rgba(0,255,136,0.12)' :
                            'none';

  const statusColor =
    status === 'RUNNING'  ? 'var(--cyan)'   :
    status === 'COMPLETE' ? 'var(--green)'  :
                            'var(--text-3)';

  return (
    <div style={{
      flex:          1,
      minWidth:      0,
      background:    'var(--bg-panel)',
      border:        `1px solid ${borderColor}`,
      borderRadius:  'var(--radius)',
      padding:       '10px 12px',
      transition:    'border-color 0.3s ease, box-shadow 0.3s ease',
      boxShadow,
      display:       'flex',
      flexDirection: 'column',
      gap:           4,
      position:      'relative',
      overflow:      'hidden',
    }}>
      {/* Active shimmer line */}
      {status === 'RUNNING' && (
        <div style={{
          position:   'absolute',
          top:        0, left: 0, right: 0,
          height:     1,
          background: 'linear-gradient(90deg, transparent, var(--cyan), transparent)',
          animation:  'glow-pulse 1.4s ease-in-out infinite',
        }} />
      )}

      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--text-2)' }}>
        {agent.codename}
      </div>
      <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.08em' }}>
        {agent.description}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
        <StatusDot status={status} />
        <span style={{ fontSize: 10, color: statusColor, fontWeight: status !== 'IDLE' ? 600 : 400 }}>
          {status}
        </span>
      </div>

      {summary && (
        <div style={{
          fontSize:   10,
          color:      'var(--text-2)',
          marginTop:  4,
          lineHeight: '15px',
          overflow:   'hidden',
          display:    '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          animation:  'fade-in 0.3s ease',
        }}>
          {summary}
        </div>
      )}

      {elapsed != null && (
        <div style={{
          position:  'absolute',
          bottom:    6,
          right:     8,
          fontSize:  9,
          color:     'var(--cyan)',
          letterSpacing: '0.06em',
        }}>
          {elapsed}ms
        </div>
      )}
    </div>
  );
}

function Connector({ active }) {
  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      width:          28,
      flexShrink:     0,
      position:       'relative',
    }}>
      <div style={{
        width:        '100%',
        height:       1,
        background:   active ? 'var(--cyan)' : 'var(--border)',
        transition:   'background 0.4s ease',
        boxShadow:    active ? '0 0 6px rgba(0,245,255,0.5)' : 'none',
      }} />
      <span style={{
        position:  'absolute',
        right:     -5,
        color:     active ? 'var(--cyan)' : 'var(--text-3)',
        fontSize:  12,
        lineHeight: 1,
        transition: 'color 0.4s ease',
      }}>▸</span>
    </div>
  );
}

export default function AgentPipeline({ agentStates }) {
  // Track which connectors should be "lit" based on receiving agent being RUNNING/COMPLETE
  const getConnectorActive = (idx) => {
    const nextKey = AGENTS[idx + 1]?.key;
    if (!nextKey) return false;
    const nextState = agentStates[nextKey]?.status;
    return nextState === 'RUNNING' || nextState === 'COMPLETE';
  };

  // Calculate overall progress (0–4 agents complete)
  const completeCount = AGENTS.filter(a => agentStates[a.key]?.status === 'COMPLETE').length;
  const progressPct   = (completeCount / AGENTS.length) * 100;
  const allDone       = completeCount === AGENTS.length;

  return (
    <div className="panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <span>◈ AGENT PIPELINE  //  REACT LOOP</span>
        <span style={{ color: 'var(--text-3)', fontSize: 9 }}>
          {completeCount}/{AGENTS.length} COMPLETE
        </span>
      </div>

      {/* Progress track */}
      <div style={{ padding: '8px 14px 0', flexShrink: 0 }}>
        <div style={{
          height:       2,
          background:   'var(--border)',
          borderRadius: 1,
          position:     'relative',
          overflow:     'hidden',
        }}>
          <div style={{
            height:     '100%',
            width:      `${progressPct}%`,
            background: allDone ? 'var(--green)' : 'var(--cyan)',
            transition: 'width 0.5s ease, background 0.3s ease',
            boxShadow:  progressPct > 0
              ? `0 0 8px ${allDone ? 'rgba(0,255,136,0.6)' : 'rgba(0,245,255,0.5)'}`
              : 'none',
          }} />
          {/* Dot marker */}
          {progressPct > 0 && progressPct < 100 && (
            <div style={{
              position:     'absolute',
              top:          '50%',
              left:         `${progressPct}%`,
              transform:    'translate(-50%, -50%)',
              width:        6,
              height:       6,
              borderRadius: '50%',
              background:   'var(--cyan)',
              boxShadow:    '0 0 8px rgba(0,245,255,0.8)',
            }} />
          )}
        </div>
      </div>

      {/* Agent cards row */}
      <div style={{
        display:    'flex',
        alignItems: 'stretch',
        gap:        0,
        padding:    '8px 14px 10px',
        flex:       1,
        minHeight:  0,
      }}>
        {AGENTS.map((agent, i) => (
          <React.Fragment key={agent.key}>
            <AgentCard agent={agent} state={agentStates[agent.key]} />
            {i < AGENTS.length - 1 && (
              <Connector active={getConnectorActive(i)} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

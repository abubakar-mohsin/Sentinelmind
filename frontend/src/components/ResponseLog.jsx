import React, { useEffect, useRef } from 'react';

function fmtTime(ts) {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

function actionColor(type) {
  if (!type) return 'var(--cyan)';
  const t = type.toUpperCase();
  if (t.includes('BLOCK'))  return 'var(--red)';
  if (t.includes('REVOKE')) return 'var(--yellow)';
  if (t.includes('FORCE') || t.includes('RESET')) return 'var(--orange)';
  return 'var(--cyan)';
}

function LogEntry({ entry }) {
  if (entry.isContained) {
    const elapsedS = entry.totalElapsedMs != null
      ? (entry.totalElapsedMs / 1000).toFixed(2)
      : '--';
    return (
      <div style={{
        animation:   'sweep-in 0.2s ease',
        padding:     '4px 0',
        borderTop:   '1px solid rgba(0,255,136,0.15)',
        marginTop:   4,
      }}>
        <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: 12 }}>
          ✦ INCIDENT CONTAINED
        </span>
        <span style={{ color: 'var(--text-3)', fontSize: 11 }}>
          {' '}— elapsed: {elapsedS}s  //  actions: {entry.actionsExecuted ?? '--'}
        </span>
      </div>
    );
  }

  const color = actionColor(entry.actionType);

  return (
    <div style={{ animation: 'sweep-in 0.2s ease', padding: '2px 0' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{ color: 'var(--text-3)', fontSize: 10, flexShrink: 0, letterSpacing: '0.02em' }}>
          [{fmtTime(entry.receivedAt)}]
        </span>
        <div style={{ minWidth: 0 }}>
          <span style={{ color, fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', marginRight: 8 }}>
            {entry.actionType || entry.type}
          </span>
          <span style={{ color: 'var(--text-2)', fontSize: 11 }}>
            {entry.description || entry.message || ''}
          </span>
          {entry.rollbackToken && (
            <div style={{
              fontSize:      10,
              color:         'var(--text-3)',
              paddingLeft:   16,
              marginTop:     1,
              letterSpacing: '0.04em',
            }}>
              ↳ ROLLBACK: {typeof entry.rollbackToken === 'string'
                ? entry.rollbackToken
                : (entry.description || '').match(/UNBLOCK[^\s]*/)?.[0] || '[token]'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResponseLog({ responses }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [responses]);

  const recent = responses.slice(-20);

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      {/* Terminal title bar */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        gap:            6,
        padding:        '8px 14px',
        background:     'var(--bg-secondary)',
        borderBottom:   '1px solid var(--border)',
        flexShrink:     0,
      }}>
        <div style={{ display: 'flex', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF2D55', display: 'inline-block' }} />
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFB800', display: 'inline-block' }} />
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00FF88', display: 'inline-block' }} />
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--text-3)', textTransform: 'uppercase', marginLeft: 4 }}>
          ◈ INCIDENT RESPONDER  //  PLAYBOOK EXECUTION
        </span>
      </div>

      {/* Log area */}
      <div style={{
        flex:       1,
        minHeight:  0,
        overflowY:  'auto',
        background: 'var(--bg-deep)',
        padding:    '10px 12px',
        fontFamily: 'var(--font)',
        fontSize:   12,
        lineHeight: '20px',
      }}>
        {recent.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontSize: 11 }}>
            <span style={{ animation: 'blink 1.4s step-end infinite' }}>_</span>
            {' '}AWAITING RESPONDER ACTIVATION...
          </div>
        ) : (
          recent.map((entry, i) => (
            <LogEntry key={i} entry={entry} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

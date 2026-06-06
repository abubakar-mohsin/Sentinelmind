import React, { useEffect, useRef } from 'react';

function fmtTime(ts) {
  const d  = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function actionConfig(type) {
  if (!type) return { color: 'var(--brand)', bg: 'var(--brand-dim)', icon: '●' };
  const t = type.toUpperCase();
  if (t.includes('BLOCK'))  return { color: 'var(--danger)',  bg: 'var(--danger-bg)',  icon: '✕' };
  if (t.includes('REVOKE')) return { color: 'var(--warning)', bg: 'var(--warning-bg)', icon: '⊘' };
  if (t.includes('FORCE') || t.includes('RESET')) return { color: '#FB923C', bg: 'rgba(251,146,60,0.1)', icon: '⟳' };
  return { color: 'var(--info)', bg: 'var(--info-bg)', icon: '↑' };
}

function ContainedEntry({ entry }) {
  const elapsed = entry.totalElapsedMs != null ? (entry.totalElapsedMs / 1000).toFixed(2) : '--';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 18px',
      background: 'var(--success-bg)',
      borderTop: '1px solid rgba(34,197,94,0.2)',
      animation: 'sweep-in 0.25s ease',
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: '50%',
        background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>Incident Contained</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>
          {elapsed}s total · {entry.actionsExecuted ?? '--'} actions executed
        </div>
      </div>
    </div>
  );
}

function ActionEntry({ entry }) {
  const cfg = actionConfig(entry.actionType);

  return (
    <div style={{
      display: 'flex', gap: 10, padding: '9px 18px',
      borderBottom: '1px solid var(--border)',
      animation: 'sweep-in 0.2s ease',
      alignItems: 'flex-start',
    }}>
      {/* Icon chip */}
      <div style={{
        width: 26, height: 26, borderRadius: 6, flexShrink: 0, marginTop: 1,
        background: cfg.bg, color: cfg.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700,
      }}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: cfg.color }}>
            {entry.actionType || entry.type}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'var(--font-mono)', marginLeft: 'auto', flexShrink: 0 }}>
            {fmtTime(entry.receivedAt)}
          </span>
        </div>
        {(entry.description || entry.message) && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
            {entry.description || entry.message}
          </div>
        )}
        {entry.rollbackToken && (
          <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
            ↳ rollback available
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResponseLog({ responses }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [responses]);

  const recent = responses.slice(-30);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 200 }}>
      <div className="card-header">
        <span className="card-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          Response Log
        </span>
        {responses.length > 0 && (
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-4)' }}>
            {responses.length} action{responses.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {recent.length === 0 ? (
          <div className="empty-state">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-4)' }}>
              <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            <span style={{ fontSize: 13 }}>Awaiting responder activation</span>
          </div>
        ) : (
          recent.map((entry, i) =>
            entry.isContained
              ? <ContainedEntry key={i} entry={entry} />
              : <ActionEntry    key={i} entry={entry} />
          )
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

import React, { useState } from 'react';

function fmtTs(ts) {
  if (!ts) return '--';
  const d = new Date(ts);
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function truncate(str, n) {
  if (!str) return '--';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

function sevClass(sev) {
  const s = (sev || '').toLowerCase();
  return `badge badge-${s}`;
}

export default function AlertQueue({ incidents }) {
  const [selectedIdx, setSelectedIdx] = useState(null);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 200 }}>
      <div className="card-header">
        <span className="card-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v2m0 4h.01"/>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
          Incident Queue
        </span>
        {incidents.length > 0 && (
          <span className="badge badge-danger" style={{ fontSize: 11 }}>
            {incidents.length}
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {incidents.length === 0 ? (
          <div className="empty-state">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-4)' }}>
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
            <span style={{ fontSize: 13 }}>No incidents recorded</span>
          </div>
        ) : (
          incidents.map((inc, i) => {
            const isOpen = selectedIdx === i;
            const pct    = inc.confidence != null ? `${(inc.confidence * 100).toFixed(1)}%` : null;

            return (
              <div
                key={i}
                onClick={() => setSelectedIdx(isOpen ? null : i)}
                style={{
                  padding: '10px 18px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: isOpen ? 'var(--accent-dim)' : 'transparent',
                  transition: 'background 0.15s',
                  animation: i === 0 ? 'sweep-in 0.25s ease' : 'none',
                }}
                onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', color: 'var(--text-4)', flexShrink: 0 }}>
                    {fmtTs(inc.receivedAt)}
                  </span>
                  <div style={{ flex: 1 }} />
                  <span className={sevClass(inc.severity)} style={{ fontSize: 11 }}>
                    {inc.severity || 'UNKNOWN'}
                  </span>
                  {pct && (
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                      {pct}
                    </span>
                  )}
                </div>

                {/* Actor + IP row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {truncate(inc.actor, 28)}
                  </div>
                  <div style={{
                    fontSize: 11, fontFamily: 'var(--font-mono)',
                    color: 'var(--danger)', flexShrink: 0,
                    background: 'var(--danger-bg)', padding: '1px 6px', borderRadius: 4,
                  }}>
                    {inc.sourceIp || '—'}
                  </div>
                </div>

                {/* Expanded techniques */}
                {isOpen && inc.mitreIds && inc.mitreIds.length > 0 && (
                  <div style={{
                    marginTop: 10, paddingTop: 10,
                    borderTop: '1px solid var(--border)',
                    animation: 'fade-in 0.2s ease',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                      MITRE Techniques
                    </div>
                    {inc.mitreIds.map((id, j) => (
                      <div key={id} style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{id}</span>
                        <span style={{ color: 'var(--text-3)' }}>{inc.mitreNames?.[j] || ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

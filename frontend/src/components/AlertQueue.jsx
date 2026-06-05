import React, { useState } from 'react';

function sevClass(sev) {
  const s = (sev || '').toLowerCase();
  return `badge badge-${s}`;
}

function fmtTs(ts) {
  if (!ts) return '--';
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}

function truncate(str, n) {
  if (!str) return '--';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

export default function AlertQueue({ incidents }) {
  const [selectedIdx, setSelectedIdx] = useState(null);

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div className="panel-header">
        <span>⚠ INCIDENT QUEUE</span>
        <span style={{
          background: 'rgba(255,45,85,0.12)',
          color:      'var(--red)',
          border:     '1px solid rgba(255,45,85,0.28)',
          borderRadius: 'var(--radius)',
          padding:    '1px 7px',
          fontSize:   9,
          fontWeight: 700,
        }}>
          {incidents.length}
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 0' }}>
        {incidents.length === 0 ? (
          <div style={{
            height:         '100%',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            color:          'var(--text-3)',
            fontSize:       11,
            letterSpacing:  '0.08em',
          }}>
            // NO INCIDENTS RECORDED
          </div>
        ) : (
          incidents.map((inc, i) => {
            const isSelected = selectedIdx === i;
            const pct        = inc.confidence != null ? `${(inc.confidence * 100).toFixed(1)}%` : '--';

            return (
              <div
                key={i}
                onClick={() => setSelectedIdx(isSelected ? null : i)}
                style={{
                  padding:         '7px 10px',
                  borderBottom:    '1px solid var(--border)',
                  cursor:          'pointer',
                  background:      isSelected ? 'rgba(0,245,255,0.04)' : 'transparent',
                  borderLeft:      isSelected ? '2px solid var(--cyan)' : '2px solid transparent',
                  transition:      'all 0.15s ease',
                  animation:       i === 0 ? 'sweep-in 0.25s ease' : 'none',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(0,245,255,0.025)'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Row 1: time + severity + confidence */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ color: 'var(--text-3)', fontSize: 10, flexShrink: 0 }}>
                    {fmtTs(inc.receivedAt)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }} />
                  <span className={sevClass(inc.severity)} style={{ fontSize: 9 }}>
                    {inc.severity || 'UNKNOWN'}
                  </span>
                  <span style={{ color: 'var(--cyan)', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                    {pct}
                  </span>
                </div>

                {/* Row 2: actor + IP */}
                <div style={{ fontSize: 11, color: 'var(--text-1)', letterSpacing: '0.02em' }}>
                  <span>{truncate(inc.actor, 22)}</span>
                  <span style={{ color: 'var(--text-3)', margin: '0 5px' }}>//</span>
                  <span style={{ color: 'var(--red)' }}>{inc.sourceIp || '—'}</span>
                </div>

                {/* Expanded detail */}
                {isSelected && inc.mitreIds && inc.mitreIds.length > 0 && (
                  <div style={{
                    marginTop:   6,
                    paddingTop:  6,
                    borderTop:   '1px solid var(--border)',
                    animation:   'slide-down 0.2s ease',
                  }}>
                    <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 4, letterSpacing: '0.10em' }}>
                      TECHNIQUES
                    </div>
                    {inc.mitreIds.map((id, j) => (
                      <div key={id} style={{ fontSize: 10, display: 'flex', gap: 6, lineHeight: '16px' }}>
                        <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{id}</span>
                        <span style={{ color: 'var(--text-2)' }}>{inc.mitreNames?.[j] || ''}</span>
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

import React from 'react';

const R = 44;
const CIRC = 2 * Math.PI * R;

function ConfidenceRing({ confidence }) {
  const pct    = confidence != null ? Math.min(confidence, 1) : 0;
  const offset = CIRC * (1 - pct);
  const color  = pct >= 0.92 ? 'var(--success)' : pct >= 0.70 ? 'var(--warning)' : 'var(--brand)';
  const display = confidence != null ? `${(pct * 100).toFixed(1)}%` : '—';

  /* 92% threshold tick */
  const tAngle = -Math.PI / 2 + 0.92 * 2 * Math.PI;
  const cx = 52, cy = 52;
  const toX = cx + (R + 8) * Math.cos(tAngle), toY = cy + (R + 8) * Math.sin(tAngle);
  const tiX = cx + (R - 8) * Math.cos(tAngle), tiY = cy + (R - 8) * Math.sin(tAngle);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width="104" height="104" viewBox="0 0 104 104">
        {/* Track */}
        <circle cx={52} cy={52} r={R} fill="none" stroke="var(--border)" strokeWidth="7" />
        {/* Arc */}
        <circle
          cx={52} cy={52} r={R} fill="none"
          stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={CIRC} strokeDashoffset={offset}
          transform="rotate(-90 52 52)"
          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.3s ease' }}
        />
        {/* Threshold tick */}
        <line x1={tiX} y1={tiY} x2={toX} y2={toY} stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" opacity={0.7} />
        {/* Value */}
        <text x={52} y={48} textAnchor="middle" dominantBaseline="middle"
          fontFamily="var(--font-sans)" fontWeight="700"
          fontSize={confidence != null ? 15 : 18} fill={color}
          style={{ transition: 'fill 0.3s ease' }}>
          {display}
        </text>
        <text x={52} y={63} textAnchor="middle"
          fontFamily="var(--font-sans)" fontSize="8.5"
          fill="var(--text-4)" letterSpacing="0.06em">
          CONFIDENCE
        </text>
      </svg>
      <div style={{ fontSize: 11, color: 'var(--text-4)', textAlign: 'center' }}>
        Threshold: <span style={{ color: 'var(--warning)', fontWeight: 600 }}>92%</span>
      </div>
    </div>
  );
}

function TechniqueChip({ id, name }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0,
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 'var(--r)', overflow: 'hidden',
      animation: 'sweep-in 0.25s ease',
    }}>
      <span style={{
        padding: '4px 9px', fontSize: 11.5, fontWeight: 700,
        color: 'var(--brand)', background: 'var(--brand-dim)',
        borderRight: '1px solid var(--border)', whiteSpace: 'nowrap',
        fontFamily: 'var(--font-mono)',
      }}>
        {id}
      </span>
      <span style={{ padding: '4px 9px', fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
        {name}
      </span>
    </div>
  );
}

export default function ThreatMatrix({ classifiedData }) {
  const confidence = classifiedData?.confidence ?? null;
  const mitreIds   = classifiedData?.mitreIds   ?? [];
  const mitreNames = classifiedData?.mitreNames  ?? [];
  const reason     = classifiedData?.reason      ?? null;
  const severity   = classifiedData?.severity    ?? null;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div className="card-header">
        <span className="card-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Threat Assessment
        </span>
        {severity && (
          <span className={`badge badge-${severity.toLowerCase()}`}>{severity}</span>
        )}
      </div>

      <div style={{ padding: '16px 18px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Confidence ring + MITRE */}
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16, alignItems: 'start' }}>
          <ConfidenceRing confidence={confidence} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                MITRE ATT&CK
              </div>
              {mitreIds.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {mitreIds.map((id, i) => (
                    <TechniqueChip key={id} id={id} name={mitreNames[i] || 'Unknown'} />
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-4)', fontStyle: 'italic' }}>
                  Awaiting classification
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Classification reason */}
        {reason && (
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r)',
            padding: '10px 14px',
            animation: 'fade-in 0.3s ease',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Analysis
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.6 }}>
              {reason}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!classifiedData && (
          <div className="empty-state" style={{ flex: 1, padding: '20px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-4)' }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span style={{ fontSize: 13, color: 'var(--text-4)' }}>No active incident</span>
          </div>
        )}

      </div>
    </div>
  );
}

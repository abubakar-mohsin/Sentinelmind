import React, { useEffect, useRef } from 'react';

const RADIUS       = 50;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const THRESHOLD_PCT = 0.92;

function ConfidenceGauge({ confidence }) {
  const pct        = confidence != null ? Math.min(confidence, 1) : 0;
  const offset     = CIRCUMFERENCE * (1 - pct);
  const arcColor   = pct >= 0.90 ? 'var(--red)' : pct >= 0.70 ? 'var(--yellow)' : 'var(--cyan)';
  const displayPct = confidence != null ? `${(pct * 100).toFixed(1)}%` : '--';

  // Threshold tick position at 92% (starting from top, going clockwise)
  const thresholdAngle = -Math.PI / 2 + THRESHOLD_PCT * 2 * Math.PI;
  const cx = 60, cy = 60;
  const tickR = RADIUS + 9;
  const txOuter = cx + tickR * Math.cos(thresholdAngle);
  const tyOuter = cy + tickR * Math.sin(thresholdAngle);
  const txInner = cx + (RADIUS - 9) * Math.cos(thresholdAngle);
  const tyInner = cy + (RADIUS - 9) * Math.sin(thresholdAngle);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={120} height={120} viewBox="0 0 120 120">
        {/* Background ring */}
        <circle
          cx={60} cy={60} r={RADIUS}
          fill="none"
          stroke="rgba(0,245,255,0.08)"
          strokeWidth={8}
        />
        {/* Progress arc */}
        <circle
          cx={60} cy={60} r={RADIUS}
          fill="none"
          stroke={arcColor}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.3s ease' }}
        />
        {/* Threshold tick at 92% */}
        <line
          x1={txInner} y1={tyInner}
          x2={txOuter} y2={tyOuter}
          stroke="rgba(255,184,0,0.7)"
          strokeWidth={2}
          strokeLinecap="round"
        />
        {/* Center: percentage */}
        <text
          x={60} y={56}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="'JetBrains Mono', monospace"
          fontSize={confidence != null ? 18 : 22}
          fontWeight="700"
          fill={arcColor}
          style={{ transition: 'fill 0.3s ease' }}
        >
          {displayPct}
        </text>
        {/* Sub-label */}
        <text
          x={60} y={74}
          textAnchor="middle"
          fontFamily="'JetBrains Mono', monospace"
          fontSize={8}
          fill="rgba(72,82,100,0.9)"
        >
          CONFIDENCE
        </text>
      </svg>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.10em' }}>
          THRESHOLD: <span style={{ color: 'rgba(255,184,0,0.7)' }}>92.0%</span>
        </div>
      </div>
    </div>
  );
}

function MitreTechniqueChip({ id, name }) {
  return (
    <div style={{
      display:    'flex',
      alignItems: 'center',
      gap:        0,
      background: 'rgba(0,245,255,0.04)',
      border:     '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow:   'hidden',
      fontSize:   10,
      animation:  'sweep-in 0.25s ease',
    }}>
      <span style={{
        padding:       '4px 8px',
        color:         'var(--cyan)',
        fontWeight:    700,
        background:    'rgba(0,245,255,0.07)',
        borderRight:   '1px solid var(--border)',
        whiteSpace:    'nowrap',
        letterSpacing: '0.06em',
      }}>
        {id}
      </span>
      <span style={{
        padding:    '4px 8px',
        color:      'var(--text-2)',
        whiteSpace: 'nowrap',
      }}>
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

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      <div className="panel-header">
        <span>✦ THREAT ASSESSMENT</span>
        {classifiedData && (
          <span className={`badge badge-${(classifiedData.severity || '').toLowerCase()}`}>
            {classifiedData.severity}
          </span>
        )}
      </div>

      <div style={{
        display:    'grid',
        gridTemplateColumns: '140px 1fr',
        gap:        16,
        padding:    '12px 14px',
        flex:       1,
        minHeight:  0,
        overflow:   'hidden',
      }}>
        {/* LEFT: Gauge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 4 }}>
          <ConfidenceGauge confidence={confidence} />
        </div>

        {/* RIGHT: MITRE + reason */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, overflow: 'hidden' }}>
          <div>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
              color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6,
            }}>
              MITRE ATT&CK TECHNIQUES
            </div>

            {mitreIds.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {mitreIds.map((id, i) => (
                  <MitreTechniqueChip key={id} id={id} name={mitreNames[i] || 'Unknown'} />
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>// AWAITING CLASSIFICATION</div>
            )}
          </div>

          {reason && (
            <div>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
                color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 5,
              }}>
                CLASSIFICATION REASON
              </div>
              <div style={{
                fontSize:   11,
                color:      'var(--text-2)',
                lineHeight: '17px',
                overflow:   'hidden',
                display:    '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                animation:  'fade-in 0.3s ease',
              }}>
                {reason}
              </div>
            </div>
          )}

          {!classifiedData && (
            <div style={{
              flex:           1,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              color:          'var(--text-3)',
              fontSize:       11,
              letterSpacing:  '0.08em',
            }}>
              // NO ACTIVE INCIDENT
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

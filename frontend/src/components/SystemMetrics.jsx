import React, { useRef, useEffect, useState } from 'react';

function MetricTile({ label, value, color, unit }) {
  const [animated, setAnimated] = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    if (value !== prevRef.current && value != null) {
      prevRef.current = value;
      setAnimated(false);
      // Force reflow for animation restart
      requestAnimationFrame(() => setAnimated(true));
    }
  }, [value]);

  return (
    <div className="panel" style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        '10px 8px',
      gap:            4,
      flex:           1,
    }}>
      <span style={{
        fontSize:      28,
        fontWeight:    700,
        color:         value != null ? color : 'var(--text-3)',
        display:       'block',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.02em',
        lineHeight:    1,
        animation:     animated ? 'counter-up 0.4s ease' : 'none',
        transition:    'color 0.3s ease',
      }}>
        {value != null ? `${value}${unit || ''}` : '--'}
      </span>
      <span style={{
        fontSize:      9,
        fontWeight:    700,
        letterSpacing: '0.14em',
        color:         'var(--text-3)',
        textTransform: 'uppercase',
        textAlign:     'center',
        lineHeight:    1.3,
      }}>
        {label}
      </span>
    </div>
  );
}

export default function SystemMetrics({ metrics }) {
  const { detectionMs, responseMs, confidence, actionsExecuted } = metrics;

  const detectionS  = detectionMs  != null ? (detectionMs  / 1000).toFixed(2) : null;
  const responseS   = responseMs   != null ? (responseMs   / 1000).toFixed(2) : null;
  const confidPct   = confidence   != null ? (confidence * 100).toFixed(1) : null;
  const respColor   = responseS != null
    ? (parseFloat(responseS) < 5 ? 'var(--green)' : 'var(--yellow)')
    : 'var(--text-3)';
  const confColor   = confidPct != null
    ? (parseFloat(confidPct) >= 90 ? 'var(--red)' : parseFloat(confidPct) >= 70 ? 'var(--yellow)' : 'var(--cyan)')
    : 'var(--text-3)';

  return (
    <div style={{
      gridArea:    'metrics',
      display:     'flex',
      gap:         8,
      padding:     '8px',
      borderTop:   '1px solid var(--border)',
      background:  'var(--bg-secondary)',
    }}>
      <MetricTile
        label="DETECTION TIME"
        value={detectionS}
        color="var(--cyan)"
        unit="s"
      />
      <MetricTile
        label="RESPONSE TIME"
        value={responseS}
        color={respColor}
        unit="s"
      />
      <MetricTile
        label="CONFIDENCE"
        value={confidPct}
        color={confColor}
        unit="%"
      />
      <MetricTile
        label="ACTIONS TAKEN"
        value={actionsExecuted}
        color="var(--red)"
      />
    </div>
  );
}

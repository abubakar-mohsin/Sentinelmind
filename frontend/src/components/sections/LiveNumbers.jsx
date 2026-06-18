import React, { useRef, useEffect, useState } from 'react';
import { useInView } from 'framer-motion';

const SECTION_LABEL = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '3px',
  textTransform: 'uppercase',
  color: '#3b82f6',
  marginBottom: 16,
};

function AnimatedStat({ value, suffix = '', decimals = 0, duration = 1800, color, label }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const end = parseFloat(value);
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setDisplay(end);
        clearInterval(timer);
      } else {
        setDisplay(parseFloat(start.toFixed(decimals)));
      }
    }, 16);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView]);

  return (
    <div ref={ref} style={{ background: '#0a0e1a', padding: '48px 24px' }}>
      <div style={{
        fontSize: 64,
        fontWeight: 800,
        color,
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        lineHeight: 1,
        marginBottom: 12,
      }}>
        {decimals > 0 ? display.toFixed(decimals) : Math.floor(display)}{suffix}
      </div>
      <div style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.5 }}>{label}</div>
    </div>
  );
}

const STATS = [
  {
    value: '10',
    suffix: 's',
    color: '#10b981',
    label: 'Average time from detection to containment',
  },
  {
    value: '93.9',
    suffix: '%',
    decimals: 1,
    color: '#3b82f6',
    label: 'AI confidence on credential stuffing demo',
  },
  {
    value: '8',
    color: '#f9fafb',
    label: 'Specialized AI agents working in parallel',
  },
  {
    value: '0',
    color: '#f59e0b',
    label: 'Human interventions required for containment',
  },
];

export default function LiveNumbers() {
  return (
    <section style={{ background: '#0a0e1a', padding: '100px 80px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>

        {/* Header */}
        <div style={SECTION_LABEL}>By the Numbers</div>
        <div style={{
          fontSize: 48,
          fontWeight: 800,
          color: '#f9fafb',
          letterSpacing: '-2px',
          marginBottom: 64,
        }}>
          The system in action.
        </div>

        {/* Stats grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1,
          background: '#1f2937',
          border: '1px solid #1f2937',
          borderRadius: 16,
          overflow: 'hidden',
        }}>
          {STATS.map((stat) => (
            <AnimatedStat
              key={stat.label}
              value={stat.value}
              suffix={stat.suffix || ''}
              decimals={stat.decimals || 0}
              color={stat.color}
              label={stat.label}
            />
          ))}
        </div>

      </div>
    </section>
  );
}

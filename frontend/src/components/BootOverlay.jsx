import React, { useState, useEffect } from 'react';

const BOOT_LINES = [
  { text: 'Loading MITRE ATT&CK framework',       delay: 0 },
  { text: 'Establishing Kafka event bus',           delay: 200 },
  { text: 'Connecting Neo4j knowledge graph',       delay: 380 },
  { text: 'PostgreSQL audit trail ready',           delay: 540 },
  { text: 'WebSocket gateway online',               delay: 680 },
  { text: 'Spawning agents: 4 registered',          delay: 820 },
  { text: 'Confidence threshold: 0.92',             delay: 940 },
  { text: 'All systems nominal',                    delay: 1100 },
];

export default function BootOverlay({ onComplete }) {
  const [visible, setVisible] = useState([]);
  const [fading,  setFading]  = useState(false);

  useEffect(() => {
    const timers = BOOT_LINES.map((line, i) =>
      setTimeout(() => setVisible(prev => [...prev, i]), line.delay)
    );

    const fadeTimer = setTimeout(() => setFading(true), 1600);
    const doneTimer = setTimeout(onComplete,           2100);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0a0a0a',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      opacity: fading ? 0 : 1,
      transition: 'opacity 0.5s ease',
    }}>
      <div style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 18,
        fontWeight: 600,
        color: '#fafafa',
        letterSpacing: '-0.01em',
      }}>
        SENTINELMIND
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        alignItems: 'center',
      }}>
        {BOOT_LINES.map((line, i) => (
          visible.includes(i) ? (
            <div key={i} style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: i === BOOT_LINES.length - 1 ? '#22c55e' : '#71717a',
              animation: 'fade-in 0.15s ease forwards',
            }}>
              {line.text}
            </div>
          ) : null
        ))}
      </div>
    </div>
  );
}

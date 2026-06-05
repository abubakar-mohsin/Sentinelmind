import React, { useState, useEffect } from 'react';

const BOOT_LINES = [
  { text: '> SENTINELMIND v1.0.0  //  AUTONOMOUS THREAT DETECTION PLATFORM', color: '#00F5FF', delay: 0 },
  { text: '> Loading MITRE ATT&CK framework...............................[OK]', color: '#8892A4', delay: 180 },
  { text: '> Establishing Kafka event bus...................................[OK]', color: '#8892A4', delay: 340 },
  { text: '> Connecting Neo4j knowledge graph...............................[OK]', color: '#8892A4', delay: 500 },
  { text: '> PostgreSQL audit trail.........................................[OK]', color: '#8892A4', delay: 650 },
  { text: '> WebSocket gateway..............................................[ONLINE]', color: '#8892A4', delay: 790 },
  { text: '> Spawning agents: ANOMALY-1  INTEL-1  CLASS-1  RESP-1', color: '#8892A4', delay: 930 },
  { text: '> Confidence threshold set to 0.92', color: '#8892A4', delay: 1060 },
  { text: '> ALL SYSTEMS NOMINAL  //  AWAITING THREAT INPUT', color: '#00FF88', delay: 1220 },
];

export default function BootOverlay({ onComplete }) {
  const [visible, setVisible]   = useState([]);
  const [fading,  setFading]    = useState(false);
  const [cursor,  setCursor]    = useState(true);

  useEffect(() => {
    const timers = BOOT_LINES.map((line, i) =>
      setTimeout(() => setVisible(prev => [...prev, i]), line.delay)
    );

    const cursorTimer  = setInterval(() => setCursor(c => !c), 530);
    const fadeTimer    = setTimeout(() => setFading(true),  1700);
    const doneTimer    = setTimeout(onComplete,             2200);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(cursorTimer);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#080B0F',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: fading ? 0 : 1,
      transition: 'opacity 0.5s ease',
    }}>
      {/* Scanlines on boot screen too */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.032) 2px, rgba(0,0,0,0.032) 3px)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: 580,
        padding: '0 24px',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        <div style={{
          fontSize: 10,
          letterSpacing: '0.20em',
          color: '#00F5FF',
          marginBottom: 20,
          textTransform: 'uppercase',
        }}>
          ◈ SYSTEM INITIALIZATION  //  SECURE ENCLAVE ACTIVE
        </div>

        {BOOT_LINES.map((line, i) => (
          visible.includes(i) ? (
            <div key={i} style={{
              color: line.color,
              fontSize: 12,
              lineHeight: '26px',
              animation: 'sweep-in 0.12s ease forwards',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}>
              {line.text}
            </div>
          ) : null
        ))}

        {visible.length === BOOT_LINES.length && (
          <div style={{
            color: '#00F5FF',
            fontSize: 12,
            lineHeight: '26px',
            marginTop: 2,
          }}>
            {'> '}<span style={{ opacity: cursor ? 1 : 0 }}>_</span>
          </div>
        )}
      </div>
    </div>
  );
}

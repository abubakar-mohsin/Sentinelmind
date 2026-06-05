import React, { useState, useEffect } from 'react';

function useClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toTimeString().slice(0, 8));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

const THREAT_CONFIG = {
  NOMINAL:   { label: 'NOMINAL',   color: '#00F5FF', bg: 'rgba(0,245,255,0.07)' },
  ELEVATED:  { label: 'ELEVATED',  color: '#FFB800', bg: 'rgba(255,184,0,0.08)' },
  CRITICAL:  { label: 'CRITICAL',  color: '#FF2D55', bg: 'rgba(255,45,85,0.10)' },
  CONTAINED: { label: 'CONTAINED', color: '#00FF88', bg: 'rgba(0,255,136,0.07)' },
};

export default function StatusBar({ connected, incidentActive, currentIncidentId, threatLevel }) {
  const time = useClock();
  const threat = THREAT_CONFIG[threatLevel] || THREAT_CONFIG.NOMINAL;
  const shortId = currentIncidentId ? currentIncidentId.slice(0, 8).toUpperCase() : null;

  return (
    <div style={{
      gridArea: 'status',
      height: 48,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 18px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0,
      gap: 16,
      minWidth: 0,
    }}>

      {/* LEFT — Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{ color: 'var(--cyan)', fontWeight: 700, fontSize: 14, letterSpacing: '0.04em' }}>
          ◈ SENTINELMIND
        </span>
        <span style={{ color: 'var(--text-3)', fontSize: 13 }}>//</span>
        <span style={{ color: 'var(--text-2)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          AUTONOMOUS THREAT DETECTION SYSTEM
        </span>
      </div>

      {/* CENTER — Active incident indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' }}>
        {incidentActive && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            animation: 'sweep-in 0.2s ease',
          }}>
            <span style={{
              width: 6, height: 6,
              borderRadius: '50%',
              background: 'var(--red)',
              display: 'inline-block',
              animation: 'pulse-dot 1.2s ease-in-out infinite',
            }} />
            <span style={{
              color: 'var(--red)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              animation: 'pulse-red 1.8s ease-in-out infinite',
            }}>
              ⚠ ACTIVE INCIDENT
            </span>
            {shortId && (
              <span style={{ color: 'var(--text-3)', fontSize: 10 }}>
                // {shortId}...
              </span>
            )}
          </div>
        )}

        {/* Threat level badge — always shown */}
        <div style={{
          padding: '3px 10px',
          background: threat.bg,
          border: `1px solid ${threat.color}33`,
          borderRadius: 'var(--radius)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: threat.color,
          textTransform: 'uppercase',
          flexShrink: 0,
        }}>
          THREAT: {threat.label}
        </div>
      </div>

      {/* RIGHT — Status + clock */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
        fontSize: 11,
        letterSpacing: '0.06em',
      }}>
        <span style={{
          color: connected ? 'var(--green)' : 'var(--red)',
          animation: connected ? 'none' : 'blink 1.4s step-end infinite',
          fontWeight: connected ? 400 : 700,
        }}>
          ◉ {connected ? 'ONLINE' : 'OFFLINE'}
        </span>

        <span style={{ color: 'var(--border-active)', fontSize: 9 }}>|</span>

        <span style={{ color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.08em' }}>
          {time}
        </span>

        <span style={{ color: 'var(--border-active)', fontSize: 9 }}>|</span>

        <span style={{ color: 'var(--text-3)', fontSize: 10 }}>v1.0.0</span>
      </div>
    </div>
  );
}

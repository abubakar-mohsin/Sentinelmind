import React, { useState, useEffect } from 'react';
import { Shield, Wifi, WifiOff, AlertTriangle, Clock } from 'lucide-react';

/*
 * StatusBar — persistent top header of the dashboard main content area.
 * Shows: brand logo | live threat level badge | incident status | connection + clock.
 * Uses Lucide React icons. No emojis anywhere.
 */

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

const THREAT_CFG = {
  NOMINAL:   { cls: 'threat-nominal',   label: 'Nominal'   },
  ELEVATED:  { cls: 'threat-elevated',  label: 'Elevated'  },
  CRITICAL:  { cls: 'threat-critical',  label: 'Critical'  },
  CONTAINED: { cls: 'threat-contained', label: 'Contained' },
};

export default function StatusBar({ connected, incidentActive, currentIncidentId, threatLevel }) {
  const time = useClock();
  const threat = THREAT_CFG[threatLevel] || THREAT_CFG.NOMINAL;
  const shortId = currentIncidentId ? currentIncidentId.slice(0, 8).toUpperCase() : null;

  return (
    <div className="status-bar">
      {/* LEFT — Brand */}
      <div className="status-bar__brand">
        <Shield size={15} strokeWidth={2.5} />
        SENTINELMIND
      </div>

      {/* CENTER — Threat level + active incident */}
      <div className="status-bar__center">
        {incidentActive && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            animation: 'sweep-in 0.2s ease',
          }}>
            <span className="status-dot dot-pulse-danger" />
            <span style={{ color: 'var(--danger)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}>
              ACTIVE INCIDENT
            </span>
            {shortId && (
              <span style={{ color: 'var(--text-3)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                / {shortId}
              </span>
            )}
            <AlertTriangle size={12} color="var(--danger)" strokeWidth={2.5} />
          </div>
        )}
        <span className={`status-bar__threat-badge ${threat.cls}`}>
          THREAT: {threat.label}
        </span>
      </div>

      {/* RIGHT — Connection status + clock */}
      <div className="status-bar__right">
        {connected ? (
          <span className="status-bar__online" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Wifi size={12} strokeWidth={2} />
            ONLINE
          </span>
        ) : (
          <span className="status-bar__offline" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <WifiOff size={12} strokeWidth={2} />
            OFFLINE
          </span>
        )}
        <span style={{ color: 'var(--border-active)', fontSize: 9 }}>|</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontVariantNumeric: 'tabular-nums' }}>
          <Clock size={11} strokeWidth={2} />
          {time}
        </span>
        <span style={{ color: 'var(--border-active)', fontSize: 9 }}>|</span>
        <span style={{ color: 'var(--text-3)', fontSize: 10 }}>v1.0.0</span>
      </div>
    </div>
  );
}

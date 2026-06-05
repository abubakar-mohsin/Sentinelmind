import React, { useState } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const PAYLOAD = {
  actor: 'ahmed@targetcorp.com',
  sourceIp: '185.220.101.47',
  action: 'LOGIN',
  userAgent: 'python-requests/2.28.0',
  loginLatencyMs: 312,
  country: 'RU',
  hour: 23,
};

// Syntax-highlighted JSON line renderer
function JsonLine({ k, v }) {
  const isStr = typeof v === 'string';
  return (
    <div>
      <span style={{ color: '#8892A4' }}>  "</span>
      <span style={{ color: '#00F5FF' }}>{k}</span>
      <span style={{ color: '#8892A4' }}>": </span>
      {isStr ? (
        <span style={{ color: '#00FF88' }}>"{v}"</span>
      ) : (
        <span style={{ color: '#FFB800' }}>{v}</span>
      )}
    </div>
  );
}

export default function SimulateButton({ disabled }) {
  const [loading,  setLoading]  = useState(false);
  const [status,   setStatus]   = useState(null); // 'ok' | 'err' | null

  async function handleClick() {
    if (loading || disabled) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...PAYLOAD, timestamp: new Date().toISOString() }),
      });
      setStatus(res.ok ? 'ok' : 'err');
    } catch {
      setStatus('err');
    } finally {
      setTimeout(() => { setLoading(false); setStatus(null); }, 3000);
    }
  }

  const btnDisabled = loading || disabled;
  const btnColor    = status === 'err' ? 'var(--yellow)' : 'var(--red)';

  return (
    <div style={{
      gridArea: 'sim',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-secondary)',
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      padding: '0 18px',
    }}>
      {/* LEFT — Payload preview */}
      <div style={{ flexShrink: 0 }}>
        <div style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.16em',
          color: 'var(--text-3)',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          ATTACK PAYLOAD
        </div>
        <div style={{
          background: 'var(--bg-deep)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '6px 12px',
          fontSize: 11,
          fontFamily: 'var(--font)',
          lineHeight: '18px',
        }}>
          <div style={{ color: 'var(--text-3)' }}>{'{'}</div>
          <JsonLine k="actor"    v={PAYLOAD.actor} />
          <JsonLine k="sourceIp" v={PAYLOAD.sourceIp} />
          <JsonLine k="country"  v={PAYLOAD.country} />
          <JsonLine k="hour"     v={PAYLOAD.hour} />
          <div style={{ color: 'var(--text-3)' }}>{'}'}</div>
        </div>
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 40, background: 'var(--border)', flexShrink: 0 }} />

      {/* RIGHT — Button */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.16em',
          color: 'var(--text-3)',
          textTransform: 'uppercase',
        }}>
          CREDENTIAL STUFFING SIMULATION
        </div>

        <button
          onClick={handleClick}
          disabled={btnDisabled}
          style={{
            fontFamily: 'var(--font)',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.14em',
            padding: '9px 28px',
            border: `2px solid ${btnDisabled ? 'var(--text-3)' : btnColor}`,
            background: status === 'ok'
              ? 'rgba(0,255,136,0.10)'
              : loading
              ? `rgba(255,45,85,0.14)`
              : 'transparent',
            color: btnDisabled ? 'var(--text-3)' : btnColor,
            cursor: btnDisabled ? 'not-allowed' : 'pointer',
            borderRadius: 'var(--radius)',
            transition: 'all 0.15s ease',
            boxShadow: !btnDisabled ? 'var(--glow-red)' : 'none',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            if (!btnDisabled) e.currentTarget.style.background = 'rgba(255,45,85,0.08)';
          }}
          onMouseLeave={e => {
            if (!btnDisabled && !loading) e.currentTarget.style.background = 'transparent';
          }}
        >
          {status === 'ok'  ? '✦ INJECTED SUCCESSFULLY' :
           status === 'err' ? '⚠ INJECTION FAILED' :
           loading          ? '⏳ INJECTING...' :
                              '▸ EXECUTE SIMULATION'}
        </button>

        <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em' }}>
          IP: 185.220.101.47  //  TARGET: ahmed@targetcorp.com  //  VECTOR: RU/23:00
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Cooldown indicator */}
      {disabled && !loading && (
        <div style={{
          fontSize: 10,
          color: 'var(--yellow)',
          letterSpacing: '0.10em',
          animation: 'pulse-red 2s ease-in-out infinite',
        }}>
          ⚠ INCIDENT IN PROGRESS — SIMULATION LOCKED
        </div>
      )}
    </div>
  );
}

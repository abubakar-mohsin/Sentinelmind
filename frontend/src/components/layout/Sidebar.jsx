import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || '';

function NavIcon({ path, size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      {Array.isArray(path)
        ? path.map((d, i) => <path key={i} d={d} />)
        : <path d={path} />}
    </svg>
  );
}

const NAV_ITEMS = [
  {
    key: 'overview',
    label: 'Overview',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    key: 'incidents',
    label: 'Live Feed',
    icon: ['M12 9v2m0 4h.01', 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z'],
  },
  {
    key: 'threat-graph',
    label: 'Threat Graph',
    icon: ['M12 5L12 8.5M7.5 16.5L11.5 14.5M16.5 16.5L12.5 14.5', 'M12 5a3 3 0 100-6 3 3 0 000 6zM5 19a3 3 0 100-6 3 3 0 000 6zM19 19a3 3 0 100-6 3 3 0 000 6z'],
  },
  {
    key: 'forensics',
    label: 'Forensics',
    icon: ['M15 12a3 3 0 11-6 0 3 3 0 016 0z', 'M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'],
  },
  {
    key: 'response-log',
    label: 'Incidents',
    icon: ['M8 9h8', 'M8 13h6', 'M14 3v4a1 1 0 001 1h4', 'M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z'],
  },
];

const ATTACK_TYPES = [
  { key: 'credential_stuffing', label: 'Credential Stuffing' },
  { key: 'brute_force',         label: 'Brute Force' },
  { key: 'insider_threat',      label: 'Insider Threat' },
  { key: 'account_takeover',    label: 'Account Takeover' },
  { key: 'impossible_travel',   label: 'Impossible Travel' },
  { key: 'impersonation',       label: 'Impersonation' },
];

function buildPayload(attackType) {
  const timestamp = new Date().toISOString();
  const payloads = {
    credential_stuffing: { actor: 'ahmed@targetcorp.com', sourceIp: '185.220.101.47', action: 'LOGIN', timestamp, userAgent: 'python-requests/2.28.0', loginLatencyMs: 312, country: 'RU', hour: 23 },
    brute_force:         { actor: 'admin@targetcorp.com', sourceIp: '45.33.32.156', action: 'LOGIN', timestamp, loginLatencyMs: 89, failedAttempts: 847, country: 'CN', hour: 3 },
    insider_threat:      { actor: 'sarah@targetcorp.com', sourceIp: '192.168.1.45', action: 'BULK_DATA_DOWNLOAD', timestamp, filesAccessed: 2847, dataVolumeGB: 47, hour: 2, country: 'PK' },
    account_takeover:    { actor: 'ceo@targetcorp.com', sourceIp: '185.220.101.47', action: 'PASSWORD_RESET_REQUEST', timestamp, userAgent: 'curl/7.68.0', hour: 14 },
    impossible_travel:   { actor: 'ahmed@targetcorp.com', sourceIp: '8.8.8.8', action: 'LOGIN', timestamp, country: 'JP', hour: 10, previousLoginCountry: 'PK', minutesSincePreviousLogin: 8 },
    impersonation:       { actor: 'support_agent_52', targetUser: 'ceo@targetcorp.com', action: 'ASSUME_ROLE', timestamp, userAgent: 'Automated-Token-Broker/1.0', country: 'US', hour: 14 },
  };
  return payloads[attackType] || payloads.credential_stuffing;
}

export default function Sidebar({ activePage = 'overview', incidentActive, connected, threatLevel, onNavigate, onSimulate }) {
  const [simMenuOpen, setSimMenuOpen]     = useState(false);
  const [simLoading, setSimLoading]       = useState(false);
  const [useLive, setUseLive]             = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/config/threat-intel-mode`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.mode) setUseLive(data.mode === 'real'); })
      .catch(() => {});
  }, []);

  async function handleToggle() {
    if (toggleLoading) return;
    const nextMode = useLive ? 'mock' : 'real';
    setToggleLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/config/threat-intel-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: nextMode }),
      });
      if (res.ok) setUseLive(nextMode === 'real');
    } catch { /* backend unreachable */ }
    setToggleLoading(false);
  }

  async function handleSimulate(attackType) {
    setSimMenuOpen(false);
    setSimLoading(true);
    try {
      await fetch(`${API_BASE}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(attackType)),
      });
    } catch { /* backend unreachable */ }
    setSimLoading(false);
  }

  const user = (() => {
    try { return JSON.parse(localStorage.getItem('sm_user') || '{}'); } catch { return {}; }
  })();

  function handleSignOut() {
    localStorage.removeItem('sm_authed');
    localStorage.removeItem('sm_user');
    window.location.href = '/';
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fafafa"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <span className="sidebar-logo-text">SentinelMind</span>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>

        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            className={`nav-item ${activePage === item.key ? 'active' : ''}`}
            onClick={() => onNavigate?.(item.key)}
          >
            <NavIcon path={item.icon} />
            {item.label}
            {item.key === 'incidents' && incidentActive && (
              <span style={{ marginLeft: 'auto' }}>
                <span className="status-dot dot-pulse-danger" />
              </span>
            )}
          </button>
        ))}

        {/* Simulate Attack */}
        <div style={{ padding: '12px 2px 4px', position: 'relative' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setSimMenuOpen(!simMenuOpen)}
            disabled={incidentActive || simLoading}
            style={{ width: '100%', fontSize: 12 }}
          >
            {simLoading ? 'Injecting...' : incidentActive ? 'Incident Active' : 'Simulate Attack'}
          </button>

          {simMenuOpen && !incidentActive && !simLoading && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              marginBottom: 4,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-active)',
              borderRadius: 6,
              padding: 4,
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}>
              {ATTACK_TYPES.map(atk => (
                <button
                  key={atk.key}
                  className="nav-item"
                  onClick={() => handleSimulate(atk.key)}
                  style={{ fontSize: 12 }}
                >
                  {atk.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* System Status */}
        <div className="sidebar-section-label">System</div>

        <div style={{ padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-3)' }}>
            <span className={`status-dot ${connected ? 'dot-success' : 'dot-danger'}`} />
            Kafka
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-3)' }}>
            <span className={`status-dot ${connected ? 'dot-success' : 'dot-danger'}`} />
            Neo4j
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-3)' }}>
            <span className={`status-dot ${connected ? 'dot-success' : 'dot-danger'}`} />
            PostgreSQL
          </div>
        </div>

        {/* Mock / Live toggle */}
        <div style={{
          padding: '8px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: !useLive ? 'var(--text-1)' : 'var(--text-4)',
            letterSpacing: '0.04em',
          }}>
            MOCK
          </span>

          <button
            onClick={handleToggle}
            disabled={toggleLoading}
            style={{
              width: 30, height: 16, borderRadius: 8,
              background: useLive ? 'var(--success)' : 'rgba(255,255,255,0.12)',
              position: 'relative',
              cursor: toggleLoading ? 'wait' : 'pointer',
              transition: 'background 0.2s',
              flexShrink: 0,
              border: 'none',
              padding: 0,
            }}
          >
            <span style={{
              position: 'absolute',
              top: 2,
              left: useLive ? 16 : 2,
              width: 12, height: 12,
              borderRadius: '50%',
              background: 'white',
              transition: 'left 0.2s',
              display: 'block',
            }} />
          </button>

          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: useLive ? 'var(--success)' : 'var(--text-4)',
            letterSpacing: '0.04em',
          }}>
            LIVE
          </span>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 4px', marginBottom: 4,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--accent-dim)',
            border: '1px solid rgba(99,102,241,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600, color: 'var(--accent)',
            flexShrink: 0,
          }}>
            {(user.name || user.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name || 'User'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email || ''}
            </div>
          </div>
        </div>

        <button
          className="nav-item"
          onClick={handleSignOut}
          style={{ width: '100%' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}

import React from 'react';

function NavIcon({ path, size = 16 }) {
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
    label: 'Live Incidents',
    icon: ['M12 9v2m0 4h.01', 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z'],
  },
  {
    key: 'agents',
    label: 'Agent Pipeline',
    icon: ['M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18'],
  },
  {
    key: 'threat-intel',
    label: 'Threat Intel',
    icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  },
  {
    key: 'response-log',
    label: 'Response Log',
    icon: ['M8 9h8', 'M8 13h6', 'M14 3v4a1 1 0 001 1h4', 'M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z'],
  },
  {
    key: 'forensics',
    label: 'Incident Forensics',
    icon: ['M15 12a3 3 0 11-6 0 3 3 0 016 0z', 'M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'],
  },
  {
    key: 'threat-graph',
    label: 'Threat Graph',
    icon: ['M12 5L12 8.5M7.5 16.5L11.5 14.5M16.5 16.5L12.5 14.5', 'M12 5a3 3 0 100-6 3 3 0 000 6zM5 19a3 3 0 100-6 3 3 0 000 6zM19 19a3 3 0 100-6 3 3 0 000 6z'],
  },
];

export default function Sidebar({ activePage = 'overview', incidentActive, connected, threatLevel, onNavigate }) {
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

      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <span className="sidebar-logo-text">SentinelMind</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Platform</div>

        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            className={`nav-item ${activePage === item.key ? 'active' : ''}`}
            onClick={() => onNavigate?.(item.key)}
            style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', fontFamily: 'inherit' }}
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

        {/* System status section */}
        <div className="sidebar-section-label" style={{ marginTop: 16 }}>Status</div>

        <div style={{
          padding: '8px 12px',
          borderRadius: 'var(--r)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-3)' }}>
            <span className={`status-dot ${connected ? 'dot-success' : 'dot-danger'}`} />
            {connected ? 'Connected' : 'Disconnected'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-3)' }}>
            <span className={`status-dot ${incidentActive ? 'dot-pulse-danger' : 'dot-muted'}`} />
            {incidentActive ? 'Incident Active' : 'No Active Incidents'}
          </div>

          {threatLevel && threatLevel !== 'NOMINAL' && (
            <div style={{
              marginTop: 2,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: threatLevel === 'CRITICAL' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
              color: threatLevel === 'CRITICAL' ? 'var(--danger)' : 'var(--warning)',
              borderRadius: 'var(--r-full)',
              padding: '3px 10px',
              fontSize: 11,
              fontWeight: 600,
              width: 'fit-content',
            }}>
              {threatLevel}
            </div>
          )}
        </div>
      </nav>

      {/* Footer: user + sign out */}
      <div className="sidebar-footer">
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 4px', marginBottom: 6,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'var(--brand-dim)',
            border: '1px solid rgba(99,102,241,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: 'var(--brand)',
            flexShrink: 0,
          }}>
            {(user.name || user.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
          style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', fontFamily: 'inherit', color: 'var(--text-3)' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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

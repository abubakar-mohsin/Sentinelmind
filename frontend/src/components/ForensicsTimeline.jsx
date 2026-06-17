import React, { useState, useEffect } from 'react';

export default function ForensicsTimeline({ incidentId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!incidentId) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa('admin:sentinelmind'));

    fetch(`/api/forensics/${incidentId}`, { headers })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch forensics data');
        return res.json();
      })
      .then(json => {
        if (mounted) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          console.error('[Forensics] error:', err);
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [incidentId]);

  if (!incidentId) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, marginBottom: 16 }}>
          <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <h3>No Incident Active</h3>
        <p>Trigger a simulation or wait for a security event to view its forensic timeline.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent)' }}>
        Generating Forensic Timeline using Groq AI...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--danger)' }}>
        <h3>Error Generating Timeline</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!data || !data.forensicsTimeline) {
    return null;
  }

  const tl = data.forensicsTimeline;

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      
      <div style={{ marginBottom: 32, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
        <h2 style={{ margin: 0, color: 'var(--text-1)', fontSize: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          INCIDENT FORENSICS
          <span style={{ fontSize: 14, background: 'var(--accent-dim)', color: 'var(--accent)', padding: '4px 10px', borderRadius: 6, fontFamily: 'monospace' }}>
            {incidentId.substring(0, 8)}
          </span>
        </h2>
        {tl.narrative && (
          <p style={{ color: 'var(--text-2)', fontSize: 15, marginTop: 12, lineHeight: 1.6 }}>
            {tl.narrative}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <TimelineNode title="Attack Initiated" time={tl.startTime} icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" color="var(--danger)" />
        <TimelineNode title="Target / Access Attempted" body={tl.targetAccess} icon="M15 7h3a5 5 0 015 5 5 5 0 01-5 5h-3m-6 0H6a5 5 0 01-5-5 5 5 0 015-5h3m-3 5h12" color="var(--warning)" />
        <TimelineNode title="Dwell Time" body={tl.dwellTime} icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" color="var(--accent)" />
        <TimelineNode title="Blast Radius" body={tl.blastRadius} icon="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" color="var(--warning)" />
        <TimelineNode title="Unmitigated Impact" body={tl.unmitigatedImpact} icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" color="var(--danger)" isLast />
      </div>
    </div>
  );
}

function TimelineNode({ title, time, body, icon, color, isLast }) {
  return (
    <div style={{ display: 'flex', gap: 20 }}>
      {/* Connector column */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ 
          width: 36, height: 36, borderRadius: '50%', 
          background: color ? `${color}20` : 'var(--accent-dim)', 
          color: color || 'var(--accent)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={icon} />
          </svg>
        </div>
        {!isLast && (
          <div style={{ width: 2, flex: 1, background: 'var(--border)', marginTop: 8 }} />
        )}
      </div>

      {/* Content column */}
      <div style={{ paddingBottom: isLast ? 0 : 32, flex: 1 }}>
        <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-1)', fontSize: 15 }}>{title}</h4>
        {time && <div style={{ fontSize: 13, color: color || 'var(--text-3)', fontWeight: 600, marginBottom: 4 }}>{time}</div>}
        {body && <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>{body}</div>}
      </div>
    </div>
  );
}

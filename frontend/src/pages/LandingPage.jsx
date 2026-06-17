import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import FloatingPaths, { AnimatedHeadline } from '../components/ui/FloatingPaths';

/* ── Navbar ──────────────────────────────────────── */

function Navbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className="landing-nav" style={{ borderBottomColor: scrolled ? 'rgba(255,255,255,0.1)' : 'transparent' }}>
      <div className="landing-nav-inner">

        <div className="nav-logo">
          <div className="nav-logo-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          SentinelMind
        </div>

        <div className="nav-links">
          <a className="nav-link" href="#features">Features</a>
          <a className="nav-link" href="#how-it-works">How it works</a>
          <a className="nav-link" href="#architecture">Architecture</a>
        </div>

        <div className="nav-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/login')}>
            Sign in
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/signup')}>
            Get started free
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

      </div>
    </nav>
  );
}

/* ── Dashboard preview (SVG mockup) ─────────────── */

function DashboardPreview() {
  return (
    <div className="hero-preview">
      {/* Fake browser chrome */}
      <div style={{
        background: '#111115',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['#EF4444','#F59E0B','#22C55E'].map(c => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }} />
          ))}
        </div>
        <div style={{
          flex: 1,
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 6,
          height: 22,
          maxWidth: 360,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 10,
          fontSize: 11,
          color: '#52525B',
        }}>
          app.sentinelmind.io/dashboard
        </div>
      </div>

      {/* Mock dashboard */}
      <div style={{ display: 'flex', height: 460, overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{
          width: 200,
          background: '#111115',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          padding: '16px 8px',
          flexShrink: 0,
        }}>
          {/* Logo row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 16px' }}>
            <div style={{ width: 22, height: 22, background: '#6366F1', borderRadius: 6, flexShrink: 0 }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: '#FAFAFA' }}>SentinelMind</div>
          </div>

          {/* Nav items */}
          {[
            { label: 'Overview', active: true },
            { label: 'Live Incidents', dot: 'red' },
            { label: 'Agent Pipeline' },
            { label: 'Threat Intel' },
            { label: 'Response Log' },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', borderRadius: 6, marginBottom: 2,
              background: item.active ? 'rgba(99,102,241,0.12)' : 'transparent',
              color: item.active ? '#6366F1' : '#71717A',
              fontSize: 12, fontWeight: 500,
            }}>
              <div style={{ width: 14, height: 14, background: item.active ? '#6366F1' : 'rgba(255,255,255,0.08)', borderRadius: 3 }} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.dot === 'red' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} />}
            </div>
          ))}

          {/* Status at bottom */}
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', fontSize: 11, color: '#22C55E' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
              System Online
            </div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: 16, background: '#09090B', overflow: 'hidden' }}>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
            {[
              { label: 'Active Threats', value: '3', color: '#EF4444' },
              { label: 'Response Time', value: '8.4s', color: '#22C55E' },
              { label: 'Confidence', value: '96.2%', color: '#6366F1' },
              { label: 'Actions Taken', value: '12', color: '#F59E0B' },
            ].map(s => (
              <div key={s.label} style={{
                background: '#18181B',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10,
                padding: '12px 14px',
              }}>
                <div style={{ fontSize: 10, color: '#71717A', marginBottom: 6, fontWeight: 500 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Agent pipeline */}
          <div style={{
            background: '#18181B',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 10,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#A1A1AA', marginBottom: 12 }}>Agent Pipeline</div>
            <div style={{ display: 'flex', gap: 0, alignItems: 'center' }}>
              {[
                { name: 'Anomaly', status: 'complete' },
                { name: 'Threat Intel', status: 'complete' },
                { name: 'Classifier', status: 'running' },
                { name: 'Responder', status: 'idle' },
              ].map((agent, i) => (
                <React.Fragment key={agent.name}>
                  <div style={{
                    flex: 1,
                    background: '#27272A',
                    border: `1px solid ${agent.status === 'running' ? 'rgba(99,102,241,0.4)' : agent.status === 'complete' ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: 8,
                    padding: '8px 10px',
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>{agent.name}</div>
                    <div style={{ fontSize: 10, color: agent.status === 'complete' ? '#22C55E' : agent.status === 'running' ? '#6366F1' : '#52525B', fontWeight: 500 }}>
                      {agent.status === 'complete' ? '✓ Complete' : agent.status === 'running' ? '● Running' : '○ Idle'}
                    </div>
                  </div>
                  {i < 3 && (
                    <div style={{ width: 20, height: 1, background: i < 2 ? '#22C55E' : 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Bottom row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* Alert */}
            <div style={{ background: '#18181B', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#A1A1AA', marginBottom: 10 }}>Recent Incidents</div>
              {['Credential Stuffing', 'Brute Force Attempt'].map((inc, i) => (
                <div key={inc} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: i === 0 ? '#EF4444' : '#F59E0B' }} />
                  <span style={{ fontSize: 11, color: '#A1A1AA' }}>{inc}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: '#52525B' }}>2m ago</span>
                </div>
              ))}
            </div>

            {/* Response log */}
            <div style={{ background: '#18181B', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#A1A1AA', marginBottom: 10 }}>Response Actions</div>
              {[
                { action: 'IP Blocked', color: '#EF4444' },
                { action: 'Session Revoked', color: '#F59E0B' },
                { action: 'Alert Raised', color: '#6366F1' },
              ].map(r => (
                <div key={r.action} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: r.color }} />
                  <span style={{ fontSize: 11, color: '#A1A1AA' }}>{r.action}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: r.color, fontWeight: 600 }}>✓</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main LandingPage ─────────────────────────────── */

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
      label: 'Real-time Detection',
      desc: 'Z-score behavioral analysis detects anomalies in login patterns the moment they occur — sub-second latency.',
      bg: 'rgba(99,102,241,0.1)',
      color: '#6366F1',
    },
    {
      icon: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z M12 8v4l2 2',
      label: 'Threat Intelligence',
      desc: 'Cross-references events against known threat feeds and Tor exit nodes in real time.',
      bg: 'rgba(59,130,246,0.1)',
      color: '#3B82F6',
    },
    {
      icon: 'M9 3H5a2 2 0 0 0-2 2v4 M9 3l6 6 M9 3v6h6 M21 16v-2a4 4 0 0 0-4-4H8 M21 16l-3-3m3 3l-3 3',
      label: 'MITRE ATT&CK Mapping',
      desc: 'Every threat is automatically classified against the MITRE ATT&CK framework with technique IDs.',
      bg: 'rgba(139,92,246,0.1)',
      color: '#8B5CF6',
    },
    {
      icon: 'M13 10V3L4 14h7v7l9-11h-7z',
      label: 'Instant Response',
      desc: 'Automatically blocks IPs, revokes sessions, and raises alerts — all within seconds of detection.',
      bg: 'rgba(245,158,11,0.1)',
      color: '#F59E0B',
    },
    {
      icon: 'M22 12h-4l-3 9L9 3l-3 9H2',
      label: 'Knowledge Graph',
      desc: 'Neo4j-powered graph database maps relationships between actors, IPs, sessions, and services.',
      bg: 'rgba(34,197,94,0.1)',
      color: '#22C55E',
    },
    {
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z',
      label: 'Full Audit Trail',
      desc: 'Every event, finding, and action is written to PostgreSQL — a complete, tamper-evident audit log.',
      bg: 'rgba(239,68,68,0.1)',
      color: '#EF4444',
    },
  ];

  const steps = [
    {
      num: '01',
      title: 'Event Detected',
      desc: 'A login event from a suspicious IP arrives in real time via REST API or Kafka stream.',
    },
    {
      num: '02',
      title: 'AI Analysis',
      desc: 'Four specialized agents analyze the event in parallel — behavioral, intelligence, and classification.',
    },
    {
      num: '03',
      title: 'Classification',
      desc: 'The threat is mapped to MITRE ATT&CK technique IDs with a confidence score above 92%.',
    },
    {
      num: '04',
      title: 'Auto Response',
      desc: 'The Incident Responder blocks the IP, revokes sessions, and logs the full evidence chain.',
    },
  ];

  return (
    <div className="landing-page">
      <Navbar />

      {/* ── Hero ── */}
      <section className="hero" style={{ position: 'relative', overflow: 'hidden' }}>

        {/* Animated background paths — two mirrored layers for depth */}
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />

        {/* Radial glow at centre to make paths fade at edges */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, transparent 30%, var(--bg-root, #09090B) 80%)',
          pointerEvents: 'none',
          zIndex: 1,
        }} />

        {/* Hero content — sits above path layers */}
        <div style={{ position: 'relative', zIndex: 2 }}>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="hero-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              Autonomous Multi-Agent AI Security
            </div>
          </motion.div>

          <h1 className="hero-headline">
            <AnimatedHeadline
              text="Think faster than"
              style={{ display: 'block' }}
            />
            <AnimatedHeadline
              text="every threat."
              className="gradient-text"
              style={{ display: 'block' }}
            />
          </h1>

          <motion.p
            className="hero-sub"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            SentinelMind deploys a coordinated swarm of AI agents that detect credential stuffing
            in real time, map every threat to MITRE ATT&CK, and neutralize it autonomously —
            all within 10 seconds of the first suspicious signal.
          </motion.p>

          <motion.div
            className="hero-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95, duration: 0.5 }}
          >
            <button className="btn btn-primary btn-xl" onClick={() => navigate('/signup')}>
              Start protecting now
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <button className="btn btn-ghost btn-xl" onClick={() => navigate('/login')}>
              Watch the live demo
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.7 }}
          >
            <DashboardPreview />
          </motion.div>

        </div>
      </section>

      {/* ── Stats band ── */}
      <div className="stats-band">
        <div className="stats-band-inner">
          <div className="stat-item">
            <div className="stat-item-value">&lt;<span className="unit">10</span>s</div>
            <div className="stat-item-label">Average threat response time</div>
          </div>
          <div className="stat-item">
            <div className="stat-item-value"><span className="unit">4</span></div>
            <div className="stat-item-label">Specialized AI agents deployed</div>
          </div>
          <div className="stat-item">
            <div className="stat-item-value"><span className="unit">6</span></div>
            <div className="stat-item-label">Design patterns implemented</div>
          </div>
        </div>
      </div>

      {/* ── Features ── */}
      <section id="features" className="features-section">
        <div style={{ maxWidth: 560 }}>
          <div className="section-label">Platform capabilities</div>
          <h2 className="section-title">Everything you need to secure your infrastructure</h2>
          <p className="section-sub">
            Six specialized agents work in concert, powered by a knowledge graph and real-time event bus.
          </p>
        </div>

        <div className="features-grid">
          {features.map(f => (
            <div key={f.label} className="feature-card">
              <div className="feature-icon" style={{ background: f.bg }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={f.color}
                  strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d={f.icon} />
                </svg>
              </div>
              <div className="feature-title">{f.label}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="how-section">
        <div className="how-inner">
          <div style={{ maxWidth: 560 }}>
            <div className="section-label">How it works</div>
            <h2 className="section-title">From event to containment in seconds</h2>
            <p className="section-sub">
              The ReAct orchestration loop dispatches agents, collects findings, and authorizes response — autonomously.
            </p>
          </div>

          <div className="steps-grid">
            {steps.map((s, i) => (
              <div key={s.num} className="step-item">
                <div className="step-number">{s.num}</div>
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Architecture callout ── */}
      <section id="architecture" style={{ padding: '96px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div>
              <div className="section-label">Architecture</div>
              <h2 className="section-title">Built on proven design patterns</h2>
              <p className="section-sub" style={{ marginBottom: 32 }}>
                Every component maps to a classic software design pattern — making the architecture
                easy to explain, extend, and grade.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { pattern: 'Singleton', usage: 'KnowledgeGraphService — one Neo4j connection' },
                  { pattern: 'Factory',   usage: 'AgentFactory — creates agents by type' },
                  { pattern: 'Builder',   usage: 'IncidentReport.Builder — assembles findings' },
                  { pattern: 'Adapter',   usage: 'VirusTotalAdapter — unified threat feed API' },
                  { pattern: 'Chain of Responsibility', usage: 'AbstractEventHandler — severity escalation' },
                  { pattern: 'Command',   usage: 'BlockIpCommand, RevokeSessionCommand' },
                ].map(p => (
                  <div key={p.pattern} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    background: '#18181B', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 10, padding: '12px 16px',
                  }}>
                    <span style={{
                      background: 'rgba(99,102,241,0.12)', color: '#6366F1',
                      padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                      white: 'nowrap', flexShrink: 0,
                    }}>
                      {p.pattern}
                    </span>
                    <span style={{ fontSize: 13, color: '#A1A1AA', lineHeight: 1.5 }}>{p.usage}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tech stack */}
            <div style={{
              background: '#18181B',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 20,
              padding: 32,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#71717A', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 24 }}>Tech Stack</div>

              {[
                { category: 'Backend',   items: ['Java 21', 'Spring Boot 3', 'Kafka'] },
                { category: 'Database',  items: ['Neo4j', 'PostgreSQL', 'Redis'] },
                { category: 'Frontend',  items: ['React 18', 'D3.js', 'WebSocket'] },
                { category: 'Runtime',   items: ['Docker Compose', 'JVM 21', 'Node 18'] },
              ].map(s => (
                <div key={s.category} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#52525B', marginBottom: 8 }}>{s.category}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {s.items.map(item => (
                      <span key={item} style={{
                        background: '#27272A', border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 6, padding: '4px 10px', fontSize: 12,
                        color: '#A1A1AA', fontWeight: 500,
                      }}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="cta-card">
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="hero-badge" style={{ marginBottom: 20 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Ready to get started?
            </div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 700, marginBottom: 16, letterSpacing: '-0.025em' }}>
              Start protecting your infrastructure
            </h2>
            <p style={{ fontSize: 17, color: '#71717A', marginBottom: 36, maxWidth: 420, margin: '0 auto 36px' }}>
              Run the full demo in minutes with a single Docker Compose command.
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-xl" onClick={() => navigate('/signup')}>
                Create free account
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
              <button className="btn btn-ghost btn-xl" onClick={() => navigate('/login')}>
                Sign in
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div>
              <div className="nav-logo" style={{ marginBottom: 12 }}>
                <div className="nav-logo-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                SentinelMind
              </div>
              <p style={{ fontSize: 13, color: '#52525B', lineHeight: 1.6 }}>
                Autonomous multi-agent AI cybersecurity platform.
              </p>
            </div>

            <div className="footer-links-grid">
              <div>
                <div className="footer-col-title">Product</div>
                <button className="footer-link">Features</button>
                <button className="footer-link">Dashboard</button>
                <button className="footer-link">Agents</button>
                <button className="footer-link">API</button>
              </div>
              <div>
                <div className="footer-col-title">Architecture</div>
                <button className="footer-link">Design Patterns</button>
                <button className="footer-link">Knowledge Graph</button>
                <button className="footer-link">Event Bus</button>
                <button className="footer-link">Audit Log</button>
              </div>
              <div>
                <div className="footer-col-title">Security</div>
                <button className="footer-link">MITRE ATT&CK</button>
                <button className="footer-link">Threat Intel</button>
                <button className="footer-link">Incident Response</button>
                <button className="footer-link">Anomaly Detection</button>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <span style={{ fontSize: 13, color: '#52525B' }}>
              © 2025 SentinelMind. University Software Design &amp; Architecture Project.
            </span>
            <div style={{ display: 'flex', gap: 16 }}>
              <button className="footer-link" style={{ padding: 0 }}>Privacy</button>
              <button className="footer-link" style={{ padding: 0 }}>Terms</button>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

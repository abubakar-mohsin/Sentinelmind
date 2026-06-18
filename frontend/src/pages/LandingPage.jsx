import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import FloatingPaths, { AnimatedHeadline } from '../components/ui/FloatingPaths';
import Sparkles from '../components/ui/Sparkles';
import InfiniteSlider from '../components/ui/InfiniteSlider';
import ProgressiveBlur from '../components/ui/ProgressiveBlur';
import TheProblem from '../components/sections/TheProblem';
import HowItWorks from '../components/sections/HowItWorks';
import LiveNumbers from '../components/sections/LiveNumbers';
import FinalCTA from '../components/sections/FinalCTA';

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

/* ── Counter hook (module-level so hooks rules are satisfied) ── */

function useCounter(target, duration, decimals, suffix) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setValue(target);
        clearInterval(timer);
      } else {
        setValue(parseFloat(start.toFixed(decimals)));
      }
    }, 16);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return decimals > 0 ? value.toFixed(decimals) + suffix : String(Math.floor(value)) + suffix;
}

/* ── Animated 3D dashboard preview ───────────────── */

function DashboardPreview() {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { stiffness: 120, damping: 18, mass: 0.8 };
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [12, -12]), springConfig);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-16, 16]), springConfig);
  const glowX   = useSpring(useTransform(x, [-0.5, 0.5], [0, 100]), springConfig);
  const glowY   = useSpring(useTransform(y, [-0.5, 0.5], [0, 100]), springConfig);
  const glowBackground = useTransform(
    [glowX, glowY],
    ([gx, gy]) => `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.8), transparent 60%)`
  );

  const threats      = useCounter(3,    1200, 0, '');
  const responseTime = useCounter(8.4,  1800, 1, 's');
  const confidence   = useCounter(96.2, 2000, 1, '%');
  const actions      = useCounter(12,   1400, 0, '');

  function handleMouseMove(e) {
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top)  / rect.height - 0.5);
  }
  function handleMouseLeave() { x.set(0); y.set(0); }

  const agents = [
    { name: 'Anomaly',     status: 'complete' },
    { name: 'Threat Intel', status: 'complete' },
    { name: 'Classifier',  status: 'running'  },
    { name: 'Responder',   status: 'idle'     },
  ];

  const incidents = [
    { color: '#ef4444', label: 'Credential Stuffing',  time: '2m ago'  },
    { color: '#f59e0b', label: 'Brute Force Attempt',   time: '5m ago'  },
    { color: '#f59e0b', label: 'Impossible Travel',     time: '12m ago' },
  ];

  const responses = [
    { label: 'IP Blocked' },
    { label: 'Session Revoked' },
    { label: 'Alert Dispatched' },
  ];

  const cardStyle = {
    background: 'rgba(17,24,39,0.7)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: '10px 12px',
  };
  const panelTitleStyle = {
    fontSize: 9,
    color: '#4b5563',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: '1200px', marginTop: 48, width: '100%', maxWidth: 860, margin: '48px auto 0' }}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          borderRadius: 16,
          overflow: 'hidden',
          background: 'rgba(10,14,26,0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(59,130,246,0.18)',
          boxShadow: '0 50px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(59,130,246,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
          position: 'relative',
        }}
      >
        {/* Glare overlay */}
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 16,
            opacity: 0.07,
            background: glowBackground,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        />

        {/* Browser chrome */}
        <div style={{
          background: 'rgba(17,24,39,0.9)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {['#ff5f57', '#febc2e', '#28c840'].map(c => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
          ))}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <span style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 6,
              padding: '3px 16px',
              fontSize: 11,
              color: '#4b5563',
              fontFamily: 'monospace',
            }}>
              app.sentinelmind.io/dashboard
            </span>
          </div>
        </div>

        <div style={{ padding: 16, display: 'flex', gap: 12 }}>
          {/* Sidebar */}
          <div style={{
            width: 130,
            flexShrink: 0,
            background: 'rgba(17,24,39,0.6)',
            borderRadius: 10,
            padding: '12px 8px',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            {['Overview', 'Live Incidents', 'Agent Pipeline', 'Threat Intel', 'Response Log'].map((item, i) => (
              <div key={item} style={{
                padding: '7px 10px',
                borderRadius: 6,
                fontSize: 11,
                color: i === 0 ? '#3b82f6' : '#4b5563',
                background: i === 0 ? 'rgba(59,130,246,0.1)' : 'transparent',
                marginBottom: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: i === 0 ? '#3b82f6' : '#1f2937' }} />
                {item}
              </div>
            ))}
            <div style={{ marginTop: 16, padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <motion.div
                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }}
                />
                <span style={{ fontSize: 10, color: '#10b981' }}>System Online</span>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 10 }}>
              {[
                { label: 'Active Threats', value: threats,      color: '#ef4444' },
                { label: 'Response Time',  value: responseTime, color: '#10b981' },
                { label: 'Confidence',     value: confidence,   color: '#3b82f6' },
                { label: 'Actions Taken',  value: actions,      color: '#f59e0b' },
              ].map(card => (
                <div key={card.label} style={cardStyle}>
                  <div style={{ ...panelTitleStyle, marginBottom: 5 }}>{card.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: card.color, fontFamily: 'monospace' }}>{card.value}</div>
                </div>
              ))}
            </div>

            {/* Agent pipeline */}
            <div style={{ ...cardStyle, marginBottom: 10 }}>
              <div style={panelTitleStyle}>Agent Pipeline</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {agents.map((agent, i) => (
                  <React.Fragment key={agent.name}>
                    <div style={{
                      flex: 1,
                      background: agent.status === 'complete' ? 'rgba(16,185,129,0.1)'
                                : agent.status === 'running'  ? 'rgba(59,130,246,0.1)'
                                : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${agent.status === 'complete' ? 'rgba(16,185,129,0.3)'
                             : agent.status === 'running'               ? 'rgba(59,130,246,0.3)'
                             : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: 6,
                      padding: '6px 8px',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}>
                      {agent.status === 'complete' && <span style={{ color: '#10b981', fontSize: 9 }}>✓</span>}
                      {agent.status === 'running'  && (
                        <motion.div
                          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                          style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6' }}
                        />
                      )}
                      {agent.status === 'idle' && <span style={{ color: '#4b5563', fontSize: 9 }}>○</span>}
                      <span style={{
                        fontSize: 9,
                        fontWeight: 500,
                        color: agent.status === 'complete' ? '#10b981'
                             : agent.status === 'running'  ? '#3b82f6'
                             : '#4b5563',
                      }}>{agent.name}</span>
                    </div>
                    {i < agents.length - 1 && (
                      <div style={{ width: 12, height: 1, background: 'rgba(59,130,246,0.2)', flexShrink: 0 }} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Bottom panels */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={cardStyle}>
                <div style={panelTitleStyle}>Recent Incidents</div>
                {incidents.map((inc, i) => (
                  <motion.div
                    key={inc.label}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.15 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}
                  >
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: inc.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: '#9ca3af', flex: 1 }}>{inc.label}</span>
                    <span style={{ fontSize: 9, color: '#4b5563' }}>{inc.time}</span>
                  </motion.div>
                ))}
              </div>
              <div style={cardStyle}>
                <div style={panelTitleStyle}>Response Actions</div>
                {responses.map((res, i) => (
                  <motion.div
                    key={res.label}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.15 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}
                  >
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.6 + i * 0.15, type: 'spring' }}
                      style={{ color: '#10b981', fontSize: 10 }}
                    >✓</motion.span>
                    <span style={{ fontSize: 10, color: '#9ca3af' }}>{res.label}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom status bar */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(10,14,26,0.5)',
        }}>
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', flexShrink: 0 }}
          />
          <span style={{ fontSize: 10, color: '#4b5563', fontFamily: 'monospace' }}>
            System Online · 4 agents active · Neo4j connected · Kafka streaming
          </span>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Trusted by — Section 2 ──────────────────────── */

const LogoRetool = () => (
  <svg viewBox="0 0 180 56" fill="currentColor" style={{ width: 120, height: 38, display: 'block' }}>
    <path d="M34 18.2a2.2 2.2 0 012.2-2.2h8.6a2.2 2.2 0 012.2 2.2v1.7a1.1 1.1 0 01-1.1 1.1H35.1a1.1 1.1 0 01-1.1-1.1v-1.7zM34 25.1a1.1 1.1 0 011.1-1.1h20.7a2.2 2.2 0 012.2 2.2v5.7a1.1 1.1 0 01-1.1 1.1H36.2a2.2 2.2 0 01-2.2-2.2v-5.7zM45 37.1a1.1 1.1 0 011.1-1.1h10.8a1.1 1.1 0 011.1 1.1v.7a2.2 2.2 0 01-2.2 2.2h-8.6a2.2 2.2 0 01-2.2-2.2v-.7zM71.596 30.741h2.311l4.293 7.017h5.256l-4.76-7.512c2.641-.909 4.182-2.945 4.182-5.89 0-4.127-2.89-6.356-7.54-6.356H67v19.758h4.596v-7.017zm0-3.742V21.88h3.494c2.174 0 3.275.936 3.275 2.56 0 1.595-1.1 2.558-3.275 2.558h-3.494zM91.363 38.06c2.89 0 5.531-1.458 6.605-4.237L94.28 32.64c-.413 1.266-1.486 1.926-2.862 1.926-1.678 0-2.862-1.128-3.164-3.11h9.824v-1.155c0-4.1-2.395-7.348-6.797-7.348-4.183 0-7.265 3.247-7.265 7.54 0 4.513 2.972 7.568 7.347 7.568zm-.138-11.694c1.624 0 2.477 1.1 2.505 2.394H88.39c.44-1.596 1.486-2.394 2.834-2.394zM100.573 33.878c0 2.972 1.569 4.018 4.706 4.018 1.046 0 1.871-.083 2.642-.193v-3.605c-.496.055-.743.083-1.266.083-1.101 0-1.734-.22-1.734-1.431v-5.862h2.834v-3.632h-2.834v-4.018h-4.348v4.018h-1.844v3.632h1.844v6.99zM123.672 30.52c0-4.512-3-7.567-7.265-7.567-4.293 0-7.265 3.055-7.265 7.568s2.972 7.54 7.265 7.54c4.265 0 7.265-3.027 7.265-7.54zm-10.154 0c0-2.53 1.128-3.962 2.889-3.962s2.89 1.431 2.89 3.963-1.129 3.962-2.89 3.962c-1.761 0-2.889-1.43-2.889-3.962zM139.527 30.52c0-4.512-2.999-7.567-7.265-7.567-4.293 0-7.265 3.055-7.265 7.568s2.972 7.54 7.265 7.54c4.266 0 7.265-3.027 7.265-7.54zm-10.154 0c0-2.53 1.128-3.962 2.889-3.962 1.762 0 2.89 1.431 2.89 3.963s-1.128 3.962-2.89 3.962c-1.761 0-2.889-1.43-2.889-3.962zM146 18h-4.403v19.758H146V18z" />
  </svg>
);

const LogoVercel = () => (
  <svg viewBox="0 0 180 54" fill="currentColor" style={{ width: 120, height: 38, display: 'block' }}>
    <path d="M89.515 20.5c-4.424 0-7.614 2.925-7.614 7.313 0 4.387 3.59 7.312 8.014 7.312 2.673 0 5.03-1.072 6.488-2.88l-3.066-1.796c-.81.898-2.04 1.422-3.422 1.422-1.919 0-3.55-1.016-4.155-2.64h11.228c.088-.456.14-.927.14-1.423 0-4.383-3.19-7.308-7.613-7.308zm-3.791 5.89c.5-1.62 1.871-2.64 3.787-2.64 1.919 0 3.29 1.02 3.786 2.64h-7.573zm46.938-5.89c-4.424 0-7.613 2.925-7.613 7.313 0 4.387 3.59 7.312 8.014 7.312 2.672 0 5.028-1.072 6.487-2.88l-3.065-1.796c-.81.898-2.04 1.422-3.422 1.422-1.92 0-3.551-1.016-4.156-2.64h11.228c.088-.456.14-.927.14-1.423 0-4.383-3.189-7.308-7.613-7.308zm-3.787 5.89c.501-1.62 1.872-2.64 3.787-2.64 1.919 0 3.29 1.02 3.787 2.64h-7.574zm-15.639 1.422c0 2.438 1.571 4.063 4.007 4.063 1.651 0 2.889-.76 3.526-1.999l3.078 1.8c-1.275 2.153-3.663 3.449-6.604 3.449-4.428 0-7.613-2.925-7.613-7.313 0-4.387 3.189-7.312 7.613-7.312 2.941 0 5.325 1.296 6.604 3.45l-3.078 1.799c-.637-1.24-1.875-1.999-3.526-1.999-2.432 0-4.007 1.625-4.007 4.063zm33.05-11.78v18.687h-3.607V16.03h3.607zM47.806 14l14.806 26H33l14.806-26zm37.016 2.031l-11.103 19.5-11.103-19.5h4.163l6.94 12.188 6.94-12.188h4.163zm23.606 4.875v3.937a4.517 4.517 0 00-1.283-.2c-2.328 0-4.007 1.626-4.007 4.063v6.013h-3.606V20.906h3.606v3.738c0-2.064 2.369-3.738 5.29-3.738z" />
  </svg>
);

const LogoRemote = () => (
  <svg viewBox="0 0 180 56" fill="currentColor" style={{ width: 130, height: 38, display: 'block' }}>
    <path d="M51.1294 35.0449H51.4609V41H50.4859C44.1484 41 40.4825 37.3997 40.4825 31.503V28.4671L42.5495 27.9416C43.1539 27.7859 43.6999 27.4746 44.1289 27.0269C44.5579 26.5793 44.8504 26.015 44.9869 25.4117C45.1234 24.8084 45.0649 24.1662 44.8504 23.5823C44.6359 22.9985 44.2654 22.4925 43.7779 22.1033C43.2905 21.7141 42.7055 21.4805 42.0815 21.4222C41.4575 21.3638 40.8335 21.4611 40.2875 21.7335C39.722 22.006 39.254 22.4341 38.9225 22.9596C38.591 23.485 38.4155 24.0883 38.4155 24.7111V37.6916H32V24.497C32 24.1078 32.0195 23.6991 32.078 23.3099C32.6825 18.6198 36.7775 15 41.7305 15C46.2349 15 50.0179 17.9775 51.1294 22.0254C51.7144 24.1467 51.5194 26.4042 50.6029 28.4087C49.8229 30.1018 48.5554 31.5225 46.9759 32.4955C47.5219 34.6557 48.6334 35.0449 51.1294 35.0449ZM67.0023 23.6018V27.241H66.3978C65.1498 27.241 64.1749 27.5913 63.4729 28.2725C62.7709 28.9536 62.4199 29.8877 62.4199 31.0749V37.6332H58.8904V23.8159H62.4199V25.6063C63.4729 24.2635 64.7989 23.6018 66.3978 23.6018H67.0023ZM82.1538 32.009H71.4483C71.6628 32.8458 72.1698 33.5853 72.8718 34.0913C73.6128 34.6168 74.5098 34.8892 75.4068 34.8503C76.1673 34.8503 76.9278 34.6946 77.6103 34.3638C78.2343 34.0913 78.7803 33.6632 79.1898 33.1377L81.5493 35.2006C80.8083 36.0763 79.8723 36.7769 78.8193 37.244C77.7078 37.7305 76.4988 37.9835 75.2703 37.9641C73.9053 37.9835 72.5403 37.6527 71.3313 37.0105C70.1808 36.4072 69.2448 35.4925 68.5818 34.3832C67.9383 33.2545 67.5873 31.9895 67.5873 30.7051C67.5873 29.4207 67.9188 28.1362 68.5428 27.0075C69.1668 25.9177 70.0833 25.0225 71.1948 24.4192C72.3453 23.7964 73.6323 23.4656 74.9388 23.485C77.0058 23.485 78.7413 24.1662 80.1258 25.5479C81.5103 26.9296 82.2123 28.6617 82.2123 30.744C82.2513 31.1722 82.2123 31.5808 82.1538 32.009ZM77.1813 27.3578C76.5378 26.8518 75.7578 26.5793 74.9388 26.5793C74.1198 26.5793 73.3398 26.8518 72.6963 27.3578C72.0528 27.8832 71.6043 28.6228 71.4093 29.4207H78.4683C78.2928 28.6033 77.8248 27.8832 77.1813 27.3578ZM104.852 24.9057C105.788 25.8398 106.275 27.0853 106.275 28.6617V37.6527H102.746V29.7126C102.746 28.8563 102.492 28.1946 102.005 27.6886C101.517 27.1826 100.854 26.9296 100.035 26.9296C99.1772 26.9296 98.4752 27.1826 97.9292 27.7081C97.3832 28.2335 97.1297 28.9147 97.1297 29.771V37.6527H93.6002V29.7126C93.6002 28.8757 93.3467 28.1946 92.8592 27.6886C92.3522 27.1826 91.6892 26.9296 90.8702 26.9296C90.4802 26.9102 90.1097 26.9686 89.7392 27.1048C89.3882 27.241 89.0567 27.4551 88.7642 27.7081C88.4912 27.9805 88.2767 28.2919 88.1402 28.6617C88.0037 29.012 87.9452 29.4012 87.9452 29.771V37.6527H84.4158V23.8353H87.9647V25.256C88.9982 24.0883 90.3632 23.5045 92.0597 23.5045C92.9567 23.485 93.8342 23.6796 94.6337 24.0883C95.3747 24.4775 95.9792 25.0419 96.4082 25.7425C97.5587 24.244 99.1187 23.485 101.108 23.485C102.668 23.5045 103.916 23.9716 104.852 24.9057ZM123.143 30.7246C123.143 32.7874 122.441 34.5 121.017 35.8817C119.594 37.2635 117.839 37.9641 115.713 37.9446C113.607 37.9446 111.833 37.244 110.409 35.8623C108.986 34.4805 108.264 32.768 108.264 30.7051C108.264 28.6422 108.986 26.9296 110.409 25.5479C111.833 24.1662 113.607 23.4656 115.713 23.4656C117.819 23.4656 119.594 24.1662 121.017 25.5479C122.441 26.9491 123.162 28.6811 123.143 30.7246ZM118.443 33.4686C119.126 32.729 119.516 31.756 119.516 30.744C119.516 29.732 119.126 28.759 118.443 28.0195C118.092 27.6692 117.663 27.3772 117.195 27.1826C116.727 26.988 116.24 26.8907 115.733 26.8907C115.226 26.8907 114.738 26.988 114.27 27.1826C113.802 27.3772 113.373 27.6497 113.022 28.0195C112.32 28.759 111.93 29.732 111.93 30.744C111.93 31.756 112.32 32.729 113.022 33.4686C113.744 34.1692 114.719 34.5584 115.733 34.5584C116.747 34.5389 117.722 34.1497 118.443 33.4686ZM129.597 27.0464V32.7874C129.597 33.9746 130.241 34.5584 131.508 34.5584C132.132 34.5389 132.756 34.3832 133.322 34.0913V37.3802C132.522 37.7889 131.645 38.003 130.748 37.9835C129.207 37.9835 128.037 37.5749 127.257 36.7575C126.477 35.9401 126.087 34.8114 126.087 33.3713V27.0659H123.884V23.8548H126.087V21.5584L129.617 20.3518V23.8548H133.341V27.0659H129.597V27.0464ZM148.921 32.009H138.216C138.431 32.8458 138.938 33.5853 139.64 34.0913C140.381 34.6168 141.278 34.8892 142.175 34.8503C142.935 34.8503 143.695 34.6946 144.378 34.3638C145.002 34.0913 145.548 33.6632 145.977 33.1377L148.336 35.2006C147.595 36.0763 146.659 36.7769 145.606 37.244C144.495 37.7305 143.286 37.9835 142.058 37.9641C140.693 37.9835 139.328 37.6527 138.119 37.0105C136.968 36.4072 136.032 35.4925 135.369 34.3832C134.726 33.2545 134.375 31.9895 134.375 30.7051C134.375 29.4207 134.706 28.1362 135.33 27.0075C135.954 25.9177 136.871 25.0225 137.982 24.4192C139.133 23.7964 140.42 23.4656 141.726 23.485C143.793 23.485 145.528 24.1662 146.913 25.5479C148.297 26.9296 148.999 28.6617 148.999 30.744C148.999 31.1722 148.98 31.6003 148.921 32.009ZM143.949 27.3578C143.305 26.8518 142.526 26.5793 141.707 26.5793C140.888 26.5793 140.108 26.8518 139.464 27.3578C138.821 27.8832 138.372 28.6228 138.177 29.4207H145.236C145.06 28.6033 144.592 27.8832 143.949 27.3578Z" />
  </svg>
);

const LogoArc = () => (
  <svg viewBox="0 0 180 56" fill="currentColor" style={{ width: 100, height: 38, display: 'block' }}>
    <path d="M133.969 31.642a.918.918 0 00-.673.287c-.909.938-2.098 1.51-3.483 1.51a4.803 4.803 0 01-2.232-.546c-1.814-.947-2.987-3.015-2.661-5.319.356-2.529 2.567-4.411 5.045-4.338 1.322.04 2.457.604 3.334 1.509a.914.914 0 00.672.286c.554 0 1.029-.49 1.029-1.02 0-.247-.078-.53-.278-.735a6.742 6.742 0 00-4.277-2.055c-3.913-.348-7.435 2.84-7.557 6.886-.122 4.066 3.01 7.374 6.925 7.374 1.94 0 3.642-.777 4.909-2.081.198-.204.278-.49.278-.734-.002-.533-.478-1.023-1.031-1.023zM116.535 29.095c1.283-.735 2.135-2.1 2.094-3.77-.055-2.325-1.995-4.135-4.25-4.135h-6.239c-.546 0-.989.457-.989 1.02v11.883c0 .519.358.995.856 1.052.616.07 1.123-.356 1.123-.974V31.58c0-.2.131-.372.317-.42l3.506-.895 1.447-.38a.415.415 0 01.484.238l1.959 4.44c.16.365.507.58.872.58a.96.96 0 00.632-.244c.33-.288.399-.788.22-1.193l-2.032-4.61zm-7.405-.42v-5.093c0-.24.188-.431.418-.431h4.767c1.384 0 2.335.98 2.335 2.288 0 1.307-.779 2.251-2.37 2.602l-4.643 1.056a.421.421 0 01-.507-.422zM96.89 21.967c-.21-.455-.655-.727-1.192-.727-.537 0-.983.272-1.192.725l-5.462 11.742c-.071.145-.11.325-.11.488 0 .557.422.976.985.976a.944.944 0 00.895-.57l1.017-2.172a8.97 8.97 0 001.403.386c.792.151 1.59.203 2.377.194.79-.007 1.568-.104 2.335-.235.383-.066.76-.163 1.141-.243l.466-.133 1.024 2.188a.956.956 0 00.903.587c.638 0 .982-.502.982-.975 0-.166-.041-.344-.105-.481l-5.467-11.75zm.757 9.04c-.686.117-1.38.205-2.066.21-.687.006-1.37-.036-2.03-.164a7.106 7.106 0 01-.962-.251l.82-1.755h-.003l1.913-4.085a.413.413 0 01.753 0l1.761 3.76.088.188.064.137.797 1.707-.11.031c-.34.074-.68.164-1.025.223zM77.035 23.307c.212-1.058.044-2.13-.468-3.019-.592-1.023-1.538-1.714-2.668-1.946a3.901 3.901 0 00-.808-.08c-1.92 0-3.536 1.387-3.931 3.371a9.394 9.394 0 01-1.183 3.015.11.11 0 01-.1.054.113.113 0 01-.1-.069l-3.765-8.17c-.521-1.129-1.449-1.967-2.546-2.298-1.876-.569-3.922.376-4.762 2.197l-3.897 8.449a.048.048 0 01-.043.028c-.028 0-.033-.016-.037-.028-.618-1.575-2.08-2.593-3.729-2.593-.533 0-1.054.109-1.55.322-.992.426-1.756 1.24-2.158 2.292a4.375 4.375 0 00.032 3.214c.737 1.818 1.97 3.573 3.566 5.074.039.036.05.09.027.138l-1.258 2.732c-.95 2.063-.151 4.556 1.78 5.56a3.9 3.9 0 001.813.448c1.543 0 2.97-.929 3.633-2.366l1.086-2.356a.112.112 0 01.135-.062 14.83 14.83 0 004.025.578c1.458 0 2.942-.223 4.404-.66a.111.111 0 01.136.061l1.074 2.333c.69 1.494 2.124 2.464 3.66 2.474h.023a3.87 3.87 0 001.812-.447c1.93-1.005 2.728-3.505 1.772-5.575l-1.357-2.934a.12.12 0 01.028-.137c2.742-2.617 4.643-6.026 5.354-9.6zM54.201 36.69l-.98 2.126a2.19 2.19 0 01-1.975 1.286c-.338 0-.664-.078-.97-.234-1.06-.543-1.492-1.916-.964-3.065l1.045-2.268a.122.122 0 01.108-.071c.018 0 .041.005.062.021a17.81 17.81 0 003.61 2.044c.04.016.06.05.066.068a.107.107 0 01-.002.093zm9.565-1.345a.108.108 0 01-.07.061c-1.19.325-2.391.49-3.571.49-5.465 0-11.24-3.817-13.15-8.688-.45-1.15.09-2.465 1.206-2.931.261-.11.537-.166.817-.166.896 0 1.69.552 2.025 1.409 1.247 3.183 5.417 5.873 9.102 5.873.555 0 1.125-.055 1.694-.164.053-.01.106.014.127.064l1.82 3.947a.136.136 0 010 .105zm-4.468-6.183l.733-1.591a.273.273 0 01.252-.164.28.28 0 01.253.164l.716 1.553a.29.29 0 01-.007.26.27.27 0 01-.204.147 6.112 6.112 0 01-1.518.04.276.276 0 01-.213-.144.292.292 0 01-.012-.265zm11.09 10.706a2.108 2.108 0 01-.969.234 2.188 2.188 0 01-1.972-1.286l-6.578-14.27a.584.584 0 00-1.07 0l-2.04 4.426a.115.115 0 01-.137.064c-1.361-.483-2.638-1.295-3.596-2.282a.117.117 0 01-.018-.13l4.408-9.562c.148-.32.359-.578.609-.746.592-.4 1.265-.519 1.899-.337a2.199 2.199 0 011.382 1.201l9.047 19.626c.53 1.146.096 2.52-.965 3.062zm.526-8.807a.123.123 0 01-.106.036.11.11 0 01-.082-.067l-1.929-4.186a.12.12 0 01.014-.123c1.09-1.443 1.837-3.086 2.16-4.755.205-1.05 1.103-1.812 2.138-1.812h.002c.177 0 .356.024.533.069 1.144.293 1.84 1.506 1.584 2.76-.613 3.001-2.103 5.793-4.314 8.078z" />
  </svg>
);

const LogoRaycast = () => (
  <svg viewBox="0 0 180 56" fill="currentColor" style={{ width: 120, height: 38, display: 'block' }}>
    <path fillRule="evenodd" clipRule="evenodd" d="M34.292 33.307v3.443L26 28.5l1.731-1.723 6.56 6.53zm3.46 3.443h-3.46L42.583 45l1.732-1.723-6.563-6.527zm19.68-6.527l1.73-1.723L42.58 12l-1.727 1.727 6.56 6.527h-3.964l-4.58-4.547-1.73 1.723 2.847 2.833h-1.99V33.07h12.871v-1.98l2.848 2.834 1.732-1.723-4.58-4.556V23.7l6.565 6.523zM35.155 19.396L33.42 21.12l1.858 1.848 1.731-1.723-1.853-1.848zm14.726 14.652l-1.73 1.723 1.856 1.848 1.732-1.723-1.858-1.848zM31.442 23.09l-1.732 1.723 4.58 4.556v-3.445l-2.848-2.834zm13.735 13.667h-3.46l4.579 4.556 1.731-1.723-2.85-2.833z" />
    <path d="M151.74 36.73c-1.116 0-1.99-.301-2.613-.906-.624-.605-.936-1.446-.936-2.51v-6.6h-2.003v-2.471h2.014l.359-3.3h2.359v3.3H154v2.475h-3.08v6.237a1.3 1.3 0 00.356.92 1.22 1.22 0 00.94.38H154v2.475h-2.26z" />
  </svg>
);

const SLIDER_LOGOS = [
  { id: 'retool',   El: LogoRetool  },
  { id: 'vercel',   El: LogoVercel  },
  { id: 'remote',   El: LogoRemote  },
  { id: 'arc',      El: LogoArc     },
  { id: 'raycast',  El: LogoRaycast },
];

function TrustedBySection() {
  return (
    <section style={{ background: '#0a0e1a', overflow: 'hidden', paddingTop: 80 }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 56, padding: '0 24px' }}>
        <p style={{ fontSize: 28, fontWeight: 600, color: '#f9fafb', lineHeight: 1.3, margin: 0 }}>
          <span style={{ color: '#4338ca' }}>Trusted by experts.</span>
          <br />
          <span style={{ color: '#9ca3af' }}>Used by the leaders.</span>
        </p>
      </div>

      {/* Logo slider — moves left to right */}
      <div style={{ position: 'relative' }}>
        <ProgressiveBlur width={160} />
        <InfiniteSlider duration={40} gap={56} durationOnHover={90} direction="right">
          {SLIDER_LOGOS.map(({ id, El }) => (
            <div
              key={id}
              style={{
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#6b7280'}
              onMouseLeave={e => e.currentTarget.style.color = '#374151'}
            >
              <El />
            </div>
          ))}
        </InfiniteSlider>
      </div>

      {/* Sparkles + curved horizon — matches the demo's bottom decoration */}
      <div style={{
        position: 'relative',
        marginTop: -32,
        height: 320,
        overflow: 'hidden',
        maskImage: 'radial-gradient(50% 50%, white, transparent)',
        WebkitMaskImage: 'radial-gradient(50% 50%, white, transparent)',
      }}>
        {/* Purple radial glow behind the curve */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at bottom center, rgba(131,80,232,0.35) 0%, transparent 70%)',
        }} />

        {/* Large oval horizon — same trick as the demo */}
        <div style={{
          position: 'absolute',
          left: '-50%',
          top: '50%',
          width: '200%',
          aspectRatio: '1 / 0.7',
          zIndex: 10,
          borderRadius: '100%',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          background: '#0a0e1a',
        }} />

        {/* Sparkles fill the area below the curve */}
        <Sparkles
          id="trusted-sparkles"
          density={1200}
          color="#8350e8"
          opacity={0.6}
          speed={0.8}
        />
      </div>

    </section>
  );
}

/* ── Main LandingPage ─────────────────────────────── */

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <Navbar />

      {/* ── Hero ── */}
      <section
        className="hero"
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: '#0a0e1a',
          maxWidth: 'none',
          width: '100%',
          margin: 0,
        }}
      >
        {/* Animated background paths — two mirrored layers for depth */}
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />

        {/* Subtle dark navy centre vignette — makes text readable without a colored ring */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 60% 40% at 50% 60%, rgba(17,24,39,0.5) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 1,
        }} />

        {/* Hero content — centered column, sits above path layers */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: '800px',
          margin: '0 auto',
          padding: '0 24px',
        }}>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="hero-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              Real-time threat detection · Under 10 seconds
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95, duration: 0.5 }}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              marginTop: 32,
              flexWrap: 'nowrap',
            }}
          >
            <motion.button
              onClick={() => navigate('/signup')}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '13px 26px',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                whiteSpace: 'nowrap',
                transition: 'background 0.2s',
              }}
              whileHover={{ scale: 1.03, boxShadow: '0 8px 30px rgba(59,130,246,0.4)', backgroundColor: '#2563eb' }}
              whileTap={{ scale: 0.97 }}
            >
              Start protecting now →
            </motion.button>

            <motion.button
              onClick={() => navigate('/login')}
              style={{
                background: 'transparent',
                color: '#9ca3af',
                border: '1px solid #1f2937',
                padding: '13px 26px',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
              whileHover={{ scale: 1.03, borderColor: '#3b82f6', color: 'white', backgroundColor: 'rgba(59,130,246,0.08)' }}
              whileTap={{ scale: 0.97 }}
            >
              Watch the live demo
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.7 }}
            style={{ width: '100%' }}
          >
            <DashboardPreview />
          </motion.div>

        </div>
      </section>

      {/* ── Trusted by ── */}
      <TrustedBySection />

      {/* ── Sections 3–6 ── */}
      <TheProblem />
      <HowItWorks />
      <LiveNumbers />
      <FinalCTA />

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
                <button className="footer-link">MITRE ATT&amp;CK</button>
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

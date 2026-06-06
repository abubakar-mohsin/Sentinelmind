import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function LoginPage() {
  const navigate  = useNavigate();
  const [email,   setEmail]   = useState('');
  const [pass,    setPass]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!email || !pass) { setError('Please fill in all fields.'); return; }
    setError('');
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem('sm_authed', 'true');
      localStorage.setItem('sm_user', JSON.stringify({ email, name: email.split('@')[0] }));
      navigate('/dashboard');
    }, 900);
  }

  function handleDemo() {
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem('sm_authed', 'true');
      localStorage.setItem('sm_user', JSON.stringify({ email: 'demo@sentinelmind.io', name: 'Demo User' }));
      navigate('/dashboard');
    }, 600);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-logo">
          <div className="auth-logo-icon">
            <ShieldIcon size={20} color="white" />
          </div>
          <span className="auth-logo-text">SentinelMind</span>
        </div>

        <div className="auth-box">
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-sub">Sign in to your security dashboard</p>

          {/* Social / demo buttons */}
          <div className="auth-social">
            <button className="social-btn" onClick={handleDemo} disabled={loading}>
              <BoltIcon size={16} />
              Continue with Demo Account
            </button>
          </div>

          <div className="divider-text" style={{ marginBottom: 20, fontSize: 12 }}>or continue with email</div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Email address</label>
              <input
                className="input"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="label" style={{ margin: 0 }}>Password</label>
                <span style={{ fontSize: 12, color: '#6366F1', cursor: 'pointer', fontWeight: 500 }}>
                  Forgot password?
                </span>
              </div>
              <input
                className="input"
                type="password"
                placeholder="Your password"
                value={pass}
                onChange={e => setPass(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
                color: '#EF4444',
              }}>
                {error}
              </div>
            )}

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%', marginTop: 4, justifyContent: 'center' }}
            >
              {loading ? <SpinnerIcon /> : null}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="auth-footer-text">
          Don't have an account?{' '}
          <Link to="/signup">Create one free</Link>
        </p>

      </div>
    </div>
  );
}

/* ── Inline icons ── */

function ShieldIcon({ size = 24, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}

function BoltIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'spin 0.8s linear infinite' }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}

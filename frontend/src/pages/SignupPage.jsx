import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function SignupPage() {
  const navigate  = useNavigate();
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [pass,    setPass]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!name || !email || !pass) { setError('Please fill in all fields.'); return; }
    if (pass.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setError('');
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem('sm_authed', 'true');
      localStorage.setItem('sm_user', JSON.stringify({ email, name }));
      navigate('/dashboard');
    }, 1000);
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
          <h1 className="auth-title">Create an account</h1>
          <p className="auth-sub">Start protecting your infrastructure today</p>

          <form className="auth-form" onSubmit={handleSubmit} style={{ marginTop: 24 }}>
            <div className="form-group">
              <label className="label">Full name</label>
              <input
                className="input"
                type="text"
                placeholder="John Smith"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div className="form-group">
              <label className="label">Work email</label>
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
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="Min. 6 characters"
                value={pass}
                onChange={e => setPass(e.target.value)}
                autoComplete="new-password"
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
              {loading ? 'Creating account…' : 'Create account'}
            </button>

            <p style={{ fontSize: 12, color: '#52525B', textAlign: 'center', lineHeight: 1.5 }}>
              By creating an account you agree to our{' '}
              <span style={{ color: '#6366F1', cursor: 'pointer' }}>Terms of Service</span>
              {' '}and{' '}
              <span style={{ color: '#6366F1', cursor: 'pointer' }}>Privacy Policy</span>
            </p>
          </form>
        </div>

        <p className="auth-footer-text">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>

      </div>
    </div>
  );
}

function ShieldIcon({ size = 24, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
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

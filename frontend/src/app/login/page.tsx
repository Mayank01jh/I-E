'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If token exists, direct to dashboard
    if (localStorage.getItem('token')) {
      window.location.href = '/';
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.login({ username, password });
      localStorage.setItem('token', res.access_token);
      localStorage.setItem('username', res.username);
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'radial-gradient(circle at top right, rgba(255, 255, 255, 0.05) 0%, #000000 80%)',
      padding: '20px'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', boxShadow: '0 0 40px rgba(255, 255, 255, 0.03), var(--shadow-card)' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            fontSize: '32px',
            background: 'var(--gradient-main)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 800,
            marginBottom: '8px'
          }}>
            I & E
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back! Sign in to continue</p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid var(--accent-red)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            color: 'var(--accent-red)',
            fontSize: '13px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>Username</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              disabled={loading}
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
              style={{ width: '100%' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {loading ? 'Signing In…' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link href="/register" style={{ color: '#ffffff', fontWeight: 600, textDecoration: 'none' }}>
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}

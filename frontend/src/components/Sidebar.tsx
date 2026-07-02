'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/',              icon: '📊', label: 'Dashboard' },
  { href: '/transactions',  icon: '💳', label: 'Transactions' },
  { href: '/analytics',     icon: '📈', label: 'Analytics' },
  { href: '/budget',        icon: '💰', label: 'Budget' },
  { href: '/debts',         icon: '🤝', label: 'Peer Ledger' },
  { href: '/categories',    icon: '🏷️', label: 'Categories' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [username, setUsername] = useState('User');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const stored = localStorage.getItem('username');
    if (stored) {
      setUsername(stored);
    }
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/login';
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="sidebar-logo-icon">☯</div>
          <span className="sidebar-logo-text">I & E</span>
        </div>
        <button
          onClick={toggleTheme}
          className="btn btn-ghost btn-icon btn-sm"
          title="Toggle light/dark theme"
          style={{ padding: 6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
      <nav className="sidebar-nav">
        {NAV.map(n => (
          <Link
            key={n.href}
            href={n.href}
            className={`sidebar-link${pathname === n.href ? ' active' : ''}`}
          >
            <span className="icon">{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>
      <div style={{ padding: '12px', borderTop: '1px solid var(--border)', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32,
            borderRadius: '50%',
            background: 'var(--text-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 14, color: 'var(--bg-primary)',
            transition: 'all 0.3s ease'
          }}>
            {username[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <span style={{ fontWeight: 600, fontSize: 13, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{username}</span>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Free Account</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="btn btn-ghost"
          style={{
            width: '100%',
            padding: '6px 10px',
            fontSize: '12px',
            justifyContent: 'center',
            color: 'var(--text-primary)',
            borderColor: 'var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          🚪 Log Out
        </button>
      </div>
    </aside>
  );
}

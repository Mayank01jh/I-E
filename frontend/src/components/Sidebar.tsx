'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/',              icon: '📊', label: 'Dashboard', shortLabel: 'Home' },
  { href: '/transactions',  icon: '💳', label: 'Transactions', shortLabel: 'Txns' },
  { href: '/analytics',     icon: '📈', label: 'Analytics', shortLabel: 'Trends' },
  { href: '/budget',        icon: '💰', label: 'Budget', shortLabel: 'Budget' },
  { href: '/debts',         icon: '🤝', label: 'Peer Ledger', shortLabel: 'Debts' },
  { href: '/categories',    icon: '🏷️', label: 'Categories', shortLabel: 'Tags' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [username, setUsername] = useState('User');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [fixedRatio, setFixedRatio] = useState(false);
  const [isDesktopScreen, setIsDesktopScreen] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Get username
    const stored = localStorage.getItem('username');
    if (stored) {
      setUsername(stored);
    }
    
    // 2. Get theme
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // 3. Get fixed ratio setting
    const savedFixedRatio = localStorage.getItem('fixed_ratio') === 'true';
    setFixedRatio(savedFixedRatio);
    if (savedFixedRatio) {
      document.documentElement.setAttribute('data-fixed-ratio', 'true');
    } else {
      document.documentElement.removeAttribute('data-fixed-ratio');
    }

    // 4. Detect screen size
    setIsDesktopScreen(window.innerWidth >= 768);
    const handleResize = () => {
      setIsDesktopScreen(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);

    // 5. Close popover on click outside
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
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

  const toggleFixedRatio = () => {
    const next = !fixedRatio;
    setFixedRatio(next);
    localStorage.setItem('fixed_ratio', String(next));
    if (next) {
      document.documentElement.setAttribute('data-fixed-ratio', 'true');
    } else {
      document.documentElement.removeAttribute('data-fixed-ratio');
    }
  };

  // Find page title based on pathname
  const activeNavItem = NAV.find(item => item.href === pathname);
  const pageTitle = activeNavItem ? activeNavItem.label : 'I & E';

  return (
    <>
      {/* ── DESKTOP SIDEBAR (Visible only when not in phone simulator on desktop screens) ── */}
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
          {/* Simulator View switch (only shown on desktop screen width) */}
          {isDesktopScreen && (
            <button
              onClick={toggleFixedRatio}
              className="btn btn-ghost"
              style={{
                width: '100%',
                padding: '8px 10px',
                fontSize: '12px',
                justifyContent: 'center',
                borderColor: 'var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              📱 {fixedRatio ? 'Full Desktop View' : 'Simulate Phone'}
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
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

      {/* ── MOBILE HEADER (Visible on screen < 768px or in simulator mode) ── */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="sidebar-logo-icon" style={{ width: 28, height: 28, fontSize: 14, borderRadius: 'var(--radius-sm)' }}>☯</div>
          <span className="sidebar-logo-text" style={{ fontSize: 16 }}>{pageTitle}</span>
        </div>

        <div style={{ position: 'relative' }} ref={popoverRef}>
          <button
            onClick={() => setShowPopover(!showPopover)}
            className="btn btn-ghost btn-icon btn-sm"
            style={{ width: 36, height: 36, borderRadius: '50%', padding: 0 }}
          >
            ⚙️
          </button>

          {showPopover && (
            <div className="settings-popover">
              <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                👤 {username}
              </div>
              <button onClick={toggleTheme} className="settings-popover-item">
                <span>Theme</span>
                <span>{theme === 'dark' ? '🌙 Dark' : '☀️ Light'}</span>
              </button>
              
              {isDesktopScreen && (
                <button onClick={toggleFixedRatio} className="settings-popover-item">
                  <span>Aspect Ratio</span>
                  <span style={{ color: fixedRatio ? 'var(--accent-purple)' : 'var(--text-secondary)' }}>
                    {fixedRatio ? '📱 Phone' : '🖥️ Desktop'}
                  </span>
                </button>
              )}

              <div className="settings-popover-divider" />
              
              <button onClick={handleLogout} className="settings-popover-item" style={{ color: 'var(--accent-red)' }}>
                <span>Log Out</span>
                <span>🚪</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── MOBILE BOTTOM NAVIGATION (Visible on screen < 768px or in simulator mode) ── */}
      <nav className="bottom-nav">
        {NAV.map(n => (
          <Link
            key={n.href}
            href={n.href}
            className={`bottom-nav-item${pathname === n.href ? ' active' : ''}`}
          >
            <span className="icon">{n.icon}</span>
            <span>{n.shortLabel}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

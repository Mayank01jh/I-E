'use client';
import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';

const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DEFAULT_CATS = ['Rent/mortgage','Electricity','Shoes','Cafeteria','Groceries','Tour','Auto expenses','Books & prints','Spotify','Sip','Personal care','Entertainment','Miscellaneous'];
const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export default function BudgetPage() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [budget, setBudget] = useState<{ baseline: number; categories: Record<string, number> } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, number>>({});
  const [baseline, setBaseline] = useState(0);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
    } else {
      setAuthorized(true);
    }
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    try {
      const data = await api.getBudget(year, month);
      setBudget(data);
      setBaseline(data.baseline ?? 0);
      setEditValues(data.categories ?? {});
    } catch {}
  }, [year, month]);

  useEffect(() => {
    if (authorized) {
      load();
    }
  }, [load, authorized]);

  if (!authorized) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>Loading...</div>;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.updateBudget(year, month, { baseline, categories: editValues });
      setBudget(updated);
      setEditing(false);
      showToast('Budget saved!');
    } catch { showToast('Failed to save'); }
    setSaving(false);
  };

  const totalBudgeted = Object.values(editValues).reduce((s, v) => s + (v || 0), 0);
  const remaining = baseline - totalBudgeted;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Budget Planner</h1>
            <p>Set category limits for {MONTHS_FULL[month-1]} {year}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <select className="form-select" value={month} onChange={e => setMonth(parseInt(e.target.value))} style={{ width: 140 }}>
              {MONTHS_FULL.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
            </select>
            <select className="form-select" value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ width: 90 }}>
              {[2026,2027,2028,2029].map(y => <option key={y}>{y}</option>)}
            </select>
            {!editing
              ? <button className="btn btn-primary" onClick={() => setEditing(true)}>✏️ Edit Budget</button>
              : <>
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? '...' : '✓ Save'}</button>
                  <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                </>
            }
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Monthly Income', value: fmt(baseline), color: 'var(--text-primary)' },
            { label: 'Total Budgeted', value: fmt(totalBudgeted), color: 'var(--text-secondary)' },
            { label: 'Unallocated',    value: fmt(Math.max(0, remaining)), color: remaining < 0 ? '#ffffff' : 'var(--text-primary)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center' }}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.color, marginTop: 8 }}>{s.value}</div>
              {remaining < 0 && s.label === 'Unallocated' && (
                <div style={{ color: 'var(--accent-red)', fontSize: 11, marginTop: 4 }}>⚠ Over-budgeted by {fmt(Math.abs(remaining))}</div>
              )}
            </div>
          ))}
        </div>

        {/* Baseline editor */}
        {editing && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label">Monthly Income / Baseline (₹)</label>
              <input type="number" className="form-input" value={baseline} onChange={e => setBaseline(parseFloat(e.target.value))} style={{ fontSize: 20, fontWeight: 700, maxWidth: 200 }} />
            </div>
          </div>
        )}

        {/* Category budgets */}
        <div className="card">
          <div className="chart-title" style={{ marginBottom: 20 }}>Category Limits</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {DEFAULT_CATS.map(cat => {
              const val = editValues[cat] || 0;
              const pct = baseline > 0 ? (val / baseline) * 100 : 0;
              return (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 140, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', flexShrink: 0 }}>{cat}</div>
                  {editing ? (
                    <input
                      type="number" min="0" step="100"
                      className="form-input"
                      style={{ width: 110, flexShrink: 0 }}
                      value={val}
                      onChange={e => setEditValues(prev => ({ ...prev, [cat]: parseFloat(e.target.value) || 0 }))}
                    />
                  ) : (
                    <div style={{ width: 110, fontWeight: 600, flexShrink: 0 }}>{fmt(val)}</div>
                  )}
                  <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: '#ffffff', borderRadius: 3, transition: 'width 0.4s ease' }} />
                  </div>
                  <div style={{ width: 40, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>{pct.toFixed(0)}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {toast && (
        <div className="toast-container">
          <div className="toast success">✅ {toast}</div>
        </div>
      )}
    </div>
  );
}

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
  const [spentMap, setSpentMap] = useState<Record<string, number>>({});
  const [baseline, setBaseline] = useState(0);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);

  // Savings goals states
  const [goals, setGoals] = useState<any[]>([]);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const [goalTitle, setGoalTitle] = useState('');
  const [goalTargetAmount, setGoalTargetAmount] = useState('');
  const [goalCurrentAmount, setGoalCurrentAmount] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [goalCategory, setGoalCategory] = useState('Savings');
  const [goalSaving, setGoalSaving] = useState(false);

  const [contribAmount, setContribAmount] = useState('');
  const [contribSaving, setContribSaving] = useState(false);

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

      // Fetch actual category spending
      try {
        const analytics = await api.getMonthlyAnalytics(year, month);
        const sMap: Record<string, number> = {};
        if (analytics && analytics.byCategory) {
          analytics.byCategory.forEach((item: any) => {
            if (item.category) {
              sMap[item.category] = item.total;
            }
          });
        }
        setSpentMap(sMap);
      } catch (e) {
        console.error("Failed to load actual expenses", e);
      }
    } catch {}
  }, [year, month]);

  const loadGoals = useCallback(async () => {
    try {
      const data = await api.getGoals();
      setGoals(data);
    } catch (err) {
      console.error("Error loading goals", err);
    }
  }, []);

  useEffect(() => {
    if (authorized) {
      load();
      loadGoals();
    }
  }, [load, loadGoals, authorized]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle || !goalTargetAmount) return;
    setGoalSaving(true);
    try {
      await api.createGoal({
        title: goalTitle,
        target_amount: parseFloat(goalTargetAmount),
        current_amount: parseFloat(goalCurrentAmount) || 0,
        target_date: goalTargetDate ? new Date(goalTargetDate).toISOString() : undefined,
        category: goalCategory
      });
      setIsGoalModalOpen(false);
      setGoalTitle('');
      setGoalTargetAmount('');
      setGoalCurrentAmount('');
      setGoalTargetDate('');
      showToast('Savings Goal created!');
      loadGoals();
    } catch {
      showToast('Failed to create goal');
    } finally {
      setGoalSaving(false);
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalId || !contribAmount) return;
    setContribSaving(true);
    try {
      await api.contributeToGoal(selectedGoalId, parseFloat(contribAmount));
      setIsContributeModalOpen(false);
      setContribAmount('');
      showToast('Contribution added!');
      loadGoals();
    } catch {
      showToast('Contribution failed');
    } finally {
      setContribSaving(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Are you sure you want to delete this savings goal?')) return;
    try {
      await api.deleteGoal(id);
      showToast('Savings Goal deleted');
      loadGoals();
    } catch {
      showToast('Failed to delete goal');
    }
  };

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
  const totalSpent = Object.values(spentMap).reduce((s, v) => s + (v || 0), 0);
  const remainingBudget = totalBudgeted - totalSpent;

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Monthly Income', value: fmt(baseline), color: 'var(--text-primary)', warning: null },
            { label: 'Total Budgeted', value: fmt(totalBudgeted), color: 'var(--text-secondary)', warning: remaining < 0 ? `Over-budgeted by ${fmt(Math.abs(remaining))}` : null },
            { label: 'Actual Expenses', value: fmt(totalSpent), color: totalSpent > totalBudgeted ? 'var(--accent-red)' : 'var(--text-primary)', warning: totalSpent > totalBudgeted ? `Over budget by ${fmt(totalSpent - totalBudgeted)}` : null },
            { label: 'Remaining Budget', value: fmt(remainingBudget), color: remainingBudget < 0 ? 'var(--accent-red)' : 'var(--text-primary)', warning: remainingBudget < 0 ? `Overspent by ${fmt(Math.abs(remainingBudget))}` : null },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center' }}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.color, marginTop: 8 }}>{s.value}</div>
              {s.warning && (
                <div style={{ color: 'var(--accent-red)', fontSize: 11, marginTop: 4 }}>⚠ {s.warning}</div>
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

        {/* Layout grid for Category Limits & Savings Goals */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginTop: 20 }}>
          {/* Category budgets */}
          <div className="card" style={{ height: 'fit-content' }}>
            <div className="chart-title" style={{ marginBottom: 20 }}>Category Limits</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {DEFAULT_CATS.map(cat => {
                const limit = editValues[cat] || 0;
                const spent = spentMap[cat] || 0;

                // Progress percentage calculation
                let pct = 0;
                if (limit > 0) {
                  pct = (spent / limit) * 100;
                } else if (spent > 0) {
                  pct = 100;
                }

                // Color coding for health status
                let barColor = 'var(--accent-green)';
                let isOver = false;
                let warningText = '';

                if (limit > 0) {
                  if (spent > limit) {
                    barColor = 'var(--accent-red)';
                    isOver = true;
                    warningText = `Over by ${fmt(spent - limit)}`;
                  } else if (spent >= limit * 0.8) {
                    barColor = 'var(--accent-amber)';
                    warningText = 'Approaching limit';
                  }
                } else if (spent > 0) {
                  barColor = 'var(--accent-red)';
                  isOver = true;
                  warningText = 'No limit set';
                }

                return (
                  <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {cat}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {editing ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Limit:</span>
                            <input
                              type="number" min="0" step="100"
                              className="form-input"
                              style={{ width: 100, padding: '4px 8px', fontSize: '12px' }}
                              value={limit}
                              onChange={e => setEditValues(prev => ({ ...prev, [cat]: parseFloat(e.target.value) || 0 }))}
                            />
                          </div>
                        ) : (
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            <span style={{ fontWeight: 700, color: isOver ? 'var(--accent-red)' : 'var(--text-primary)' }}>{fmt(spent)}</span>
                            <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>/</span>
                            <span>{fmt(limit)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {!editing && (
                      <>
                        <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: barColor, borderRadius: 3, transition: 'width 0.4s ease' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                          <span style={{ color: isOver ? 'var(--accent-red)' : warningText ? 'var(--accent-amber)' : 'var(--text-muted)', fontWeight: warningText ? 500 : 400 }}>
                            {warningText ? `⚠ ${warningText}` : 'Healthy'}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                            {pct.toFixed(0)}% spent
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Savings Goals */}
          <div className="card" style={{ height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div className="chart-title" style={{ margin: 0 }}>Savings Goals</div>
              <button 
                className="btn btn-ghost" 
                style={{ fontSize: 12, padding: '4px 10px', borderColor: 'var(--border)' }}
                onClick={() => setIsGoalModalOpen(true)}
              >
                ➕ New Goal
              </button>
            </div>
            
            {goals.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <span>🎯 No savings goals configured yet.</span>
                <span style={{ fontSize: 11 }}>Set a target to keep track of your contributions!</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {goals.map(g => {
                  const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
                  const dateStr = g.target_date ? new Date(g.target_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : 'No target date';
                  return (
                    <div key={g._id || g.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{g.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{dateStr} • {g.category}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '2px 8px', fontSize: 11, height: 26, borderColor: 'var(--border)' }}
                            onClick={() => { setSelectedGoalId(g._id || g.id); setIsContributeModalOpen(true); }}
                          >
                            💰 Save
                          </button>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '2px 6px', fontSize: 11, height: 26, color: 'var(--accent-red)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                            onClick={() => handleDeleteGoal(g._id || g.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        <span>Saved: {fmt(g.current_amount)}</span>
                        <span>Target: {fmt(g.target_amount)}</span>
                      </div>
                      
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${Math.min(pct, 100)}%`, 
                          background: pct >= 100 ? '#10b981' : '#8b5cf6', 
                          borderRadius: 3, 
                          transition: 'width 0.4s ease' 
                        }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', textAlign: 'right', marginTop: 4 }}>
                        {pct.toFixed(0)}% Completed
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Savings Goal Modal */}
      {isGoalModalOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '16px'
        }}>
          <div className="modal-content" style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>New Savings Goal</h3>
              <button 
                onClick={() => setIsGoalModalOpen(false)} 
                className="btn btn-ghost" 
                style={{ padding: 4, width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateGoal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Goal Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. New iPhone, Vacation"
                  value={goalTitle}
                  onChange={e => setGoalTitle(e.target.value)}
                  required
                  style={{ width: '100%', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Target Amount (₹)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="50000"
                    value={goalTargetAmount}
                    onChange={e => setGoalTargetAmount(e.target.value)}
                    required
                    min="1"
                    style={{ width: '100%', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Starting Amount (₹)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="0"
                    value={goalCurrentAmount}
                    onChange={e => setGoalCurrentAmount(e.target.value)}
                    min="0"
                    style={{ width: '100%', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Target Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={goalTargetDate}
                    onChange={e => setGoalTargetDate(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Category</label>
                  <select 
                    className="form-select" 
                    value={goalCategory}
                    onChange={e => setGoalCategory(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}
                  >
                    <option value="Savings">Savings</option>
                    <option value="Emergency Fund">Emergency Fund</option>
                    <option value="Retirement">Retirement</option>
                    <option value="Gadgets">Gadgets</option>
                    <option value="Travel">Travel</option>
                    <option value="Investment">Investment</option>
                  </select>
                </div>
              </div>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '10px', marginTop: '8px' }}
                disabled={goalSaving}
              >
                {goalSaving ? 'Creating...' : 'Create Savings Goal'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Contribute Modal */}
      {isContributeModalOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '16px'
        }}>
          <div className="modal-content" style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            width: '100%',
            maxWidth: '360px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Contribute Funds</h3>
              <button 
                onClick={() => setIsContributeModalOpen(false)} 
                className="btn btn-ghost" 
                style={{ padding: 4, width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleContribute} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Contribution Amount (₹)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="e.g. 5000"
                  value={contribAmount}
                  onChange={e => setContribAmount(e.target.value)}
                  required
                  min="1"
                  style={{ width: '100%', fontSize: '16px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}
                  autoFocus
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '10px', marginTop: '8px' }}
                disabled={contribSaving}
              >
                {contribSaving ? 'Processing...' : 'Add Contribution'}
              </button>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-container">
          <div className="toast success">✅ {toast}</div>
        </div>
      )}
    </div>
  );
}

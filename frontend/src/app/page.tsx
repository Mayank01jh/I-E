'use client';
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import CategoryChips from '@/components/CategoryChips';
import { api } from '@/lib/api';
import { MonthlySummary, Transaction, TrendPoint } from '@/types';
import LocalStorageAnalyzer from '@/components/LocalStorageAnalyzer';
import MonthlyPurgeControl from '@/components/MonthlyPurgeControl';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend,
} from 'recharts';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const COLORS = ['#ffffff', '#f5f5f5', '#e5e5e5', '#d4d4d4', '#a3a3a3', '#737373', '#525252', '#404040', '#262626', '#171717', '#efefef', '#cfcfcf', '#8f8f8f'];

function fmt(n: number) { return `₹${n.toLocaleString('en-IN')}`; }

export default function Dashboard() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [trends,  setTrends]  = useState<TrendPoint[]>([]);
  const [recent,  setRecent]  = useState<Transaction[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success'|'error' } | null>(null);
  const [authorized, setAuthorized] = useState(false);

  // File Upload states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
    } else {
      setAuthorized(true);
    }
  }, []);

  // Add transaction modal
  const [showModal, setShowModal] = useState(false);
  const [txAmount, setTxAmount]   = useState('');
  const [txCat,    setTxCat]      = useState('Cafeteria');
  const [txNotes,  setTxNotes]    = useState('');
  const [txDate,   setTxDate]     = useState(new Date().toISOString().slice(0,10));
  const [txType,   setTxType]     = useState<'EXPENSE'|'INCOME'>('EXPENSE');
  const [saving,   setSaving]     = useState(false);

  const showToast = (msg: string, type: 'success'|'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    try {
      const [s, t, r] = await Promise.all([
        api.getMonthlyAnalytics(year, month),
        api.getTrends(),
        api.getTransactions({ year, month, limit: 5 }),
      ]);
      setSummary(s);
      setTrends(Array.isArray(t) ? t : []);
      setRecent(r.transactions || []);
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

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await api.seedData();
      showToast(res.message || 'Seeded!', 'success');
      load();
    } catch { showToast('Seed failed', 'error'); }
    setSeeding(false);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await api.uploadSpreadsheet(formData);
      showToast(res.message || 'File uploaded successfully!', 'success');
      setShowUploadModal(false);
      setSelectedFile(null);
      load();
    } catch (err: any) {
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const name = file.name.toLowerCase();
      if (name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.xls')) {
        setSelectedFile(file);
      } else {
        showToast('Please upload a .csv or .xlsx file', 'error');
      }
    }
  };

  const handleAddTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || !txCat) return;
    setSaving(true);
    try {
      await api.createTransaction({ amount: parseFloat(txAmount), category: txCat, type: txType, date: txDate, notes: txNotes });
      
      // Save local backup for LocalStorageAnalyzer
      if (typeof window !== 'undefined') {
        const localTx = {
          amount: parseFloat(txAmount),
          category: txCat,
          timestamp: new Date(txDate).toISOString(),
          source: 'Manual'
        };
        const existing = localStorage.getItem('local_expenses');
        const list = existing ? JSON.parse(existing) : [];
        list.push(localTx);
        localStorage.setItem('local_expenses', JSON.stringify(list));
      }

      setShowModal(false);
      setTxAmount(''); setTxNotes('');
      showToast('Transaction added!', 'success');
      load();
    } catch { showToast('Failed to add', 'error'); }
    setSaving(false);
  };

  const savingsRate = summary ? parseFloat(String(summary.savingsRate)) : 0;
  const trendData = trends.map(t => ({ name: `${MONTHS[t.month-1]}'${String(t.year).slice(2)}`, total: t.total }));

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1>Dashboard</h1>
            <p>Your personal finance at a glance — {MONTHS[month-1]} {year}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <MonthlyPurgeControl currentYear={year} currentMonth={MONTHS[month-1]} onRefresh={load} />
            <button className="btn btn-ghost" onClick={() => setShowUploadModal(true)}>
              📤 Import File
            </button>
            <button className="btn btn-ghost" onClick={() => setShowAnalyzer(!showAnalyzer)}>
              📊 {showAnalyzer ? 'Hide Local Analysis' : 'Local Analysis'}
            </button>
            <button className="btn btn-primary" id="add-transaction-btn" onClick={() => setShowModal(true)}>
              + Add Expense
            </button>
          </div>
        </div>

        {/* Month selector */}
        <div className="month-tabs">
          {MONTHS.map((m, i) => (
            <button
              key={m}
              className={`month-tab${month === i+1 ? ' active' : ''}`}
              onClick={() => setMonth(i+1)}
            >{m}</button>
          ))}
          <select
            value={year}
            onChange={e => setYear(parseInt(e.target.value))}
            className="form-select"
            style={{ width: 90, padding: '4px 10px', fontSize: 12 }}
          >
            {[2026,2027,2028,2029].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>

        {showAnalyzer && <LocalStorageAnalyzer />}

        {/* KPI Cards */}
        <div className="stats-grid">
          <div className="stat-card" style={{ '--accent-gradient': 'var(--gradient-main)' } as React.CSSProperties}>
            <div className="stat-label">Monthly Budget</div>
            <div className="stat-value">{fmt(summary?.baseline ?? 15000)}</div>
            <div className="stat-sub">Baseline income</div>
          </div>
          <div className="stat-card" style={{ '--accent-gradient': 'var(--gradient-danger)' } as React.CSSProperties}>
            <div className="stat-label">Total Spent</div>
            <div className="stat-value" style={{ color: 'var(--accent-red)' }}>{fmt(summary?.totalSpent ?? 0)}</div>
            <div className="stat-sub">{MONTHS[month-1]} {year}</div>
          </div>
          <div className="stat-card" style={{ '--accent-gradient': 'var(--gradient-success)' } as React.CSSProperties}>
            <div className="stat-label">Total Saved</div>
            <div className="stat-value" style={{ color: 'var(--accent-green)' }}>{fmt(summary?.totalSaved ?? 0)}</div>
            <div className="stat-sub">
              <div className="savings-bar">
                <div className="savings-bar-fill" style={{ width: `${Math.min(savingsRate, 100)}%` }} />
              </div>
              {savingsRate}% savings rate
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Categories Used</div>
            <div className="stat-value">{summary?.byCategory?.length ?? 0}</div>
            <div className="stat-sub">Active expense categories</div>
          </div>
        </div>

        {/* Charts */}
        <div className="charts-grid">
          {/* Donut Chart */}
          <div className="chart-card">
            <div className="chart-title">Spending by Category</div>
            <div className="chart-subtitle">{MONTHS[month-1]} {year} breakdown</div>
            {summary?.byCategory && summary.byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={summary.byCategory} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={100} innerRadius={55} paddingAngle={2}>
                    {summary.byCategory.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color || `var(--chart-color-${(i % 8) + 1})`} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => typeof v === 'number' ? fmt(v) : v}
                    contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8 }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                    labelStyle={{ color: 'var(--text-primary)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No data for this period.<br />Add a transaction or import xlsx ↑
              </div>
            )}
          </div>

          {/* Trend Line */}
          <div className="chart-card">
            <div className="chart-title">6-Month Spending Trend</div>
            <div className="chart-subtitle">Rolling monthly total</div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: any) => typeof v === 'number' ? fmt(v) : v}
                  contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8 }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                />
                <Line type="monotone" dataKey="total" stroke="var(--text-primary)" strokeWidth={2.5} dot={{ fill: 'var(--text-primary)', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category breakdown table */}
        {summary?.byCategory && summary.byCategory.length > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="chart-title" style={{ marginBottom: 16 }}>Category Breakdown</div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Category</th><th>Transactions</th><th>Amount</th><th>% of Budget</th></tr></thead>
                <tbody>
                  {summary.byCategory.map((c, i) => {
                    const baseline = summary?.baseline ?? 15000;
                    const pct = baseline > 0 ? (c.total / baseline) * 100 : 0;
                    return (
                      <tr key={c.category}>
                        <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: c.color || `var(--chart-color-${(i % 8) + 1})`, display: 'inline-block' }} />{c.category}</span></td>
                        <td style={{ color: 'var(--text-secondary)' }}>{c.count}</td>
                        <td style={{ fontWeight: 600 }}>{fmt(c.total)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 4, background: 'var(--bg-card-hover)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: '#ffffff', borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 36 }}>{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent transactions */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="chart-title">Recent Transactions</div>
            <a href="/transactions" style={{ fontSize: 12, color: 'var(--accent-purple)', textDecoration: 'none' }}>View all →</a>
          </div>
          {recent.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Category</th><th>Date</th><th>Source</th><th>Amount</th></tr></thead>
                <tbody>
                  {recent.map(tx => (
                    <tr key={tx._id}>
                      <td>{tx.category}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{new Date(tx.date).toLocaleDateString('en-IN')}</td>
                      <td><span className={`badge badge-${tx.source}`}>{tx.source}</span></td>
                      <td style={{ fontWeight: 600, color: tx.type === 'INCOME' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {tx.type === 'INCOME' ? '+' : '-'}{fmt(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions yet for this period.</div>
          )}
        </div>
      </main>

      {/* Add Transaction Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{txType === 'EXPENSE' ? 'Record Expense' : 'Record Income'}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddTx} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Type toggle */}
              <div style={{ display: 'flex', gap: 8 }}>
                {(['EXPENSE','INCOME'] as const).map(t => (
                  <button key={t} type="button"
                    className={`btn ${txType === t ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1 }}
                    onClick={() => { setTxType(t); setTxCat(''); }}
                  >{t === 'EXPENSE' ? '💸 Expense' : '💚 Income'}</button>
                ))}
              </div>

              {/* Amount */}
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input id="tx-amount" type="number" step="0.01" min="0.01" required
                  className="form-input" placeholder={txType === 'INCOME' ? 'e.g. 5000' : 'e.g. 1408'}
                  value={txAmount} onChange={e => setTxAmount(e.target.value)}
                  style={{ fontSize: 22, fontWeight: 700 }}
                />
              </div>

              {/* Category chips */}
              <div className="form-group">
                <label className="form-label">Category — tap to select</label>
                <CategoryChips selectedCategory={txCat} onSelect={setTxCat} type={txType} />
              </div>

              {/* Date */}
              <div className="form-group">
                <label className="form-label">Date</label>
                <input id="tx-date" type="date" className="form-input"
                  value={txDate} onChange={e => setTxDate(e.target.value)} />
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <textarea id="tx-notes" className="form-textarea" rows={2} placeholder="What was this for?"
                  value={txNotes} onChange={e => setTxNotes(e.target.value)} />
              </div>

              <button id="submit-transaction-btn" type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" /> : null}
                {saving ? 'Saving…' : `+ Log ${txType === 'EXPENSE' ? 'Expense' : 'Income'}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Upload Spreadsheet Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => { if (!uploading) setShowUploadModal(false); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div className="modal-title">Upload Spreadsheet (.csv, .xlsx)</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowUploadModal(false)} disabled={uploading}>✕</button>
            </div>
            
            <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${dragActive ? 'var(--accent-purple)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '32px 20px',
                  textAlign: 'center',
                  background: dragActive ? 'rgba(139, 92, 246, 0.05)' : 'var(--bg-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                <input 
                  type="file" 
                  id="spreadsheet-file-input"
                  accept=".csv, .xlsx, .xls"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    opacity: 0, cursor: 'pointer'
                  }}
                  disabled={uploading}
                />
                <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {selectedFile ? selectedFile.name : 'Drag & drop your file here'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Supports standard lists & matrix spreadsheets (.csv, .xlsx)'}
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '10px' }} 
                disabled={!selectedFile || uploading}
              >
                {uploading ? <span className="spinner" style={{ marginRight: 6 }} /> : null}
                {uploading ? 'Importing...' : 'Start Spreadsheet Import'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}

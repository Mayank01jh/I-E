'use client';
import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import CategoryChips from '@/components/CategoryChips';
import { api } from '@/lib/api';
import { Transaction } from '@/types';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function fmt(n: number) { return `₹${n.toLocaleString('en-IN')}`; }

export default function TransactionsPage() {
  const now = new Date();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterYear,  setFilterYear]  = useState<number | ''>(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState<number | ''>(now.getMonth() + 1);
  const [filterCat,   setFilterCat]   = useState('');
  const [filterType,  setFilterType]  = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
    } else {
      setAuthorized(true);
    }
  }, []);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState<Transaction | null>(null);
  const [txAmount, setTxAmount]   = useState('');
  const [txCat,    setTxCat]      = useState('Cafeteria');
  const [txNotes,  setTxNotes]    = useState('');
  const [txDate,   setTxDate]     = useState(now.toISOString().slice(0,10));
  const [txType,   setTxType]     = useState<'EXPENSE'|'INCOME'>('EXPENSE');
  const [saving,   setSaving]     = useState(false);

  const showToast = (msg: string, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (filterYear)  params.year  = filterYear;
      if (filterMonth) params.month = filterMonth;
      if (filterCat)   params.category = filterCat;
      if (filterType)  params.type  = filterType;
      const data = await api.getTransactions(params);
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
    } catch {}
    setLoading(false);
  }, [page, filterYear, filterMonth, filterCat, filterType]);

  useEffect(() => {
    if (authorized) {
      load();
    }
  }, [load, authorized]);

  if (!authorized) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>Loading...</div>;
  }

  const openAdd = () => {
    setEditing(null);
    setTxAmount(''); setTxCat('Cafeteria'); setTxNotes('');
    setTxDate(now.toISOString().slice(0,10)); setTxType('EXPENSE');
    setShowModal(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setTxAmount(String(tx.amount)); setTxCat(tx.category); setTxNotes(tx.notes);
    setTxDate(tx.date.slice(0,10)); setTxType(tx.type as 'EXPENSE'|'INCOME');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { amount: parseFloat(txAmount), category: txCat, type: txType, date: txDate, notes: txNotes };
      if (editing) {
        await api.updateTransaction(editing._id, payload);
        showToast('Transaction updated!');
      } else {
        await api.createTransaction(payload);
        
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

        showToast('Transaction added!');
      }
      setShowModal(false);
      load();
    } catch { showToast('Failed', 'error'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    try { await api.deleteTransaction(id); showToast('Deleted'); load(); }
    catch { showToast('Failed', 'error'); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string | number> = {};
      if (filterYear)  params.year  = filterYear;
      if (filterMonth) params.month = filterMonth;
      if (filterCat)   params.category = filterCat;
      if (filterType)  params.type  = filterType;
      
      const blob = await api.exportTransactions(params);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${filterYear || 'all'}_${filterMonth || 'all'}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      showToast('Transactions exported successfully!');
    } catch {
      showToast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Transactions</h1>
            <p>{total} records found</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button 
              className="btn btn-ghost" 
              onClick={handleExport} 
              disabled={exporting}
              style={{ borderColor: 'var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {exporting ? '⏳' : '📥'} {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <button className="btn btn-primary" onClick={openAdd} id="add-tx-btn">+ Add Expense</button>
          </div>
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1 1 90px' }}>
            <label className="form-label">Year</label>
            <select className="form-select" value={filterYear} onChange={e => { setPage(1); setFilterYear(e.target.value ? parseInt(e.target.value) : ''); }}>
              <option value="">All</option>
              {[2026,2027,2028,2029].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: '1 1 120px' }}>
            <label className="form-label">Month</label>
            <select className="form-select" value={filterMonth} onChange={e => { setPage(1); setFilterMonth(e.target.value ? parseInt(e.target.value) : ''); }}>
              <option value="">All months</option>
              {MONTH_FULL.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: '1 1 120px' }}>
            <label className="form-label">Type</label>
            <select className="form-select" value={filterType} onChange={e => { setPage(1); setFilterType(e.target.value); setFilterCat(''); }}>
              <option value="">All types</option>
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
            </select>
          </div>
          <button className="btn btn-ghost" onClick={() => { setFilterYear(now.getFullYear()); setFilterMonth(now.getMonth()+1); setFilterCat(''); setFilterType(''); setPage(1); }}>
            Reset
          </button>
        </div>

        {/* Filter by category chips */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="form-label" style={{ marginBottom: 10 }}>Filter by Category</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div className={`chip${filterCat === '' ? ' selected' : ''}`}
              style={filterCat === '' ? { backgroundColor: '#8b5cf6' } : {}}
              onClick={() => { setFilterCat(''); setPage(1); }}>
              All
            </div>
            <CategoryChips selectedCategory={filterCat} onSelect={c => { setFilterCat(c); setPage(1); }} type={filterType as 'EXPENSE' | 'INCOME' | ''} />
          </div>
        </div>

        {/* Table */}
        <div className="card">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Source</th>
                      <th>Notes</th>
                      <th>Amount</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No transactions found</td></tr>
                    ) : transactions.map(tx => (
                      <tr key={tx._id}>
                        <td style={{ fontWeight: 500 }}>{tx.category}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                          {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td><span className={`badge badge-${tx.type.toLowerCase()}`}>{tx.type}</span></td>
                        <td><span className={`badge badge-${tx.source}`}>{tx.source}</span></td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 12, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.notes || '—'}</td>
                        <td style={{ fontWeight: 700, color: tx.type === 'INCOME' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {tx.type === 'INCOME' ? '+' : '-'}{fmt(tx.amount)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(tx)} title="Edit">✏️</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(tx._id)} title="Delete">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '16px 0 0' }}>
                  <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p-1)}>← Prev</button>
                  <span style={{ color: 'var(--text-secondary)', padding: '6px 12px', fontSize: 13 }}>Page {page} of {totalPages}</span>
                  <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p+1)}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editing ? (txType === 'EXPENSE' ? 'Edit Expense' : 'Edit Income') : (txType === 'EXPENSE' ? 'Record Expense' : 'Record Income')}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['EXPENSE','INCOME'] as const).map(t => (
                  <button key={t} type="button" className={`btn ${txType === t ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }} onClick={() => { setTxType(t); setTxCat(''); }}>
                    {t === 'EXPENSE' ? '💸 Expense' : '💚 Income'}
                  </button>
                ))}
              </div>
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input type="number" step="0.01" min="0.01" required className="form-input" placeholder={txType === 'INCOME' ? 'e.g. 5000' : 'e.g. 1408'}
                  value={txAmount} onChange={e => setTxAmount(e.target.value)} style={{ fontSize: 22, fontWeight: 700 }} />
              </div>
              <div className="form-group">
                <label className="form-label">Category — tap to select</label>
                <CategoryChips selectedCategory={txCat} onSelect={setTxCat} type={txType} />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" className="form-input" value={txDate} onChange={e => setTxDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <textarea className="form-textarea" rows={2} placeholder="What was this for?"
                  value={txNotes} onChange={e => setTxNotes(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" /> : null}
                {saving ? 'Saving…' : editing ? 'Update Transaction' : `+ Log ${txType === 'EXPENSE' ? 'Expense' : 'Income'}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>{toast.type === 'success' ? '✅' : '❌'} {toast.msg}</div>
        </div>
      )}
    </div>
  );
}

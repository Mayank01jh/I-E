'use client';
import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { DebtRecord, UpcomingBill } from '@/types';

export default function DebtsPage() {
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [bills, setBills] = useState<UpcomingBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // Modal States
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);

  // New Debt Form
  const [debtPerson, setDebtPerson] = useState('');
  const [debtEmail, setDebtEmail] = useState('');
  const [debtWhatsApp, setDebtWhatsApp] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtType, setDebtType] = useState<'LENT' | 'BORROWED'>('LENT');
  const [debtDueDate, setDebtDueDate] = useState('');
  const [debtNotes, setDebtNotes] = useState('');

  // New Bill Form
  const [billTitle, setBillTitle] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billCategory, setBillCategory] = useState('Groceries');
  const [billDueDate, setBillDueDate] = useState('');
  const [billRecurring, setBillRecurring] = useState(false);

  // Loading indicator for dispatches
  const [pingingId, setPingingId] = useState<string | null>(null);

  // Budget threshold audit state
  const [auditResult, setAuditResult] = useState<{ status: string; spent: number; baseline: number; overrun?: number } | null>(null);
  const [auditing, setAuditing] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Validate auth
      await api.getMe();
      setAuthorized(true);

      const [debtList, billList] = await Promise.all([
        api.getDebts(),
        api.getBills()
      ]);
      setDebts(debtList);
      setBills(billList);
    } catch (err) {
      console.error(err);
      if (typeof window !== 'undefined') window.location.href = '/login';
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Debt Handlers
  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtPerson || !debtAmount) return;
    try {
      await api.createDebt({
        person_name: debtPerson,
        contact_email: debtEmail,
        contact_whatsapp: debtWhatsApp,
        amount: parseFloat(debtAmount),
        type: debtType,
        due_date: debtDueDate || undefined,
        notes: debtNotes || undefined
      });
      showToast('Debt record registered!');
      setShowDebtModal(false);
      // Reset Form
      setDebtPerson(''); setDebtEmail(''); setDebtWhatsApp('');
      setDebtAmount(''); setDebtNotes(''); setDebtDueDate('');
      load();
    } catch {
      showToast('Failed to add debt record', 'error');
    }
  };

  const handleSettleDebt = async (id: string) => {
    try {
      await api.settleDebt(id);
      showToast('Status updated!');
      load();
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const handleDeleteDebt = async (id: string) => {
    if (!confirm('Wipe this ledger entry?')) return;
    try {
      await api.deleteDebt(id);
      showToast('Record deleted!');
      load();
    } catch {
      showToast('Failed to delete record', 'error');
    }
  };

  const triggerReminder = async (id: string) => {
    setPingingId(id);
    try {
      await api.sendDebtReminder(id);
      showToast('Reminder dispatch logged to sandbox (console)!', 'success');
    } catch {
      showToast('Failed to send reminder', 'error');
    } finally {
      setPingingId(null);
    }
  };

  // Bill Handlers
  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billTitle || !billAmount) return;
    try {
      await api.createBill({
        title: billTitle,
        amount: parseFloat(billAmount),
        category: billCategory,
        due_date: billDueDate || undefined,
        recurring: billRecurring
      });
      showToast('Upcoming payment saved!');
      setShowBillModal(false);
      setBillTitle(''); setBillAmount(''); setBillDueDate(''); setBillRecurring(false);
      load();
    } catch {
      showToast('Failed to save bill', 'error');
    }
  };

  const handlePayBill = async (id: string) => {
    try {
      await api.payBill(id);
      showToast('Payment checked!');
      load();
    } catch {
      showToast('Failed to check payment', 'error');
    }
  };

  const handleDeleteBill = async (id: string) => {
    if (!confirm('Delete this bill?')) return;
    try {
      await api.deleteBill(id);
      showToast('Bill deleted!');
      load();
    } catch {
      showToast('Failed to delete bill', 'error');
    }
  };

  // Budget threshold check handler
  const handleRunAudit = async () => {
    setAuditing(true);
    try {
      const res = await api.checkBudgetAlerts();
      setAuditResult(res);
      if (res.status === 'OVER_BUDGET') {
        showToast('Threshold warning dispatched to WhatsApp!', 'error');
      } else {
        showToast('Spending levels stable!', 'success');
      }
    } catch {
      showToast('Threshold check failed', 'error');
    } finally {
      setAuditing(false);
    }
  };

  // Aggregates
  const totalLent = debts.filter(d => d.type === 'LENT' && !d.is_settled).reduce((a, b) => a + b.amount, 0);
  const totalBorrowed = debts.filter(d => d.type === 'BORROWED' && !d.is_settled).reduce((a, b) => a + b.amount, 0);
  const netOutstanding = totalLent - totalBorrowed;

  if (loading || !authorized) {
    return (
      <div className="app-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <span className="spinner" />
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      
      <main className="main-content">
        {/* Header */}
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Peer Ledger & Alerts</h1>
            <p>Administer borrowing sheets, scheduled bills, and proactive warnings</p>
          </div>
          
          <button 
            className="btn btn-ghost"
            onClick={handleRunAudit}
            disabled={auditing}
            style={{ borderColor: 'var(--text-muted)' }}
          >
            {auditing ? <span className="spinner" style={{ marginRight: 6 }} /> : '🚨'} {auditing ? 'Auditing...' : 'Run Budget Threshold Audit'}
          </button>
        </div>

        {/* Audit Result Alerts */}
        {auditResult && (
          <div 
            style={{ 
              marginBottom: 24, 
              padding: '16px 20px', 
              borderRadius: 'var(--radius-lg)', 
              background: auditResult.status === 'OVER_BUDGET' ? 'rgba(217, 119, 6, 0.06)' : 'rgba(5, 150, 105, 0.06)',
              border: `1px solid ${auditResult.status === 'OVER_BUDGET' ? '#d97706' : '#059669'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              animation: 'fadeIn 0.3s ease'
            }}
          >
            <div>
              <p style={{ fontWeight: 600, fontSize: 13, color: auditResult.status === 'OVER_BUDGET' ? '#d97706' : '#059669', margin: 0 }}>
                {auditResult.status === 'OVER_BUDGET' ? '⚠️ CRITICAL BUDGET WARNING' : '💚 STABLE BUDGET AUDIT'}
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '4px 0 0 0', lineHeight: 1.4 }}>
                {auditResult.status === 'OVER_BUDGET' 
                  ? `Your current month expenses (₹${auditResult.spent.toLocaleString()}) have exceeded the baseline target (₹${auditResult.baseline.toLocaleString()}) by ₹${auditResult.overrun?.toLocaleString()}! A sandbox WhatsApp warning was dispatched to +919999999999.`
                  : `Spending total is currently stable at ₹${auditResult.spent.toLocaleString()} within your ₹${auditResult.baseline.toLocaleString()} limit.`}
              </p>
            </div>
            <button 
              className="btn btn-ghost btn-sm"
              onClick={() => setAuditResult(null)}
              style={{ padding: 6, borderColor: 'var(--border)' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Ledger Summary Cards */}
        <div className="stats-grid">
          <div className="stat-card" style={{ '--accent-gradient': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' } as React.CSSProperties}>
            <span className="stat-label">Total Lent (Receivables)</span>
            <span className="stat-value" style={{ color: '#0891b2' }}>₹{totalLent.toLocaleString('en-IN')}</span>
            <span className="stat-sub">Capital owed to you</span>
          </div>

          <div className="stat-card" style={{ '--accent-gradient': 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)' } as React.CSSProperties}>
            <span className="stat-label">Total Borrowed (Liabilities)</span>
            <span className="stat-value" style={{ color: '#e11d48' }}>₹{totalBorrowed.toLocaleString('en-IN')}</span>
            <span className="stat-sub">Balances you owe others</span>
          </div>

          <div className="stat-card" style={{ '--accent-gradient': netOutstanding >= 0 ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' : 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)' } as React.CSSProperties}>
            <span className="stat-label">Net Ledger Balance</span>
            <span className="stat-value" style={{ color: netOutstanding >= 0 ? '#0891b2' : '#e11d48' }}>
              {netOutstanding >= 0 ? '+' : '-'}₹{Math.abs(netOutstanding).toLocaleString('en-IN')}
            </span>
            <span className="stat-sub">{netOutstanding >= 0 ? 'Net positive asset' : 'Net negative liability'}</span>
          </div>
        </div>

        {/* Main Grid: Peer Ledger & Upcoming Bills */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'flex-start', marginBottom: 32 }}>
          
          {/* Peer Ledger */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 16 }}>
              <div>
                <h3 className="chart-title">Lending & Borrowing Ledger</h3>
                <p className="chart-subtitle" style={{ margin: 0 }}>Balances and counterparty remind tools</p>
              </div>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => setShowDebtModal(true)}
              >
                🤝 Add Record
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {debts.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: 13 }}>No debt records registered</p>
              ) : (
                debts.map(debt => (
                  <div 
                    key={debt._id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '12px 16px', 
                      background: 'var(--bg-secondary)', 
                      border: `1.5px solid ${debt.is_settled ? 'var(--border)' : (debt.type === 'LENT' ? 'rgba(8, 145, 178, 0.2)' : 'rgba(225, 29, 72, 0.2)')}`,
                      borderRadius: 'var(--radius-md)',
                      opacity: debt.is_settled ? 0.6 : 1
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button 
                        onClick={() => handleSettleDebt(debt._id)}
                        title={debt.is_settled ? "Mark as outstanding" : "Mark as settled"}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}
                      >
                        {debt.is_settled ? '✅' : '⬜'}
                      </button>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 13, textDecoration: debt.is_settled ? 'line-through' : 'none', color: 'var(--text-primary)', margin: 0 }}>
                          {debt.person_name}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                          Due: {debt.due_date ? new Date(debt.due_date).toLocaleDateString('en-IN') : 'None'} {debt.notes && `• ${debt.notes}`}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span 
                        style={{ 
                          fontFamily: 'monospace', 
                          fontWeight: 700, 
                          color: debt.is_settled ? 'var(--text-secondary)' : (debt.type === 'LENT' ? '#0891b2' : '#e11d48'),
                          fontSize: 13
                        }}
                      >
                        {debt.type === 'LENT' ? '+' : '-'}₹{debt.amount.toLocaleString()}
                      </span>
                      
                      {!debt.is_settled && (
                        <button
                          onClick={() => triggerReminder(debt._id)}
                          disabled={pingingId === debt._id}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '6px 8px', borderColor: 'var(--border)' }}
                          title="Broadcast Reminder Alert"
                        >
                          {pingingId === debt._id ? '⏳' : '✉️'}
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDeleteDebt(debt._id)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '6px 8px', borderColor: 'rgba(255,74,74,0.2)', color: '#ff4a4a' }}
                        title="Delete entry"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Bills */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 16 }}>
              <div>
                <h3 className="chart-title">Upcoming Target Bills</h3>
                <p className="chart-subtitle" style={{ margin: 0 }}>Scheduled limits and subscription tracking</p>
              </div>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => setShowBillModal(true)}
              >
                💰 Add Bill
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bills.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: 13 }}>No scheduled bills configured</p>
              ) : (
                bills.map(bill => (
                  <div 
                    key={bill._id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '12px 16px', 
                      background: 'var(--bg-secondary)', 
                      border: `1.5px solid ${bill.is_paid ? 'rgba(5, 150, 105, 0.2)' : 'rgba(217, 119, 6, 0.2)'}`,
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button 
                        onClick={() => handlePayBill(bill._id)}
                        title={bill.is_paid ? "Mark as unpaid" : "Mark as paid"}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}
                      >
                        {bill.is_paid ? '🟢' : '⚪'}
                      </button>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>
                          {bill.title}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                          Due: {bill.due_date ? new Date(bill.due_date).toLocaleDateString('en-IN') : 'None'} • {bill.category} {bill.recurring && '• 🔁 Recurring'}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                        ₹{bill.amount.toLocaleString()}
                      </span>
                      
                      <span className={`badge ${bill.is_paid ? 'badge-income' : 'badge-expense'}`} style={{ fontSize: 9 }}>
                        {bill.is_paid ? 'PAID' : 'DUE'}
                      </span>

                      <button
                        onClick={() => handleDeleteBill(bill._id)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '6px 8px', borderColor: 'rgba(255,74,74,0.2)', color: '#ff4a4a' }}
                        title="Delete bill"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* ──────── Debt Creation Modal ──────── */}
        {showDebtModal && (
          <div className="modal-overlay" onClick={() => setShowDebtModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 440 }}>
              <div className="modal-header">
                <div className="modal-title">Record Peer Balance</div>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowDebtModal(false)}>✕</button>
              </div>
              
              <form onSubmit={handleAddDebt} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* LENT vs BORROWED toggle */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'var(--bg-primary)', padding: 4, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setDebtType('LENT')}
                    className="btn btn-sm"
                    style={{ 
                      background: debtType === 'LENT' ? '#0891b2' : 'transparent',
                      color: debtType === 'LENT' ? '#ffffff' : 'var(--text-secondary)',
                      borderColor: debtType === 'LENT' ? '#0891b2' : 'transparent'
                    }}
                  >
                    🤝 I Lent Money
                  </button>
                  <button
                    type="button"
                    onClick={() => setDebtType('BORROWED')}
                    className="btn btn-sm"
                    style={{ 
                      background: debtType === 'BORROWED' ? '#e11d48' : 'transparent',
                      color: debtType === 'BORROWED' ? '#ffffff' : 'var(--text-secondary)',
                      borderColor: debtType === 'BORROWED' ? '#e11d48' : 'transparent'
                    }}
                  >
                    💸 I Borrowed
                  </button>
                </div>

                <div className="form-group">
                  <label className="form-label">Person Name</label>
                  <input 
                    type="text" 
                    value={debtPerson} 
                    onChange={e => setDebtPerson(e.target.value)} 
                    placeholder="e.g. Rahul Sharma" 
                    className="form-input" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input 
                    type="number" 
                    value={debtAmount} 
                    onChange={e => setDebtAmount(e.target.value)} 
                    placeholder="e.g. 5000" 
                    className="form-input" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contact WhatsApp</label>
                  <input 
                    type="tel" 
                    value={debtWhatsApp} 
                    onChange={e => setDebtWhatsApp(e.target.value)} 
                    placeholder="e.g. +919999999999" 
                    className="form-input" 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Email</label>
                  <input 
                    type="email" 
                    value={debtEmail} 
                    onChange={e => setDebtEmail(e.target.value)} 
                    placeholder="e.g. name@domain.com" 
                    className="form-input" 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input 
                    type="date" 
                    value={debtDueDate} 
                    onChange={e => setDebtDueDate(e.target.value)} 
                    className="form-input" 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input 
                    type="text" 
                    value={debtNotes} 
                    onChange={e => setDebtNotes(e.target.value)} 
                    placeholder="Additional context (optional)" 
                    className="form-input" 
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: 6 }}>
                  ＋ Save Ledger Entry
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ──────── Bill Creation Modal ──────── */}
        {showBillModal && (
          <div className="modal-overlay" onClick={() => setShowBillModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 400 }}>
              <div className="modal-header">
                <div className="modal-title">Record Upcoming Bill</div>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowBillModal(false)}>✕</button>
              </div>

              <form onSubmit={handleAddBill} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Bill Title</label>
                  <input 
                    type="text" 
                    value={billTitle} 
                    onChange={e => setBillTitle(e.target.value)} 
                    placeholder="e.g. Spotify Premium" 
                    className="form-input" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input 
                    type="number" 
                    value={billAmount} 
                    onChange={e => setBillAmount(e.target.value)} 
                    placeholder="e.g. 149" 
                    className="form-input" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select 
                    value={billCategory} 
                    onChange={e => setBillCategory(e.target.value)} 
                    className="form-select"
                  >
                    <option value="Rent/mortgage">Rent/mortgage</option>
                    <option value="Electricity">Electricity</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Spotify">Spotify</option>
                    <option value="Sip">Sip</option>
                    <option value="Cafeteria">Cafeteria</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input 
                    type="date" 
                    value={billDueDate} 
                    onChange={e => setBillDueDate(e.target.value)} 
                    className="form-input" 
                    required
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input 
                    type="checkbox" 
                    id="billRecurring" 
                    checked={billRecurring} 
                    onChange={e => setBillRecurring(e.target.checked)} 
                  />
                  <label htmlFor="billRecurring" className="form-label" style={{ textTransform: 'none', margin: 0 }}>
                    Recurring Monthly Bill
                  </label>
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: 6 }}>
                  ＋ Schedule Payment Alert
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Toast alerts */}
        {toast && (
          <div className="toast-container">
            <div className={`toast ${toast.type}`}>
              <span>{toast.type === 'success' ? '✅' : '❌'}</span>
              <span>{toast.msg}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';

interface LocalTransaction {
  amount: number;
  category: string;
  timestamp: string;
  source: 'Manual' | 'Imported';
}

const PALETTE = [
  { barBg: '#06b6d4', text: '#0891b2' }, // Cyan
  { barBg: '#10b981', text: '#059669' }, // Emerald
  { barBg: '#d946ef', text: '#c026d3' }, // Fuchsia
  { barBg: '#f59e0b', text: '#d97706' }, // Amber
  { barBg: '#8b5cf6', text: '#6d28d9' }, // Violet
  { barBg: '#f43f5e', text: '#e11d48' }, // Rose
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function LocalStorageAnalyzer() {
  const [transactions, setTransactions] = useState<LocalTransaction[]>([]);
  const [analysis, setAnalysis] = useState<{ [key: string]: number }>({});
  const [totalSpent, setTotalSpent] = useState(0);

  // Filter States for Purging
  const [targetMonth, setTargetMonth] = useState('All');
  const [targetCategory, setTargetCategory] = useState('All');
  const [targetSource, setTargetSource] = useState('All');
  const [confirmText, setConfirmText] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const analyzeLocalStorageData = () => {
    if (typeof window === 'undefined') return;
    const rawData = localStorage.getItem('local_expenses');
    if (!rawData) {
      setTransactions([]);
      setAnalysis({});
      setTotalSpent(0);
      return;
    }

    try {
      const parsedTransactions: LocalTransaction[] = JSON.parse(rawData);
      setTransactions(parsedTransactions);

      const categoryTotals: { [key: string]: number } = {};
      let runningTotal = 0;

      parsedTransactions.forEach((tx) => {
        const amt = Number(tx.amount) || 0;
        const cat = tx.category || 'Miscellaneous';
        
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
        runningTotal += amt;
      });

      setAnalysis(categoryTotals);
      setTotalSpent(runningTotal);
    } catch (error) {
      console.error("Failed to parse statements from local storage:", error);
    }
  };

  const handleSeedMockData = () => {
    const mockData: LocalTransaction[] = [
      { amount: 6500, category: 'Rent/mortgage', timestamp: new Date().toISOString(), source: 'Imported' },
      { amount: 1408, category: 'Cafeteria', timestamp: new Date().toISOString(), source: 'Imported' },
      { amount: 1000, category: 'Groceries', timestamp: new Date().toISOString(), source: 'Imported' },
      { amount: 149, category: 'Spotify', timestamp: new Date().toISOString(), source: 'Imported' },
      { amount: 800, category: 'Auto expenses', timestamp: new Date().toISOString(), source: 'Imported' }
    ];
    localStorage.setItem('local_expenses', JSON.stringify(mockData));
    analyzeLocalStorageData();
  };

  const handleClearLocalData = () => {
    localStorage.removeItem('local_expenses');
    analyzeLocalStorageData();
  };

  const handlePurge = () => {
    if (confirmText !== 'DELETE') return;

    try {
      const remainingTransactions = transactions.filter((tx) => {
        const txDate = new Date(tx.timestamp);
        const txMonthStr = MONTHS[txDate.getMonth()];
        
        const matchesMonth = targetMonth === 'All' || txMonthStr === targetMonth;
        const matchesCategory = targetCategory === 'All' || tx.category === targetCategory;
        const matchesSource = targetSource === 'All' || tx.source === targetSource;

        // Delete if matching all active criteria
        return !(matchesMonth && matchesCategory && matchesSource);
      });

      localStorage.setItem('local_expenses', JSON.stringify(remainingTransactions));
      
      setShowConfirmation(false);
      setConfirmText('');
      analyzeLocalStorageData();
    } catch (err) {
      console.error('Error executing data purge:', err);
    }
  };

  // Get dynamic categories list from current database
  const uniqueCategories = Array.from(new Set(transactions.map(tx => tx.category || 'Miscellaneous')));

  useEffect(() => {
    analyzeLocalStorageData();
  }, []);

  return (
    <div className="card" style={{ marginBottom: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>📊</span>
          <h2 className="chart-title" style={{ fontSize: 16, margin: 0 }}>Local Storage Analysis & Management Workspace</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            onClick={analyzeLocalStorageData}
            className="btn btn-ghost btn-sm"
            title="Refresh from local storage"
          >
            🔄 Sync & Analyze
          </button>
          {totalSpent > 0 && (
            <button 
              onClick={handleClearLocalData}
              className="btn btn-danger btn-sm"
              style={{ padding: '6px 10px', fontSize: 11 }}
            >
              🗑️ Wipe All
            </button>
          )}
        </div>
      </div>

      {totalSpent === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '32px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <div style={{ fontSize: 24 }}>⚠️</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 420, margin: 0 }}>
            No statements or manual records found in local storage. Load spreadsheet targets or log manual transactions to start analysis.
          </p>
          <button className="btn btn-primary btn-sm" onClick={handleSeedMockData}>
            🌱 Load Mock Spreadsheet Targets
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Total Counter Row */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '16px 20px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="form-label" style={{ fontSize: 10, margin: 0 }}>Aggregate Local Spend</p>
              <h3 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4, marginBottom: 0 }}>
                ₹{totalSpent.toLocaleString('en-IN')}
              </h3>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="form-label" style={{ fontSize: 10, margin: 0 }}>Active Records</p>
              <span className="badge badge-seeded" style={{ marginTop: 4, display: 'inline-block' }}>
                {transactions.length} entries
              </span>
            </div>
          </div>

          {/* Grid Layout: Visual Spend Weights (Left) vs Data Purge Module (Right) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Visual Spend Weights */}
            <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 20 }}>
              <p className="form-label" style={{ fontSize: 11, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                🎨 Visual Spend Weights (High Contrast Accent)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {Object.entries(analysis)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount], idx) => {
                    const percentage = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
                    const paletteItem = PALETTE[idx % PALETTE.length];
                    return (
                      <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{category}</span>
                          <span style={{ color: paletteItem.text, fontFamily: 'monospace', fontWeight: 600 }}>
                            ₹{amount.toLocaleString('en-IN')} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        {/* Colorful Tracking Bar */}
                        <div style={{ width: '100%', background: 'var(--bg-secondary)', borderRadius: 100, height: 8, overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              height: '100%', 
                              background: paletteItem.barBg, 
                              borderRadius: 100, 
                              width: `${percentage}%`,
                              transition: 'width 0.5s ease',
                              boxShadow: `0 0 8px ${paletteItem.barBg}33`
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Targeted Data Purge Module */}
            <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p className="form-label" style={{ fontSize: 11, marginBottom: 4, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                🚨 Targeted Scope Purge (Wipe Records)
              </p>
              
              {/* Purge Scope Dropdowns */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 9 }}>Scope by Month</label>
                  <select 
                    value={targetMonth} 
                    onChange={(e) => setTargetMonth(e.target.value)}
                    className="form-select"
                    style={{ fontSize: 12, padding: '8px 10px' }}
                  >
                    <option value="All">All Months</option>
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 9 }}>Scope by Category</label>
                  <select 
                    value={targetCategory} 
                    onChange={(e) => setTargetCategory(e.target.value)}
                    className="form-select"
                    style={{ fontSize: 12, padding: '8px 10px' }}
                  >
                    <option value="All">All Categories</option>
                    {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 9 }}>Scope by Source</label>
                  <select 
                    value={targetSource} 
                    onChange={(e) => setTargetSource(e.target.value)}
                    className="form-select"
                    style={{ fontSize: 12, padding: '8px 10px' }}
                  >
                    <option value="All">All Sources</option>
                    <option value="Manual">Manual UI Entries</option>
                    <option value="Imported">Imported Statements</option>
                  </select>
                </div>
              </div>

              {/* Warning box */}
              <div style={{ padding: 12, background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 'var(--radius-sm)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16 }}>⚠️</span>
                <p style={{ color: 'var(--text-secondary)', fontSize: 11, lineHeight: 1.4, margin: 0 }}>
                  Destructive purge matching: <br />
                  <strong>Month</strong>: {targetMonth} • <strong>Category</strong>: {targetCategory} • <strong>Source</strong>: {targetSource}
                </p>
              </div>

              {/* Confirm trigger buttons */}
              {!showConfirmation ? (
                <button 
                  onClick={() => setShowConfirmation(true)}
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', borderColor: 'rgba(255, 74, 74, 0.4)', color: '#ff4a4a', padding: 8 }}
                >
                  🗑️ Initialize Targeted Purge
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(255, 74, 74, 0.03)', border: '1px solid rgba(255, 74, 74, 0.2)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontSize: 11, color: '#ff4a4a', margin: 0, fontWeight: 600 }}>
                    Type <span style={{ textDecoration: 'underline' }}>DELETE</span> to confirm wipe:
                  </p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input 
                      type="text" 
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="form-input"
                      style={{ fontSize: 12, padding: '6px 10px', flex: 1, textTransform: 'uppercase', color: '#ff4a4a', borderColor: 'rgba(255, 74, 74, 0.4)', background: 'rgba(0,0,0,0.2)' }}
                    />
                    <button 
                      onClick={handlePurge}
                      disabled={confirmText !== 'DELETE'}
                      className="btn btn-danger btn-sm"
                      style={{ padding: '6px 12px' }}
                    >
                      Purge
                    </button>
                    <button 
                      onClick={() => { setShowConfirmation(false); setConfirmText(''); }}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '6px 10px' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

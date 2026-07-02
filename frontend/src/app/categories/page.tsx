'use client';
import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import CategoryChips from '@/components/CategoryChips';
import { api } from '@/lib/api';
import { Category } from '@/types';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
    } else {
      setAuthorized(true);
    }
  }, []);

  const showToast = (msg: string, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    try {
      const data = await api.getCategories();
      if (Array.isArray(data)) setCategories(data);
    } catch {}
  }, []);

  useEffect(() => {
    if (authorized) {
      load();
    }
  }, [load, authorized]);

  if (!authorized) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>Loading...</div>;
  }

  const handleDelete = async (cat: Category) => {
    if (cat.is_default) return showToast('Default categories cannot be deleted', 'error');
    if (!confirm(`Delete "${cat.name}"?`)) return;
    try { await api.deleteCategory(cat._id); showToast('Deleted'); load(); }
    catch { showToast('Failed', 'error'); }
  };

  const defaults  = categories.filter(c => c.is_default);
  const customs   = categories.filter(c => !c.is_default);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1>Categories</h1>
          <p>Manage your expense categories — default ones come from your spreadsheet</p>
        </div>

        {/* Add custom */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="chart-title">Add a Custom Category</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className={`btn btn-sm ${activeTab === 'EXPENSE' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('EXPENSE')}
              >💸 Expense</button>
              <button
                className={`btn btn-sm ${activeTab === 'INCOME' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('INCOME')}
              >💚 Income</button>
            </div>
          </div>
          <CategoryChips selectedCategory="" onSelect={() => {}} type={activeTab} />
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Click "+ Custom" inside the corresponding tab to add a category of that type.</p>
        </div>

        {/* Default categories */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="chart-title" style={{ marginBottom: 16 }}>📋 Default Categories ({defaults.length})</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Icon</th><th>Name</th><th>Color</th><th>Type</th><th>Source</th></tr></thead>
              <tbody>
                {defaults.map(cat => (
                  <tr key={cat._id}>
                    <td style={{ fontSize: 22 }}>{cat.icon}</td>
                    <td style={{ fontWeight: 500 }}>{cat.name}</td>
                    <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 16, height: 16, borderRadius: 4, background: cat.color, display: 'inline-block' }} />{cat.color}</span></td>
                    <td><span className={`badge badge-${(cat.type || 'EXPENSE').toLowerCase()}`}>{cat.type || 'EXPENSE'}</span></td>
                    <td><span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)' }}>Default</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Custom categories */}
        {customs.length > 0 && (
          <div className="card">
            <div className="chart-title" style={{ marginBottom: 16 }}>✨ Custom Categories ({customs.length})</div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Icon</th><th>Name</th><th>Color</th><th>Type</th><th></th></tr></thead>
                <tbody>
                  {customs.map(cat => (
                    <tr key={cat._id}>
                      <td style={{ fontSize: 22 }}>{cat.icon}</td>
                      <td style={{ fontWeight: 500 }}>{cat.name}</td>
                      <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 16, height: 16, borderRadius: 4, background: cat.color, display: 'inline-block' }} />{cat.color}</span></td>
                      <td><span className={`badge badge-${(cat.type || 'EXPENSE').toLowerCase()}`}>{cat.type || 'EXPENSE'}</span></td>
                      <td><button className="btn btn-danger btn-sm" onClick={() => handleDelete(cat)}>🗑️ Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {toast && (
          <div className="toast-container">
            <div className={`toast ${toast.type}`}>{toast.type === 'success' ? '✅' : '❌'} {toast.msg}</div>
          </div>
        )}
      </main>
    </div>
  );
}

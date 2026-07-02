'use client';
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { MonthlySummary, YearlyData, TrendPoint } from '@/types';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLORS  = ['#ffffff', '#f5f5f5', '#e5e5e5', '#d4d4d4', '#a3a3a3', '#737373', '#525252', '#404040', '#262626', '#171717', '#efefef', '#cfcfcf', '#8f8f8f'];
const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export default function AnalyticsPage() {
  const now = new Date();
  const [year,  setYear]    = useState(now.getFullYear());
  const [month, setMonth]   = useState(now.getMonth() + 1);
  const [monthly, setMonthly] = useState<MonthlySummary | null>(null);
  const [yearly,  setYearly]  = useState<YearlyData | null>(null);
  const [trends,  setTrends]  = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
    } else {
      setAuthorized(true);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, y, t] = await Promise.all([
        api.getMonthlyAnalytics(year, month),
        api.getYearlyAnalytics(year),
        api.getTrends(),
      ]);
      setMonthly(m);
      setYearly(y);
      setTrends(Array.isArray(t) ? t : []);
    } catch {}
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    if (authorized) {
      load();
    }
  }, [load, authorized]);

  const currentBaseline = monthly?.baseline ?? 0;

  const yearlyBarData = yearly?.monthly.map(m => ({
    name: MONTHS[m.month - 1],
    total: m.total,
    budget: currentBaseline,
  })) || [];

  const trendData = trends.map(t => ({
    name: `${MONTHS[t.month-1]}'${String(t.year).slice(2)}`,
    total: t.total,
    budget: currentBaseline,
  }));

  const savingsRate = monthly ? parseFloat(String(monthly.savingsRate)) : 0;

  if (!authorized) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>Loading...</div>;
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Analytics</h1>
            <p>Deep insights into your spending patterns</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <select className="form-select" value={month} onChange={e => setMonth(parseInt(e.target.value))} style={{ width: 130 }}>
              {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
            </select>
            <select className="form-select" value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ width: 90 }}>
              {[2026,2027,2028,2029].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>}

        {/* Savings Rate Hero */}
        {monthly && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Budget', value: fmt(monthly.baseline),   color: 'var(--text-primary)', gradient: 'linear-gradient(135deg, #ffffff 0%, #a3a3a3 100%)' },
              { label: 'Spent',  value: fmt(monthly.totalSpent), color: 'var(--text-primary)', gradient: 'linear-gradient(135deg, #737373 0%, #262626 100%)' },
              { label: 'Saved',  value: fmt(monthly.totalSaved), color: 'var(--text-primary)', gradient: 'linear-gradient(135deg, #a3a3a3 0%, #525252 100%)' },
              { label: 'Savings Rate', value: `${savingsRate}%`,  color: 'var(--text-primary)', gradient: 'linear-gradient(135deg, #ffffff 0%, #525252 100%)' },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ '--accent-gradient': s.gradient } as React.CSSProperties}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color, fontSize: 22 }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        <div className="charts-grid" style={{ marginBottom: 24 }}>
          {/* Monthly Category Donut */}
          <div className="chart-card">
            <div className="chart-title">Monthly Category Split</div>
            <div className="chart-subtitle">{MONTHS[month-1]} {year}</div>
            {monthly?.byCategory && monthly.byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={monthly.byCategory} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={95} innerRadius={50} paddingAngle={2}>
                    {monthly.byCategory.map((_, i) => <Cell key={i} fill={`var(--chart-color-${(i % 8) + 1})`} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => typeof v === 'number' ? fmt(v) : v}
                    contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8 }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                    labelStyle={{ color: 'var(--text-primary)' }}
                  />
                  <Legend formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div style={{ height: 260, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)' }}>No data</div>}
          </div>

          {/* 6-month trend vs budget */}
          <div className="chart-card">
            <div className="chart-title">Spending vs Budget Trend</div>
            <div className="chart-subtitle">Last 6 months</div>
            <ResponsiveContainer width="100%" height={260}>
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
                <Line type="monotone" dataKey="total" stroke="var(--text-primary)" strokeWidth={2.5} dot={{ fill: 'var(--text-primary)', r: 4 }} name="Spent" />
                <Line type="monotone" dataKey="budget" stroke="var(--text-secondary)" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Budget" />
                <Legend formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{v}</span>} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Yearly bar chart */}
        <div className="chart-card" style={{ marginBottom: 24 }}>
          <div className="chart-title">Year Overview — Monthly Spending</div>
          <div className="chart-subtitle">{year} — all months</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={yearlyBarData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: any) => typeof v === 'number' ? fmt(v) : v}
                contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8 }}
                itemStyle={{ color: 'var(--text-primary)' }}
                labelStyle={{ color: 'var(--text-primary)' }}
              />
              <Bar dataKey="total" fill="var(--text-primary)" radius={[4,4,0,0]} name="Spent" />
              <Bar dataKey="budget" fill="var(--chart-budget)" radius={[4,4,0,0]} name="Budget" />
              <Legend formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{v}</span>} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category breakdown table */}
        {monthly?.byCategory && monthly.byCategory.length > 0 && (
          <div className="card">
            <div className="chart-title" style={{ marginBottom: 16 }}>Detailed Category Breakdown</div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Category</th><th>Transactions</th><th>Spent</th><th>% of Budget</th><th>Status</th></tr></thead>
                <tbody>
                  {monthly.byCategory.map((c, i) => {
                    const pct = currentBaseline > 0 ? (c.total / currentBaseline) * 100 : 0;
                    return (
                      <tr key={c.category}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i+1}</td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: `var(--chart-color-${(i % 8) + 1})`, display: 'inline-block' }} />
                            {c.category}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{c.count}</td>
                        <td style={{ fontWeight: 700 }}>{fmt(c.total)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ flex: 1, height: 6, background: 'var(--bg-card-hover)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: '#ffffff', borderRadius: 3, transition: 'width 0.5s ease' }} />
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 40 }}>{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td>
                          <span className="badge" style={{ background: pct > 100 ? 'rgba(255,255,255,0.15)' : pct > 80 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.15)' }}>
                            {pct > 100 ? 'Over' : pct > 80 ? 'Warning' : 'OK'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

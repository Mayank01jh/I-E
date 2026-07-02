const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const getHeaders = (extraHeaders: Record<string, string> = {}): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const auth: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
  return {
    ...auth,
    ...extraHeaders
  };
};

// Helper fetch wrapper to handle HTTP error codes gracefully
const safeFetch = (url: string, options: RequestInit = {}) => {
  return fetch(url, {
    ...options,
    headers: getHeaders(options.headers as Record<string, string>)
  }).then(r => {
    if (!r.ok) {
      if (r.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
      }
      return r.json().then(err => { throw new Error(err.detail || 'Request failed') });
    }
    return r.json();
  });
};

export const api = {
  // Auth
  login: (data: object) =>
    safeFetch(`${BASE}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    }),
  register: (data: object) =>
    safeFetch(`${BASE}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    }),
  getMe: () =>
    safeFetch(`${BASE}/api/auth/me`),

  // Transactions
  getTransactions: (params?: Record<string, string | number>) => {
    const q = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return safeFetch(`${BASE}/api/transactions${q}`);
  },
  createTransaction: (data: object) =>
    safeFetch(`${BASE}/api/transactions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    }),
  updateTransaction: (id: string, data: object) =>
    safeFetch(`${BASE}/api/transactions/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    }),
  deleteTransaction: (id: string) =>
    safeFetch(`${BASE}/api/transactions/${id}`, { method: 'DELETE' }),
  purgeMonth: (year: number, monthName: string) =>
    safeFetch(`${BASE}/api/transactions/purge-month?year=${year}&month_name=${monthName}`, {
      method: 'DELETE'
    }),

  // Categories
  getCategories: (params?: Record<string, string | number>) => {
    const q = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return safeFetch(`${BASE}/api/categories${q}`);
  },
  createCategory: (data: object) =>
    safeFetch(`${BASE}/api/categories`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    }),
  deleteCategory: (id: string) =>
    safeFetch(`${BASE}/api/categories/${id}`, { method: 'DELETE' }),

  // Analytics
  getMonthlyAnalytics: (year: number, month: number) =>
    safeFetch(`${BASE}/api/analytics/monthly?year=${year}&month=${month}`),
  getYearlyAnalytics: (year: number) =>
    safeFetch(`${BASE}/api/analytics/yearly?year=${year}`),
  getTrends: () => safeFetch(`${BASE}/api/analytics/trends`),
  getSavingsRate: (year: number, month: number) =>
    safeFetch(`${BASE}/api/analytics/savings-rate?year=${year}&month=${month}`),

  // Budget
  getBudget: (year: number, month: number) =>
    safeFetch(`${BASE}/api/budget/${year}/${month}`),
  updateBudget: (year: number, month: number, data: object) =>
    safeFetch(`${BASE}/api/budget/${year}/${month}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    }),

  // Seed
  seedData: () =>
    safeFetch(`${BASE}/api/seed/run`, { method: 'POST' }),
  seedStatus: () => safeFetch(`${BASE}/api/seed/status`),

  // Debts
  getDebts: () => safeFetch(`${BASE}/api/debts`),
  createDebt: (data: object) =>
    safeFetch(`${BASE}/api/debts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    }),
  settleDebt: (id: string) =>
    safeFetch(`${BASE}/api/debts/${id}/settle`, { method: 'PUT' }),
  deleteDebt: (id: string) =>
    safeFetch(`${BASE}/api/debts/${id}`, { method: 'DELETE' }),
  sendDebtReminder: (id: string) =>
    safeFetch(`${BASE}/api/debts/remind/${id}`, { method: 'POST' }),

  // Bills
  getBills: () => safeFetch(`${BASE}/api/bills`),
  createBill: (data: object) =>
    safeFetch(`${BASE}/api/bills`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    }),
  payBill: (id: string) =>
    safeFetch(`${BASE}/api/bills/${id}/pay`, { method: 'PUT' }),
  deleteBill: (id: string) =>
    safeFetch(`${BASE}/api/bills/${id}`, { method: 'DELETE' }),

  // Budget threshold alerts
  checkBudgetAlerts: () => safeFetch(`${BASE}/api/analytics/check-budget`),
};

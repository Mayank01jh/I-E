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
  sendBillReminder: (id: string) =>
    safeFetch(`${BASE}/api/bills/remind/${id}`, { method: 'POST' }),

  // Profile Settings
  updateProfile: (data: { email?: string; whatsapp?: string }) =>
    safeFetch(`${BASE}/api/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  // Savings Goals
  getGoals: () => safeFetch(`${BASE}/api/goals`),
  createGoal: (data: { title: string; target_amount: number; current_amount?: number; target_date?: string; category?: string }) =>
    safeFetch(`${BASE}/api/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  deleteGoal: (id: string) =>
    safeFetch(`${BASE}/api/goals/${id}`, { method: 'DELETE' }),
  contributeToGoal: (id: string, amount: number) =>
    safeFetch(`${BASE}/api/goals/${id}/contribute`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    }),

  // File Upload
  uploadSpreadsheet: (formData: FormData) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const authHeaders: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
    // Note: Do not specify Content-Type because browser automatically sets boundary for FormData
    return fetch(`${BASE}/api/seed/upload`, {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    }).then(r => {
      if (!r.ok) {
        return r.json().then(err => { throw new Error(err.detail || 'Upload failed') });
      }
      return r.json();
    });
  },

  // Export Transactions (via Fetch + Blob download)
  exportTransactions: async (params?: Record<string, string | number>) => {
    const q = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const authHeaders: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
    const response = await fetch(`${BASE}/api/transactions/export${q}`, {
      headers: authHeaders,
    });
    if (!response.ok) {
      throw new Error('Export failed');
    }
    return response.blob();
  },

  // Budget threshold alerts
  checkBudgetAlerts: () => safeFetch(`${BASE}/api/analytics/check-budget`),
};


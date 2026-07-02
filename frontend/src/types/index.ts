export interface Transaction {
  _id: string;
  amount: number;
  category: string;
  type: 'EXPENSE' | 'INCOME';
  date: string;
  year: number;
  month: number;
  day: number;
  notes: string;
  source: 'manual' | 'seeded';
  createdAt: string;
}

export interface Category {
  _id: string;
  name: string;
  icon: string;
  color: string;
  is_default: boolean;
  type?: 'EXPENSE' | 'INCOME';
}

export interface MonthlySummary {
  year: number | null;
  month: number | null;
  baseline: number;
  totalSpent: number;
  totalSaved: number;
  savingsRate: string;
  byCategory: { category: string; total: number; count: number; color?: string }[];
}

export interface YearlyData {
  year: number;
  monthly: {
    month: number;
    total: number;
    categories: Record<string, number>;
  }[];
}

export interface TrendPoint {
  year: number;
  month: number;
  total: number;
}

export interface DebtRecord {
  _id: string;
  person_name: string;
  contact_email: string;
  contact_whatsapp: string;
  amount: number;
  type: 'LENT' | 'BORROWED';
  due_date: string;
  is_settled: boolean;
  notes: string;
  created_at: string;
}

export interface UpcomingBill {
  _id: string;
  title: string;
  amount: number;
  category: string;
  due_date: string;
  is_paid: boolean;
  recurring: boolean;
}

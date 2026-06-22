export type CategoryName =
  | 'Food & Dining'
  | 'Shopping'
  | 'Transport'
  | 'Utilities'
  | 'Entertainment'
  | 'Healthcare'
  | 'Groceries'
  | 'Transfers'
  | 'Subscriptions'
  | 'Other';

export interface CategoryInfo {
  name: CategoryName;
  icon: string;
  color: string;
}

export type PaymentMethod = 'UPI' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'NETBANKING' | 'UNKNOWN';

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  merchant_name: string;
  merchant_raw: string;
  category: CategoryName;
  payment_method: PaymentMethod;
  transaction_ref: string | null;
  transaction_at: string; // ISO 8601 string
  email_received_at: string;
  llm_confidence: number;
  is_verified: boolean;
  notes?: string;
}

export interface EmailLog {
  id: string;
  subject: string;
  sender: string;
  received_at: string;
  body: string;
  status: 'pending' | 'classified_yes' | 'classified_no' | 'parsed' | 'failed' | 'duplicate';
  score: number;
  parsed_transaction_id?: string;
  error_message?: string;
}

export interface AnalyticsSummary {
  totalSpent: number;
  transactionCount: number;
  averageTransaction: number;
  categorySpent: { category: CategoryName; amount: number; count: number; color: string; icon: string }[];
  merchantSpent: { merchant: string; amount: number; count: number }[];
  dailySpent: { date: string; amount: number }[]; // formatted YYYY-MM-DD
  paymentMethodSpent: { method: PaymentMethod; amount: number; count: number }[];
}

export const CATEGORIES: Record<CategoryName, CategoryInfo> = {
  'Food & Dining': { name: 'Food & Dining', icon: '🍽️', color: '#FF6B6B' },
  'Shopping': { name: 'Shopping', icon: '🛍️', color: '#4ECDC4' },
  'Transport': { name: 'Transport', icon: '🚗', color: '#45B7D1' },
  'Utilities': { name: 'Utilities', icon: '💡', color: '#96CEB4' },
  'Entertainment': { name: 'Entertainment', icon: '🎬', color: '#FECA57' },
  'Healthcare': { name: 'Healthcare', icon: '🏥', color: '#FF9FF3' },
  'Groceries': { name: 'Groceries', icon: '🛒', color: '#54A0FF' },
  'Transfers': { name: 'Transfers', icon: '💸', color: '#5F27CD' },
  'Subscriptions': { name: 'Subscriptions', icon: '📅', color: '#00D2D3' },
  'Other': { name: 'Other', icon: '🏷️', color: '#CCCCCC' },
};
export const CATEGORY_LIST = Object.values(CATEGORIES);

export type TxType = "income" | "expense" | "savings";
export type CategoryKind = "income" | "expense" | "savings" | "trading";
export type EssentialLevel = "essential" | "non_essential" | "review";
export type TradingStatus = "active" | "passed" | "funded" | "failed" | "closed";
export type InvestmentKind = "stocks" | "crypto" | "real_estate" | "fund" | "other";
export type Frequency = "weekly" | "monthly" | "yearly";
export type OcrStatus = "pending" | "processing" | "done" | "failed" | "skipped";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  currency: string;
  monthly_salary: number;
  salary_day: number;
  monthly_savings_target: number;
  investment_target: number;
  max_spending: number;
  emergency_fund_target: number;
  theme: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  kind: CategoryKind;
  is_default: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  type: TxType;
  amount: number;
  currency: string;
  description: string;
  merchant: string | null;
  payment_method: string | null;
  occurred_on: string;
  is_recurring: boolean;
  recurring_payment_id: string | null;
  note: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
  category?: Category | null;
}

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  category_id: string | null;
  amount: number;
  billing_day: number;
  active: boolean;
  essential_level: EssentialLevel;
  note: string | null;
  created_at: string;
  category?: Category | null;
}

export interface TradingAccount {
  id: string;
  user_id: string;
  provider: string;
  account_size: number | null;
  cost: number;
  purchase_date: string;
  status: TradingStatus;
  note: string | null;
  created_at: string;
}

export interface TradingPayout {
  id: string;
  user_id: string;
  trading_account_id: string | null;
  provider: string;
  amount: number;
  paid_on: string;
  note: string | null;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number;
  target_date: string | null;
  created_at: string;
}

export interface Investment {
  id: string;
  user_id: string;
  name: string;
  kind: InvestmentKind;
  amount_invested: number;
  current_value: number;
  purchase_date: string;
  note: string | null;
  created_at: string;
}

export interface RecurringPayment {
  id: string;
  user_id: string;
  name: string;
  category_id: string | null;
  amount: number;
  frequency: Frequency;
  next_due_date: string;
  active: boolean;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
}

export interface Receipt {
  id: string;
  user_id: string;
  transaction_id: string | null;
  storage_path: string;
  ocr_status: OcrStatus;
  ocr_merchant: string | null;
  ocr_amount: number | null;
  ocr_date: string | null;
  ocr_raw_text: string | null;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  monthly_amount: number;
  created_at: string;
}

export const DEFAULT_CATEGORIES: Array<{ name: string; icon: string; color: string; kind: CategoryKind }> = [
  { name: "אוכל", icon: "🍔", color: "#F2B84B", kind: "expense" },
  { name: "קפה", icon: "☕", color: "#E2856E", kind: "expense" },
  { name: "בילויים", icon: "🍻", color: "#8F7CF0", kind: "expense" },
  { name: "רכב", icon: "🚗", color: "#6FCF97", kind: "expense" },
  { name: "דלק", icon: "⛽", color: "#F29E4C", kind: "expense" },
  { name: "מנויים", icon: "📱", color: "#5AA9E6", kind: "expense" },
  { name: "בריאות", icon: "💊", color: "#66D9E8", kind: "expense" },
  { name: "קניות", icon: "🛍️", color: "#C97BE0", kind: "expense" },
  { name: "מסחר - חשבונות", icon: "📊", color: "#4C8DFF", kind: "trading" },
  { name: "מסחר - כלים", icon: "🖥️", color: "#39C7C7", kind: "trading" },
  { name: "השקעות", icon: "📈", color: "#3ECF8E", kind: "savings" },
  { name: "חיסכון", icon: "💰", color: "#3ECF8E", kind: "savings" },
  { name: "קרן חירום", icon: "🛟", color: "#B197FC", kind: "savings" },
  { name: "הכנסה", icon: "💵", color: "#3ECF8E", kind: "income" },
  { name: "אחר", icon: "📎", color: "#8CE99A", kind: "expense" },
];

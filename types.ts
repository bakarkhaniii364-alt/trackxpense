
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER'
}

export enum Category {
  // Income specific
  LOAN = 'Loan',
  GIG = 'Gig',
  TUITION = 'Tuition',
  SALARY = 'Salary',
  
  // Expense specific
  BREAKFAST = 'Breakfast',
  LUNCH = 'Lunch',
  DINNER = 'Dinner',
  FOODPANDA = 'Foodpanda',
  SNACKS = 'Snacks',
  LOAN_PAYMENT = 'Loan Payment',
  TRANSPORT = 'Transportation',
  SHOPPING = 'Shopping',
  BILLS = 'Bills & Utilities',
  ENTERTAINMENT = 'Entertainment',
  HEALTH = 'Health & Fitness',
  
  // System
  TRANSFER = 'Transfer',
  OTHER = 'Other'
}

export interface CategoryItem {
  id: string;
  name: string;
  type: TransactionType;
  color?: string;
  icon?: string;
  isSystem?: boolean;
}

export interface NetWorthSnapshot {
  date: string; // ISO date (YYYY-MM-DD)
  amount: number;
}

export interface TransactionTemplate {
  id: string;
  name: string;
  amount: number;
  type: TransactionType;
  category: string;
  note?: string;
  updated_at?: string;
}

export interface DebtPayment {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface Streak {
  current: number;
  max: number;
  lastUpdate: string; // ISO date
}

export interface RecurringRule {
  id: string;
  name: string;
  amount: number;
  type: TransactionType;
  category: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  nextDueDate: string; // ISO date
  walletId: string;
  note?: string;
  isActive: boolean;
  updated_at?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string; // ISO string
  note?: string;
  walletId: string;
  isPrivate?: boolean; // New: Platinum Feature
  isSubscription?: boolean; // New: Platinum Feature
  splits?: { category: string, amount: number, note?: string }[]; // New: Split Transactions
  updated_at?: string;
}

export type WalletType = 'STANDARD' | 'GOAL';

export interface Wallet {
  id: string;
  name: string;
  type: WalletType;
  targetAmount?: number;
  currency?: string; // New: Multi-currency support
  color?: ThemeOption;
  stealthMode?: boolean;
  updated_at?: string;
}

export interface Debt {
  id: string;
  person: string;
  amount: number;
  type: 'I_OWE' | 'OWES_ME';
  note?: string;
  dueDate?: string;
  isSettled: boolean;
  payments?: DebtPayment[]; // New: Partial payments
  updated_at?: string;
}

export type ThemeOption = 'indigo' | 'emerald' | 'rose' | 'amber' | 'blue';

export interface BudgetConfig {
  limit: number;
  period: 'DAILY' | 'MONTHLY';
}

export interface UserSettings {
  theme: ThemeOption;
  darkMode: boolean;
  notificationsEnabled: boolean;
  expenseReminders: boolean; 
  debtReminders: boolean; 
  privacyMode: boolean;
  lastOpened: string;
  currencySymbol: string; 
  budgetLimits: Record<string, BudgetConfig>; // Category -> Config
  hasOnboarded: boolean; 
  
  // Platinum Polish Features
  vaultPasscode?: string;
  isVaultLocked?: boolean;
  stealthModeEnabled?: boolean;
  stealthHotkey?: string;
  hapticsEnabled?: boolean;
  groqApiKey?: string;
  enableAiParsing?: boolean;
}

export interface UserProfile {
  name: string;
  monthlyGoal: number; // General spending limit
  dailyGoal: number; // Daily spending limit
  isPremium?: boolean; // Revenue Phase
}

export interface Provision {
  id: string;
  name: string;
  amount: number;
  date: string;
  updated_at?: string;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingCount: number;
  isOnline: boolean;
}

export interface AppData {
  wallets: Wallet[];
  transactions: Transaction[];
  debts: Debt[];
  categories: CategoryItem[];
  currentWalletId: string;
  settings: UserSettings;
  profile: UserProfile;
  provisions: Provision[]; // New: Platinum Feature
  lastUsedCategoryMap: Record<string, string>; // New: Platinum Feature
  balanceHistory: NetWorthSnapshot[]; // New: Historical net worth
  templates: TransactionTemplate[]; // New: Quick-add templates
  streaks: Record<string, Streak>; // New: Spending streaks
  recurringRules: RecurringRule[]; // New: Automated engine
}

export type ViewState = 'dashboard' | 'history' | 'debts' | 'analytics' | 'identity' | 'control' | 'provisions' | 'subscriptions' | 'menu';


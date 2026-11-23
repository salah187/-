export type DebtDirection = 'lent' | 'borrowed';

export type DebtStatus = 'unpaid' | 'partial' | 'paid';

export type ThemeMode = 'light' | 'dark';

export type MainTab = 'dashboard' | 'people' | 'add' | 'reports' | 'settings';

export type PersonFilterStatus = 'all' | 'unpaid' | 'partial' | 'paid' | 'overdue';

export type PersonFilterDirection = 'all' | 'lent' | 'borrowed';

export type PersonSortBy = 'largest_debt' | 'recent' | 'name';

export interface Person {
  id: string;
  name: string;
  phone?: string;
  avatarDataUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DebtRecord {
  id: string;
  personId: string;
  direction: DebtDirection;
  amount: number;
  date: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  debtId: string;
  personId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
}

export interface DebtComputed extends DebtRecord {
  paidAmount: number;
  remainingAmount: number;
  status: DebtStatus;
  isOverdue: boolean;
}

export interface PersonSummary {
  person: Person;
  lentOriginal: number;
  lentPaid: number;
  lentRemaining: number;
  borrowedOriginal: number;
  borrowedPaid: number;
  borrowedRemaining: number;
  totalOriginal: number;
  totalPaid: number;
  totalRemaining: number;
  netBalance: number; // positive = owed to me, negative = I owe them
  status: DebtStatus;
  hasOverdue: boolean;
  overdueCount: number;
  activeDebtCount: number;
  totalDebtCount: number;
  lastActivityDate: string;
}

export interface OperationItem {
  id: string;
  kind: 'debt' | 'payment';
  direction: DebtDirection;
  personId: string;
  personName: string;
  personAvatar?: string;
  debtId: string;
  amount: number;
  date: string;
  createdAt: string;
  notes?: string;
}

export interface DashboardMetrics {
  totalLent: number;
  totalLentRepaid: number;
  totalLentRemaining: number;
  totalBorrowed: number;
  totalBorrowedRepaid: number;
  totalBorrowedRemaining: number;
  totalRepaid: number;
  totalRemaining: number;
  peopleWithDebtsCount: number;
  overdueDebtsCount: number;
  recentOperations: OperationItem[];
}

export interface AppSettings {
  theme: ThemeMode;
  currency: 'DZD';
}

export interface BackupPayload {
  app: 'Dayni';
  version: number;
  exportedAt: string;
  people: Person[];
  debts: DebtRecord[];
  payments: PaymentRecord[];
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

export type PinLength = 4 | 6;

export interface LockConfig {
  enabled: boolean;
  pinLength: PinLength;
  pinHash: string;
  pinSalt: string;
  biometricEnabled: boolean;
  biometricCredentialId?: string;
  autoLockIdleMinutes: number; // 5 by default, 0 = disabled
  failedAttempts: number;
  lockedUntil?: number; // epoch ms
}


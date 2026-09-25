export const INTERVAL_UNITS = ["Day", "Week", "Month", "Year"] as const;
export type IntervalUnit = (typeof INTERVAL_UNITS)[number];

export interface LookupItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  intervalUnit: IntervalUnit;
  intervalValue: number;
  startDate: string | null;
  nextDueDate: string | null;
  comment: string | null;
  active: boolean;
  categoryId: string;
  accountId: string;
  paymentMethodId: string;
  category: LookupItem;
  account: LookupItem;
  paymentMethod: LookupItem;
  monthlyAmount: number;
  yearlyAmount: number;
  computedNextDueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringExpenseInput {
  name: string;
  amount: number;
  intervalUnit: IntervalUnit;
  intervalValue: number;
  startDate: string | null;
  nextDueDate: string | null;
  comment: string | null;
  active: boolean;
  categoryId: string;
  accountId: string;
  paymentMethodId: string;
}

export interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  intervalUnit: IntervalUnit;
  intervalValue: number;
  active: boolean;
  monthlyAmount: number;
  yearlyAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeSourceInput {
  name: string;
  amount: number;
  intervalUnit: IntervalUnit;
  intervalValue: number;
  active: boolean;
}

export interface DashboardBreakdown {
  id: string;
  name: string;
  monthlyAmount: number;
  yearlyAmount: number;
}

export interface DashboardUpcomingItem {
  id: string;
  name: string;
  amount: number;
  intervalUnit: IntervalUnit;
  intervalValue: number;
  category: string;
  account: string;
  paymentMethod: string;
  nextDueDate: string | null;
}

export interface DashboardData {
  totalMonthlyIncome: number;
  totalYearlyIncome: number;
  totalMonthlyExpenses: number;
  totalYearlyExpenses: number;
  remainderMonthly: number;
  remainderYearly: number;
  byCategory: DashboardBreakdown[];
  byAccount: DashboardBreakdown[];
  byPaymentMethod: DashboardBreakdown[];
  upcoming: DashboardUpcomingItem[];
}

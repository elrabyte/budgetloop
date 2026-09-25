import type { FastifyInstance } from "fastify";
import { prisma } from "../prisma.js";
import { computeNextDueDate, toMonthlyAmount, toYearlyAmount, type IntervalUnit } from "../domain/recurrence.js";

interface Breakdown {
  id: string;
  name: string;
  monthlyAmount: number;
  yearlyAmount: number;
}

/**
 * GET /api/dashboard
 *
 * Replaces the spreadsheet's "Übersicht" (Overview) sheet: net income, total costs, remainder,
 * breakdowns by category / account ("bucket": bills vs. invest) / payment method, and an upcoming
 * items list sorted by computed next-due-date. Everything here is derived on the fly from
 * amount + interval - no precomputed monthly/yearly equivalents are persisted anywhere.
 */
export function registerDashboardRoutes(app: FastifyInstance): void {
  app.get("/api/dashboard", async () => {
    const [expenses, incomeSources] = await Promise.all([
      prisma.recurringExpense.findMany({
        where: { active: true },
        include: { category: true, account: true, paymentMethod: true },
      }),
      prisma.incomeSource.findMany({ where: { active: true } }),
    ]);

    const totalMonthlyIncome = sum(
      incomeSources.map((income) =>
        toMonthlyAmount({
          amount: income.amount,
          intervalUnit: income.intervalUnit as IntervalUnit,
          intervalValue: income.intervalValue,
        }),
      ),
    );

    const expenseMonthlyAmounts = expenses.map((expense) => ({
      expense,
      monthlyAmount: toMonthlyAmount({
        amount: expense.amount,
        intervalUnit: expense.intervalUnit as IntervalUnit,
        intervalValue: expense.intervalValue,
      }),
    }));

    const totalMonthlyExpenses = sum(expenseMonthlyAmounts.map((e) => e.monthlyAmount));

    const byCategory = groupBy(expenseMonthlyAmounts, (e) => e.expense.category);
    const byAccount = groupBy(expenseMonthlyAmounts, (e) => e.expense.account);
    const byPaymentMethod = groupBy(expenseMonthlyAmounts, (e) => e.expense.paymentMethod);

    const upcoming = expenses
      .map((expense) => {
        const nextDueDate = computeNextDueDate({
          startDate: expense.startDate,
          nextDueDate: expense.nextDueDate,
          intervalUnit: expense.intervalUnit as IntervalUnit,
          intervalValue: expense.intervalValue,
        });
        return {
          id: expense.id,
          name: expense.name,
          amount: expense.amount,
          intervalUnit: expense.intervalUnit,
          intervalValue: expense.intervalValue,
          category: expense.category.name,
          account: expense.account.name,
          paymentMethod: expense.paymentMethod.name,
          nextDueDate,
        };
      })
      .filter((item) => item.nextDueDate !== null)
      .sort((a, b) => a.nextDueDate!.getTime() - b.nextDueDate!.getTime())
      .slice(0, 20);

    const totalMonthlyIncomeRounded = round2(totalMonthlyIncome);
    const totalMonthlyExpensesRounded = round2(totalMonthlyExpenses);

    return {
      totalMonthlyIncome: totalMonthlyIncomeRounded,
      totalYearlyIncome: round2(totalMonthlyIncome * 12),
      totalMonthlyExpenses: totalMonthlyExpensesRounded,
      totalYearlyExpenses: round2(totalMonthlyExpenses * 12),
      remainderMonthly: round2(totalMonthlyIncome - totalMonthlyExpenses),
      remainderYearly: round2((totalMonthlyIncome - totalMonthlyExpenses) * 12),
      byCategory,
      byAccount,
      byPaymentMethod,
      upcoming,
    };
  });
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function groupBy<T extends { monthlyAmount: number }>(
  items: T[],
  keySelector: (item: T) => { id: string; name: string },
): Breakdown[] {
  const groups = new Map<string, Breakdown>();
  for (const item of items) {
    const key = keySelector(item);
    const existing = groups.get(key.id);
    if (existing) {
      existing.monthlyAmount += item.monthlyAmount;
    } else {
      groups.set(key.id, { id: key.id, name: key.name, monthlyAmount: item.monthlyAmount, yearlyAmount: 0 });
    }
  }
  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      monthlyAmount: round2(group.monthlyAmount),
      yearlyAmount: round2(group.monthlyAmount * 12),
    }))
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount);
}

// Re-export for potential reuse/tests.
export { toMonthlyAmount, toYearlyAmount };

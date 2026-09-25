import { api } from "./client";
import type { RecurringExpense, RecurringExpenseInput } from "../types";

export const recurringExpensesApi = {
  list: () => api.get<RecurringExpense[]>("/recurring-expenses"),
  create: (data: RecurringExpenseInput) => api.post<RecurringExpense>("/recurring-expenses", data),
  update: (id: string, data: RecurringExpenseInput) => api.put<RecurringExpense>(`/recurring-expenses/${id}`, data),
  remove: (id: string) => api.delete(`/recurring-expenses/${id}`),
};

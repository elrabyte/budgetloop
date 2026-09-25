import { api } from "./client";
import type { IncomeSource, IncomeSourceInput } from "../types";

export const incomeSourcesApi = {
  list: () => api.get<IncomeSource[]>("/income-sources"),
  create: (data: IncomeSourceInput) => api.post<IncomeSource>("/income-sources", data),
  update: (id: string, data: IncomeSourceInput) => api.put<IncomeSource>(`/income-sources/${id}`, data),
  remove: (id: string) => api.delete(`/income-sources/${id}`),
};

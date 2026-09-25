import { api } from "./client";
import type { LookupItem } from "../types";

export interface LookupApi {
  list(): Promise<LookupItem[]>;
  create(name: string): Promise<LookupItem>;
  update(id: string, name: string): Promise<LookupItem>;
  remove(id: string): Promise<void>;
}

function createLookupApi(path: string): LookupApi {
  return {
    list: () => api.get<LookupItem[]>(`/${path}`),
    create: (name: string) => api.post<LookupItem>(`/${path}`, { name }),
    update: (id: string, name: string) => api.put<LookupItem>(`/${path}/${id}`, { name }),
    remove: (id: string) => api.delete(`/${path}/${id}`),
  };
}

export const categoriesApi = createLookupApi("categories");
export const accountsApi = createLookupApi("accounts");
export const paymentMethodsApi = createLookupApi("payment-methods");

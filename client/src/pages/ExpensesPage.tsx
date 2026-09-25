import { useEffect, useMemo, useState } from "react";
import { IntervalPicker } from "../components/IntervalPicker";
import { recurringExpensesApi } from "../api/recurringExpenses";
import { accountsApi, categoriesApi, paymentMethodsApi } from "../api/lookups";
import type { IntervalUnit, LookupItem, RecurringExpense, RecurringExpenseInput } from "../types";

const emptyForm: RecurringExpenseInput = {
  name: "",
  amount: 0,
  intervalUnit: "Month",
  intervalValue: 1,
  startDate: null,
  nextDueDate: null,
  comment: null,
  active: true,
  categoryId: "",
  accountId: "",
  paymentMethodId: "",
};

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [accounts, setAccounts] = useState<LookupItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<LookupItem[]>([]);
  const [form, setForm] = useState<RecurringExpenseInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [expensesRes, categoriesRes, accountsRes, paymentMethodsRes] = await Promise.all([
        recurringExpensesApi.list(),
        categoriesApi.list(),
        accountsApi.list(),
        paymentMethodsApi.list(),
      ]);
      setExpenses(expensesRes);
      setCategories(categoriesRes);
      setAccounts(accountsRes);
      setPaymentMethods(paymentMethodsRes);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const canSubmit = useMemo(
    () =>
      form.name.trim().length > 0 &&
      form.categoryId &&
      form.accountId &&
      form.paymentMethodId &&
      form.amount >= 0,
    [form],
  );

  function openCreateForm() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      categoryId: categories[0]?.id ?? "",
      accountId: accounts[0]?.id ?? "",
      paymentMethodId: paymentMethods[0]?.id ?? "",
    });
    setShowForm(true);
  }

  function openEditForm(expense: RecurringExpense) {
    setEditingId(expense.id);
    setForm({
      name: expense.name,
      amount: expense.amount,
      intervalUnit: expense.intervalUnit,
      intervalValue: expense.intervalValue,
      startDate: expense.startDate ? expense.startDate.slice(0, 10) : null,
      nextDueDate: expense.nextDueDate ? expense.nextDueDate.slice(0, 10) : null,
      comment: expense.comment,
      active: expense.active,
      categoryId: expense.categoryId,
      accountId: expense.accountId,
      paymentMethodId: expense.paymentMethodId,
    });
    setShowForm(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    try {
      if (editingId) {
        await recurringExpensesApi.update(editingId, form);
      } else {
        await recurringExpensesApi.create(form);
      }
      setShowForm(false);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this recurring expense?")) return;
    try {
      await recurringExpensesApi.remove(id);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete.");
    }
  }

  const hasLookups = categories.length > 0 && accounts.length > 0 && paymentMethods.length > 0;

  return (
    <div className="page">
      <div className="page-header-row">
        <h1>Recurring expenses</h1>
        <button onClick={openCreateForm} disabled={!hasLookups}>
          + Add expense
        </button>
      </div>
      {!hasLookups && (
        <p className="warning-text">
          Add at least one category, account and payment method in Settings before creating expenses.
        </p>
      )}
      {error && <p className="error-text">{error}</p>}

      {showForm && (
        <form className="card expense-form" onSubmit={handleSubmit}>
          <h2>{editingId ? "Edit expense" : "New expense"}</h2>
          <label>
            Name
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </label>
          <label>
            Amount
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })}
              required
            />
          </label>
          <label>
            Recurrence
            <IntervalPicker
              intervalValue={form.intervalValue}
              intervalUnit={form.intervalUnit}
              onChange={(intervalValue, intervalUnit) => setForm({ ...form, intervalValue, intervalUnit })}
            />
          </label>
          <label>
            Category
            <select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Account (bucket)
            <select value={form.accountId} onChange={(event) => setForm({ ...form, accountId: event.target.value })}>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Payment method
            <select
              value={form.paymentMethodId}
              onChange={(event) => setForm({ ...form, paymentMethodId: event.target.value })}
            >
              {paymentMethods.map((paymentMethod) => (
                <option key={paymentMethod.id} value={paymentMethod.id}>
                  {paymentMethod.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Start date
            <input
              type="date"
              value={form.startDate ?? ""}
              onChange={(event) => setForm({ ...form, startDate: event.target.value || null })}
            />
          </label>
          <label>
            Next due date override (optional)
            <input
              type="date"
              value={form.nextDueDate ?? ""}
              onChange={(event) => setForm({ ...form, nextDueDate: event.target.value || null })}
            />
          </label>
          <label>
            Comment
            <input
              value={form.comment ?? ""}
              onChange={(event) => setForm({ ...form, comment: event.target.value || null })}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm({ ...form, active: event.target.checked })}
            />
            Active
          </label>
          <div className="form-actions">
            <button type="submit" disabled={!canSubmit}>
              Save
            </button>
            <button type="button" className="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Amount</th>
              <th>Recurrence</th>
              <th>Monthly</th>
              <th>Yearly</th>
              <th>Category</th>
              <th>Account</th>
              <th>Payment method</th>
              <th>Next due</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id} className={expense.active ? undefined : "inactive-row"}>
                <td>{expense.name}</td>
                <td>{expense.amount.toFixed(2)}</td>
                <td>
                  every {expense.intervalValue} {expense.intervalUnit.toLowerCase()}
                  {expense.intervalValue > 1 ? "s" : ""}
                </td>
                <td>{expense.monthlyAmount.toFixed(2)}</td>
                <td>{expense.yearlyAmount.toFixed(2)}</td>
                <td>{expense.category.name}</td>
                <td>{expense.account.name}</td>
                <td>{expense.paymentMethod.name}</td>
                <td>{expense.computedNextDueDate ? expense.computedNextDueDate.slice(0, 10) : "—"}</td>
                <td>{expense.active ? "Yes" : "No"}</td>
                <td className="row-actions">
                  <button className="secondary" onClick={() => openEditForm(expense)}>
                    Edit
                  </button>
                  <button className="danger" onClick={() => handleDelete(expense.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={11} className="empty">
                  No recurring expenses yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Re-exported for potential reuse in tests/future features.
export type { IntervalUnit };

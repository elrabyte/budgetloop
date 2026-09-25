import { useEffect, useMemo, useState } from "react";
import { IntervalPicker } from "../components/IntervalPicker";
import { incomeSourcesApi } from "../api/incomeSources";
import type { IncomeSource, IncomeSourceInput } from "../types";

const emptyForm: IncomeSourceInput = {
  name: "",
  amount: 0,
  intervalUnit: "Month",
  intervalValue: 1,
  active: true,
};

export function IncomePage() {
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [form, setForm] = useState<IncomeSourceInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setSources(await incomeSourcesApi.list());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const canSubmit = useMemo(() => form.name.trim().length > 0 && form.amount >= 0, [form]);

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(source: IncomeSource) {
    setEditingId(source.id);
    setForm({
      name: source.name,
      amount: source.amount,
      intervalUnit: source.intervalUnit,
      intervalValue: source.intervalValue,
      active: source.active,
    });
    setShowForm(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    try {
      if (editingId) {
        await incomeSourcesApi.update(editingId, form);
      } else {
        await incomeSourcesApi.create(form);
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this income source?")) return;
    try {
      await incomeSourcesApi.remove(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete.");
    }
  }

  return (
    <div className="page">
      <div className="page-header-row">
        <h1>Income</h1>
        <button onClick={openCreateForm}>+ Add income source</button>
      </div>
      {error && <p className="error-text">{error}</p>}

      {showForm && (
        <form className="card expense-form" onSubmit={handleSubmit}>
          <h2>{editingId ? "Edit income source" : "New income source"}</h2>
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
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id} className={source.active ? undefined : "inactive-row"}>
                <td>{source.name}</td>
                <td>{source.amount.toFixed(2)}</td>
                <td>
                  every {source.intervalValue} {source.intervalUnit.toLowerCase()}
                  {source.intervalValue > 1 ? "s" : ""}
                </td>
                <td>{source.monthlyAmount.toFixed(2)}</td>
                <td>{source.yearlyAmount.toFixed(2)}</td>
                <td>{source.active ? "Yes" : "No"}</td>
                <td className="row-actions">
                  <button className="secondary" onClick={() => openEditForm(source)}>
                    Edit
                  </button>
                  <button className="danger" onClick={() => handleDelete(source.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {sources.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  No income sources yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import type { LookupApi } from "../api/lookups";
import type { LookupItem } from "../types";

interface LookupManagerProps {
  title: string;
  api: LookupApi;
}

/** Simple list + add/rename/delete manager, shared by the Categories/Accounts/Payment methods
 * settings screens (they are all `{ id, name }` lookup tables with the same CRUD shape). */
export function LookupManager({ title, api }: LookupManagerProps) {
  const [items, setItems] = useState<LookupItem[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setItems(await api.list());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!newName.trim()) return;
    try {
      await api.create(newName.trim());
      setNewName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create.");
    }
  }

  function startEdit(item: LookupItem) {
    setEditingId(item.id);
    setEditingName(item.name);
  }

  async function saveEdit(id: string) {
    if (!editingName.trim()) return;
    try {
      await api.update(id, editingName.trim());
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update.");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this item? This cannot be undone.")) return;
    try {
      await api.remove(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete.");
    }
  }

  return (
    <section className="card">
      <h2>{title}</h2>
      {error && <p className="error-text">{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <ul className="lookup-list">
          {items.map((item) => (
            <li key={item.id}>
              {editingId === item.id ? (
                <>
                  <input value={editingName} onChange={(event) => setEditingName(event.target.value)} autoFocus />
                  <button onClick={() => saveEdit(item.id)}>Save</button>
                  <button className="secondary" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span>{item.name}</span>
                  <button className="secondary" onClick={() => startEdit(item)}>
                    Rename
                  </button>
                  <button className="danger" onClick={() => handleDelete(item.id)}>
                    Delete
                  </button>
                </>
              )}
            </li>
          ))}
          {items.length === 0 && <li className="empty">None yet.</li>}
        </ul>
      )}
      <form className="inline-form" onSubmit={handleAdd}>
        <input
          placeholder={`New ${title.toLowerCase().replace(/s$/, "")}`}
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
        />
        <button type="submit">Add</button>
      </form>
    </section>
  );
}

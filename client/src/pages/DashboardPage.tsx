import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dashboardApi } from "../api/dashboard";
import type { DashboardBreakdown, DashboardData } from "../types";

const COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#be185d", "#65a30d"];

function currency(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function tooltipFormatter(value: unknown): string {
  if (value === undefined || value === null) return "";
  const numeric = Array.isArray(value) ? value[0] : value;
  return currency(Number(numeric));
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboardApi
      .get()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard."));
  }, []);

  if (error) return <p className="error-text">{error}</p>;
  if (!data) return <p>Loading…</p>;

  return (
    <div className="page">
      <h1>Dashboard</h1>

      <div className="summary-grid">
        <SummaryCard label="Monthly income" value={data.totalMonthlyIncome} tone="positive" />
        <SummaryCard label="Monthly expenses" value={data.totalMonthlyExpenses} tone="negative" />
        <SummaryCard
          label="Remainder / month"
          value={data.remainderMonthly}
          tone={data.remainderMonthly >= 0 ? "positive" : "negative"}
        />
        <SummaryCard label="Remainder / year" value={data.remainderYearly} tone={data.remainderYearly >= 0 ? "positive" : "negative"} />
      </div>

      <div className="chart-grid">
        <section className="card">
          <h2>By account (bucket)</h2>
          {data.byAccount.length === 0 ? (
            <p className="empty">No active recurring expenses yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.byAccount}
                  dataKey="monthlyAmount"
                  nameKey="name"
                  outerRadius={90}
                  label={(entry) => {
                    const item = entry as unknown as DashboardBreakdown;
                    return `${item.name}: ${currency(item.monthlyAmount)}`;
                  }}
                >
                  {data.byAccount.map((entry, index) => (
                    <Cell key={entry.id} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={tooltipFormatter} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="card">
          <h2>By category (monthly)</h2>
          {data.byCategory.length === 0 ? (
            <p className="empty">No active recurring expenses yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.byCategory} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip formatter={tooltipFormatter} />
                <Bar dataKey="monthlyAmount" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="card">
          <h2>By payment method (monthly)</h2>
          {data.byPaymentMethod.length === 0 ? (
            <p className="empty">No active recurring expenses yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.byPaymentMethod} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={110} />
                <Tooltip formatter={tooltipFormatter} />
                <Bar dataKey="monthlyAmount" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>

      <section className="card">
        <h2>Upcoming</h2>
        {data.upcoming.length === 0 ? (
          <p className="empty">Nothing scheduled - set a start date on your recurring expenses.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Next due</th>
                <th>Name</th>
                <th>Amount</th>
                <th>Category</th>
                <th>Account</th>
                <th>Payment method</th>
              </tr>
            </thead>
            <tbody>
              {data.upcoming.map((item) => (
                <tr key={item.id}>
                  <td>{item.nextDueDate ? item.nextDueDate.slice(0, 10) : "—"}</td>
                  <td>{item.name}</td>
                  <td>{currency(item.amount)}</td>
                  <td>{item.category}</td>
                  <td>{item.account}</td>
                  <td>{item.paymentMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "positive" | "negative" }) {
  return (
    <div className={`summary-card ${tone}`}>
      <span className="summary-label">{label}</span>
      <span className="summary-value">{currency(value)}</span>
    </div>
  );
}

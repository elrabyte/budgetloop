import { NavLink, Outlet } from "react-router-dom";

export function Layout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>BudgetLoop</h1>
        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/expenses">Recurring expenses</NavLink>
          <NavLink to="/income">Income</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
      </header>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}

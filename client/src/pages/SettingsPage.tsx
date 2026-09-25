import { LookupManager } from "../components/LookupManager";
import { accountsApi, categoriesApi, paymentMethodsApi } from "../api/lookups";

export function SettingsPage() {
  return (
    <div className="page">
      <h1>Settings</h1>
      <p className="page-intro">
        Manage the lookup lists used by recurring expenses. Deleting an item that is still used by
        a recurring expense is blocked - reassign or delete those expenses first.
      </p>
      <div className="settings-grid">
        <LookupManager title="Categories" api={categoriesApi} />
        <LookupManager title="Accounts" api={accountsApi} />
        <LookupManager title="Payment methods" api={paymentMethodsApi} />
      </div>
    </div>
  );
}

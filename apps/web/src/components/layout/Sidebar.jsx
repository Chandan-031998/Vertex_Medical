import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider.jsx";

function Icon({ d }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const icons = {
  dashboard: "M3 13h8V3H3v10Zm10 8h8V11h-8v10ZM3 21h8v-6H3v6Zm10-10h8V3h-8v8Z",
  billing: "M7 3h10l1 4-1 4 1 4-1 4H7l-1-4 1-4-1-4 1-4Z",
  medicine: "M6.5 6.5 17.5 17.5M9 4a3 3 0 0 1 4.2 0l6.8 6.8a3 3 0 0 1 0 4.2l-1 1a3 3 0 0 1-4.2 0L8 9.2A3 3 0 0 1 8 5Z",
  batch: "M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 3h7m-7 4h7",
  inventory: "M12 3v18M3 12h18",
  purchases: "M6 6h15l-2 8H8L6 6Zm0 0L5 3H3m6 15a1 1 0 1 0 0 .01M18 18a1 1 0 1 0 0 .01",
  customers: "M4 20v-1a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v1M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  suppliers: "M3 21h18M5 21V9l7-4 7 4v12M9 13h6M9 17h6",
  reports: "M5 3v18M5 21h14M9 17V9m5 8V5m5 12v-6",
  compliance: "M5 4h10l4 4v12H5V4Zm10 0v4h4",
  admin: "M12 3l7 4v5c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V7l7-4Z",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8 4-2.1.6a6.9 6.9 0 0 1-.6 1.5l1.2 1.8-1.9 1.9-1.8-1.2c-.5.3-1 .5-1.5.6L12 20l-1.3-2.1a6.9 6.9 0 0 1-1.5-.6l-1.8 1.2-1.9-1.9 1.2-1.8c-.3-.5-.5-1-.6-1.5L4 12l2.1-1.3c.1-.5.3-1 .6-1.5L5.5 7.4l1.9-1.9 1.8 1.2c.5-.3 1-.5 1.5-.6L12 4l1.3 2.1c.5.1 1 .3 1.5.6l1.8-1.2 1.9 1.9-1.2 1.8c.3.5.5 1 .6 1.5L20 12Z",
  branding: "M4 4h16v16H4V4Zm0 4h16M10 4v4",
  org: "M3 21h18M5 21V7h14v14M9 11h2m4 0h2m-8 4h2m4 0h2",
};

const Item = ({ to, label, icon, collapsed }) => (
  <NavLink
    to={to}
    title={collapsed ? label : undefined}
    className={({ isActive }) =>
      `group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all ${
        isActive
          ? "bg-gradient-to-r from-brand-500 to-secondary-500 text-white shadow-glass"
          : "text-slate-600 hover:bg-white hover:text-slate-900"
      }`
    }
  >
    <Icon d={icon} />
    {!collapsed ? <span>{label}</span> : null}
    {collapsed ? (
      <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-xl bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {label}
      </span>
    ) : null}
  </NavLink>
);

export default function Sidebar({ collapsed, setCollapsed }) {
  const auth = useAuth();
  const canSeeSettings = auth.canAny(["USER_ADMIN", "SETTINGS_READ", "SETTINGS_WRITE", "ROLE_READ", "ROLE_WRITE"]);

  const navItems = [
    { to: "/", label: "Dashboard", icon: icons.dashboard, perms: ["DASHBOARD_VIEW"] },
    { to: "/pos", label: "Billing POS", icon: icons.billing, module: "BILLING_POS", perms: ["BILLING_READ", "BILLING_CREATE"] },
    { to: "/medicines", label: "Medicines", icon: icons.medicine, module: "INVENTORY", perms: ["MEDICINE_READ"] },
    { to: "/batches", label: "Batches", icon: icons.batch, module: "INVENTORY", perms: ["BATCH_READ"] },
    { to: "/inventory", label: "Inventory", icon: icons.inventory, module: "INVENTORY", perms: ["INVENTORY_READ"] },
    { to: "/purchases", label: "Purchases", icon: icons.purchases, module: "PURCHASES", perms: ["PURCHASE_READ"] },
    { to: "/customers", label: "Customers", icon: icons.customers, module: "CUSTOMERS", perms: ["CUSTOMER_READ"] },
    { to: "/suppliers", label: "Suppliers", icon: icons.suppliers, module: "PURCHASES", perms: ["SUPPLIER_READ"] },
    { to: "/reports", label: "Reports", icon: icons.reports, module: "REPORTS", perms: ["REPORTS_VIEW"] },
    { to: "/compliance", label: "Compliance", icon: icons.compliance, module: "COMPLIANCE", perms: ["COMPLIANCE_VIEW", "SCHEDULE_H1_VIEW"] },
    { to: "/admin", label: "Admin", icon: icons.admin, perms: ["USER_ADMIN"] },
  ];

  const settingItems = [
    { to: "/settings/roles", label: "Roles & Permissions", icon: icons.admin, show: auth.canAny(["ROLE_READ", "ROLE_WRITE", "USER_ADMIN"]) },
    { to: "/settings/modules", label: "Modules", icon: icons.settings, show: auth.canAny(["SETTINGS_READ", "SETTINGS_WRITE", "USER_ADMIN"]) },
    { to: "/settings/branding", label: "Branding", icon: icons.branding, show: auth.canAny(["SETTINGS_READ", "SETTINGS_WRITE", "USER_ADMIN"]) },
    { to: "/settings/org", label: "Organization", icon: icons.org, show: auth.canAny(["SETTINGS_READ", "SETTINGS_WRITE", "USER_ADMIN"]) },
  ];

  const visibleItems = navItems.filter((it) => {
    if (it.module && !auth.isModuleEnabled(it.module)) return false;
    if (it.perms && it.perms.length > 0 && !auth.canAny(it.perms)) return false;
    return true;
  });

  return (
    <aside
      style={{ width: collapsed ? 88 : 272 }}
      className="shrink-0 border-r border-white/60 bg-white/70 backdrop-blur-xl transition-all duration-200"
    >
      <div className="flex h-full flex-col px-3 py-4">
        <button
          className="mb-4 rounded-2xl border border-white/60 bg-white/80 px-3 py-2 text-left shadow-sm"
          onClick={() => setCollapsed((c) => !c)}
        >
          <div className="text-xs font-semibold text-brand-600">Vertex</div>
          {!collapsed ? <div className="text-sm font-bold text-slate-900">Medical Manager</div> : null}
        </button>

        <nav className="space-y-1.5">
          {visibleItems.map((it) => (
            <Item key={it.to} to={it.to} label={it.label} icon={it.icon} collapsed={collapsed} />
          ))}
        </nav>

        {canSeeSettings ? (
          <div className="mt-4 border-t border-slate-200/70 pt-4">
            {!collapsed ? <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Settings</div> : null}
            <div className="space-y-1.5">
              {settingItems
                .filter((x) => x.show)
                .map((it) => (
                  <Item key={it.to} to={it.to} label={it.label} icon={it.icon} collapsed={collapsed} />
                ))}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider.jsx";

function Icon({ d, className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
  chevron: "M9 6l6 6-6 6",
  panelLeft: "M3 4h18M3 20h18M8 8l-4 4 4 4M13 8h8M13 16h8",
  panelRight: "M3 4h18M3 20h18M16 8l4 4-4 4M3 8h8M3 16h8",
  close: "M6 6l12 12M18 6 6 18",
};

const NAV_GROUPS = [
  { title: "Overview", items: [{ label: "Dashboard", path: "/", icon: icons.dashboard, permissionKey: "DASHBOARD_VIEW" }] },
  {
    title: "Sales",
    items: [
      { label: "Billing POS", path: "/pos", icon: icons.billing, moduleKey: "BILLING_POS", permissionKeys: ["BILLING_READ", "BILLING_CREATE"] },
      { label: "Invoices", path: "/invoices", icon: icons.billing, moduleKey: "BILLING_POS", permissionKey: "BILLING_READ" },
    ],
  },
  {
    title: "Inventory",
    items: [
      { label: "Medicines", path: "/medicines", icon: icons.medicine, moduleKey: "INVENTORY", permissionKey: "MEDICINE_READ" },
      { label: "Batches", path: "/batches", icon: icons.batch, moduleKey: "INVENTORY", permissionKey: "BATCH_READ" },
      { label: "Inventory", path: "/inventory", icon: icons.inventory, moduleKey: "INVENTORY", permissionKey: "INVENTORY_READ" },
      { label: "Transfers", path: "/inventory/transfers", icon: icons.inventory, moduleKey: "INVENTORY", permissionKeys: ["INVENTORY_READ", "STOCK_TRANSFER_CREATE"] },
      { label: "Dead Stock", path: "/reports/dead-stock", icon: icons.reports, moduleKey: "REPORTS", permissionKey: "DEAD_STOCK_VIEW" },
    ],
  },
  {
    title: "Procurement",
    items: [
      { label: "Purchases", path: "/purchases", icon: icons.purchases, moduleKey: "PURCHASES", permissionKey: "PURCHASE_READ" },
      { label: "Suppliers", path: "/suppliers", icon: icons.suppliers, moduleKey: "PURCHASES", permissionKey: "SUPPLIER_READ" },
    ],
  },
  {
    title: "Customers & Rx",
    items: [
      { label: "Customers", path: "/customers", icon: icons.customers, moduleKey: "CUSTOMERS", permissionKey: "CUSTOMER_READ" },
      { label: "Prescriptions", path: "/prescriptions", icon: icons.billing, moduleKey: "BILLING_POS", permissionKey: "PRESCRIPTION_READ" },
    ],
  },
  {
    title: "Compliance & Reports",
    items: [
      { label: "Compliance", path: "/compliance", icon: icons.compliance, moduleKey: "COMPLIANCE", permissionKeys: ["COMPLIANCE_VIEW", "SCHEDULE_H1_VIEW"] },
      { label: "Reports", path: "/reports", icon: icons.reports, moduleKey: "REPORTS", permissionKey: "REPORTS_VIEW" },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Admin", path: "/admin", icon: icons.admin, permissionKey: "USER_ADMIN" },
      { label: "Roles & Permissions", path: "/settings/roles", icon: icons.admin, permissionKeys: ["USER_ADMIN", "ROLE_READ"] },
      { label: "Modules", path: "/settings/modules", icon: icons.settings, permissionKeys: ["SETTINGS_READ", "SETTINGS_WRITE", "USER_ADMIN"] },
      { label: "Branding", path: "/settings/branding", icon: icons.branding, permissionKeys: ["SETTINGS_READ", "SETTINGS_WRITE", "USER_ADMIN"] },
      { label: "Organization", path: "/settings/org", icon: icons.org, permissionKeys: ["SETTINGS_READ", "SETTINGS_WRITE", "USER_ADMIN"] },
    ],
  },
];

function pathIsActive(currentPath, targetPath) {
  if (targetPath === "/") return currentPath === "/";
  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

function NavItem({ item, collapsed, onNavigate }) {
  return (
    <NavLink
      to={item.path}
      end={item.path === "/"}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-lg border-l-2 px-2.5 py-2 text-sm transition ${
          isActive
            ? "border-brand-500 bg-brand-50 text-brand-700"
            : "border-transparent text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
        }`
      }
    >
      <Icon d={item.icon} />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
      {collapsed ? (
        <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          {item.label}
        </span>
      ) : null}
    </NavLink>
  );
}

function SidebarNav({ collapsed, visibleGroups, openGroups, onToggleGroup, onNavigate }) {
  if (collapsed) {
    return (
      <nav className="space-y-1">
        {visibleGroups.flatMap((group) => group.items).map((item) => (
          <NavItem key={item.path} item={item} collapsed onNavigate={onNavigate} />
        ))}
      </nav>
    );
  }

  return (
    <nav className="space-y-2">
      {visibleGroups.map((group) => {
        const isOpen = !!openGroups[group.title];
        return (
          <div key={group.title} className="pt-1">
            <button
              className="flex w-full items-center justify-between px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
              onClick={() => onToggleGroup(group.title)}
              aria-label={`Toggle ${group.title}`}
            >
              <span>{group.title}</span>
              <Icon d={icons.chevron} className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`} />
            </button>
            {isOpen ? (
              <div className="mt-1 space-y-1">
                {group.items.map((item) => (
                  <NavItem key={item.path} item={item} collapsed={false} onNavigate={onNavigate} />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const auth = useAuth();
  const location = useLocation();

  const canAny = auth?.canAny ? auth.canAny.bind(auth) : () => true;
  const isModuleEnabled = auth?.isModuleEnabled ? auth.isModuleEnabled.bind(auth) : () => true;

  const visibleGroups = React.useMemo(() => {
    return NAV_GROUPS
      .map((group) => {
        const items = group.items.filter((item) => {
          if (item.moduleKey && !isModuleEnabled(item.moduleKey)) return false;
          if (item.permissionKeys?.length && !canAny(item.permissionKeys)) return false;
          if (item.permissionKey && !canAny([item.permissionKey])) return false;
          return true;
        });
        return { ...group, items };
      })
      .filter((group) => group.items.length > 0);
  }, [auth?.user, auth?.modules]);

  const activeGroupTitle = React.useMemo(() => {
    const found = visibleGroups.find((group) => group.items.some((item) => pathIsActive(location.pathname, item.path)));
    return found?.title || visibleGroups[0]?.title || null;
  }, [location.pathname, visibleGroups]);

  const [openGroups, setOpenGroups] = React.useState({});

  React.useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      visibleGroups.forEach((g) => {
        if (next[g.title] === undefined) next[g.title] = g.title === activeGroupTitle;
      });
      if (activeGroupTitle) next[activeGroupTitle] = true;
      return next;
    });
  }, [activeGroupTitle, visibleGroups]);

  React.useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, setMobileOpen]);

  const toggleGroup = (title) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const closeMobile = () => setMobileOpen(false);

  const isLoadingAuth = !auth || auth.ready === false;

  return (
    <>
      {isLoadingAuth ? (
        <aside
          className="fixed inset-y-0 left-0 z-30 hidden border-r border-white/60 bg-white/90 backdrop-blur-xl md:block"
          style={{ width: collapsed ? 64 : 256 }}
        />
      ) : null}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden border-r border-white/60 bg-white/90 backdrop-blur-xl transition-all duration-200 md:block"
        style={{ width: collapsed ? 64 : 256 }}
      >
        <div className={`flex h-full flex-col px-2 py-3 ${isLoadingAuth ? "opacity-0 pointer-events-none" : ""}`}>
          <div className="mb-3 flex items-center justify-between px-2">
            {!collapsed ? (
              <div>
                <div className="text-xs font-semibold text-brand-600">Vertex</div>
                <div className="text-sm font-bold text-slate-900">Medical Manager</div>
              </div>
            ) : <div className="h-8" />}
            <button
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Icon d={collapsed ? icons.panelRight : icons.panelLeft} />
            </button>
          </div>
          <div className="overflow-y-auto pr-1">
            <SidebarNav
              collapsed={collapsed}
              visibleGroups={visibleGroups}
              openGroups={openGroups}
              onToggleGroup={toggleGroup}
              onNavigate={undefined}
            />
          </div>
        </div>
      </aside>

      {mobileOpen ? (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/45 md:hidden" onClick={closeMobile} />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-white/60 bg-white/95 px-3 py-3 shadow-2xl backdrop-blur-xl md:hidden">
            <div className="mb-3 flex items-center justify-between px-1">
              <div>
                <div className="text-xs font-semibold text-brand-600">Vertex</div>
                <div className="text-sm font-bold text-slate-900">Medical Manager</div>
              </div>
              <button
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                onClick={closeMobile}
                aria-label="Close navigation menu"
              >
                <Icon d={icons.close} />
              </button>
            </div>
            <div className="max-h-[calc(100vh-4rem)] overflow-y-auto pr-1">
              {!isLoadingAuth ? (
                <SidebarNav
                  collapsed={false}
                  visibleGroups={visibleGroups}
                  openGroups={openGroups}
                  onToggleGroup={toggleGroup}
                  onNavigate={closeMobile}
                />
              ) : null}
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}

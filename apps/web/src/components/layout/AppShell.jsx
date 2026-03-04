import React from "react";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

export default function AppShell({ children }) {
  const [collapsed, setCollapsed] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("sidebarCollapsed") === "1";
  });
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pageKey = typeof window !== "undefined" ? window.location.pathname : "page";
  const sidebarWidth = collapsed ? "4rem" : "16rem";

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("sidebarCollapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const handleMenuClick = () => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
      setCollapsed((c) => !c);
      return;
    }
    setMobileOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className="flex min-h-screen flex-col transition-all duration-200 md:ml-[var(--sidebar-width)]" style={{ "--sidebar-width": sidebarWidth }}>
        <Topbar onMenuClick={handleMenuClick} />
        <main className="p-6 md:p-8">
          <div key={pageKey} className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

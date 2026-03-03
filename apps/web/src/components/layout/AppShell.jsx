import React from "react";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

export default function AppShell({ children }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const pageKey = typeof window !== "undefined" ? window.location.pathname : "page";

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="flex-1">
        <Topbar collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className="p-6 md:p-8">
          <div key={pageKey} className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

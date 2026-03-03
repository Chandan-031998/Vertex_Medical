import React from "react";
import { useLocation } from "react-router-dom";
import Button from "../ui/Button.jsx";
import { useAuth } from "../../auth/AuthProvider.jsx";

function Icon({ d, className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const iconMenu = "M4 6h16M4 12h16M4 18h16";
const iconBell = "M15 17H5l2-2V9a5 5 0 0 1 10 0v6l2 2h-4M11 21a2 2 0 0 0 4 0";
const iconChevronRight = "M9 6l6 6-6 6";
const iconUser = "M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z";

function toTitle(segment) {
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function Topbar({ setCollapsed }) {
  const auth = useAuth();
  const location = useLocation();
  const [open, setOpen] = React.useState(false);
  const segments = location.pathname.split("/").filter(Boolean);

  return (
    <header className="sticky top-0 z-30 border-b border-white/70 bg-white/70 px-6 py-4 shadow-sm backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="secondary" className="!px-3" onClick={() => setCollapsed((c) => !c)} icon={<Icon d={iconMenu} />}>
            Menu
          </Button>
          <div className="hidden items-center gap-1 text-sm text-slate-500 md:flex">
            <span>Home</span>
            {segments.map((s) => (
              <React.Fragment key={s}>
                <Icon d={iconChevronRight} className="h-4 w-4" />
                <span className="text-slate-700">{toTitle(s)}</span>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="relative rounded-2xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:text-slate-900">
            <Icon d={iconBell} className="h-4 w-4" />
            <span className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full bg-danger-500 px-1 text-[10px] text-white">2</span>
          </button>

          <div className="relative">
            <button
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-1.5"
              onClick={() => setOpen((o) => !o)}
            >
              <Icon d={iconUser} className="h-5 w-5 text-brand-500" />
              <div className="hidden text-left sm:block">
                <div className="text-xs text-slate-500">{auth.user?.role_key || "User"}</div>
                <div className="text-sm font-semibold text-slate-800">{auth.user?.name || "Account"}</div>
              </div>
            </button>
            {open ? (
              <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                <button className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50">Profile</button>
                <button className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => auth.logout()}>
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

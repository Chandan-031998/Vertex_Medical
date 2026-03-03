import React from "react";

export default function Select({ label, className = "", children, ...props }) {
  return (
    <label className="block">
      {label ? <div className="text-sm font-medium text-slate-700 mb-1">{label}</div> : null}
      <select
        className={`w-full rounded-2xl border border-slate-200/80 bg-white/90 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-brand-300 focus:ring-4 focus:ring-brand-100 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

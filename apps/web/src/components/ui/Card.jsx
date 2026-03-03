import React from "react";

export function Card({ children, className = "" }) {
  return <div className={`panel animate-fade-in rounded-3xl transition-all duration-200 hover:-translate-y-0.5 ${className}`}>{children}</div>;
}

export function CardHeader({ title, right }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100/80 px-6 py-4">
      <div className="font-display text-base font-semibold text-slate-900">{title}</div>
      {right}
    </div>
  );
}

export function CardBody({ children }) {
  return <div className="p-6">{children}</div>;
}

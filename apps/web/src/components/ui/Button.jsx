import React, { useState } from "react";

export default function Button({ children, className = "", variant = "primary", icon, ...props }) {
  const [ripples, setRipples] = useState([]);

  const base =
    "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-50";
  const styles = {
    primary: "text-white bg-gradient-to-r from-brand-500 to-secondary-500 hover:brightness-110 hover:scale-[1.01] active:scale-[0.98]",
    secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    danger: "bg-danger-500 text-white hover:brightness-110",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
  };

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const id = Date.now() + Math.random();
    setRipples((r) => [...r, { id, x, y, size }]);
    setTimeout(() => setRipples((r) => r.filter((i) => i.id !== id)), 700);
    props.onClick?.(e);
  };

  return (
    <button className={`${base} ${styles[variant] || styles.primary} ${className}`} {...props} onClick={handleClick}>
      {ripples.map((r) => (
        <span
          key={r.id}
          className="pointer-events-none absolute rounded-full bg-white/40 animate-ripple"
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
        />
      ))}
      {icon}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

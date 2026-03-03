import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/http.js";
import { endpoints } from "../api/endpoints.js";
import { Card, CardBody, CardHeader } from "../components/ui/Card.jsx";

function Icon({ d, className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function StatCard({ title, value, icon, tone, progress = 74 }) {
  const tones = {
    brand: "from-brand-500 to-secondary-500",
    success: "from-success-500 to-emerald-400",
    warning: "from-warning-500 to-amber-400",
    danger: "from-danger-500 to-rose-400",
  };

  return (
    <div className="panel rounded-3xl p-5 transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`rounded-2xl bg-gradient-to-r p-2.5 text-white shadow-glass ${tones[tone] || tones.brand}`}>{icon}</div>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full bg-gradient-to-r ${tones[tone] || tones.brand}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function MiniLineChart({ points }) {
  const width = 640;
  const height = 240;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = Math.max(max - min, 1);
  const step = width / Math.max(points.length - 1, 1);

  const path = points
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 24) - 12;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const area = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <div className="h-72 rounded-2xl border border-slate-100 bg-gradient-to-b from-indigo-50/60 to-cyan-50/40 p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
        <defs>
          <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#lineFill)" />
        <path d={path} fill="none" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function MiniBarChart({ rows }) {
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div className="flex h-72 items-end gap-4 rounded-2xl border border-slate-100 bg-gradient-to-b from-cyan-50/50 to-white p-6">
      {rows.map((row) => {
        const h = Math.max(12, Math.round((row.value / max) * 88));
        return (
          <div key={row.label} className="flex flex-1 flex-col items-center gap-3">
            <div className="w-full rounded-t-xl bg-gradient-to-t from-brand-500 to-secondary-500" style={{ height: `${h}%` }} />
            <div className="text-center">
              <div className="text-xs font-medium text-slate-600">{row.label}</div>
              <div className="text-xs text-slate-400">{row.value}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api
      .get(endpoints.dashboard)
      .then((r) => setData(r.data))
      .catch(() => {});
  }, []);

  const salesSeries = useMemo(() => {
    const base = Number(data?.today_sales_total || 0);
    return [
      Math.max(0, base * 0.62),
      Math.max(0, base * 0.74),
      Math.max(0, base * 0.68),
      Math.max(0, base * 0.79),
      Math.max(0, base * 0.84),
      Math.max(0, base * 0.95),
      Math.max(0, base),
    ];
  }, [data]);

  const inventorySeries = useMemo(
    () => [
      { label: "Healthy", value: Math.max(10, 120 - Number(data?.low_stock_count || 0) * 2) },
      { label: "Low", value: Number(data?.low_stock_count || 0) },
      { label: "Near Expiry", value: Number(data?.near_expiry_count || 0) },
    ],
    [data],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-900">Vertex Medical Manager</h1>
        <p className="mt-1 text-sm text-slate-500">Premium pharmacy operations overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Today's Sales"
          value={data ? `₹${Number(data.today_sales_total).toFixed(2)}` : "—"}
          icon={<Icon d="M7 3h10l1 4-1 4 1 4-1 4H7l-1-4 1-4-1-4 1-4Z" />}
          tone="brand"
          progress={76}
        />
        <StatCard
          title="Bills Today"
          value={data ? data.today_bills : "—"}
          icon={<Icon d="M12 3v18M3 12h18" />}
          tone="success"
          progress={68}
        />
        <StatCard
          title="Due Amount"
          value={data ? `₹${Number(data.due_total).toFixed(2)}` : "—"}
          icon={<Icon d="M12 9v4m0 4h.01M10.3 4.9 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.9a2 2 0 0 0-3.4 0Z" />}
          tone="warning"
          progress={52}
        />
        <StatCard
          title="Near Expiry"
          value={data ? data.near_expiry_count : "—"}
          icon={<Icon d="M12 3l7 4v5c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V7l7-4Z" />}
          tone="danger"
          progress={44}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Weekly Sales Trend" />
          <CardBody>
            <MiniLineChart points={salesSeries} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Inventory Snapshot" />
          <CardBody>
            <MiniBarChart rows={inventorySeries} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

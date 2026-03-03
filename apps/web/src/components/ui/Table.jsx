import React from "react";

function EmptyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h18M6 11h12M9 15h6M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

export default function Table({ columns, rows, rowKey = "id", loading = false, emptyText = "No data" }) {
  return (
    <div className="overflow-auto rounded-3xl border border-slate-200/70 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50/80 text-slate-700">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="border-b border-slate-200/70 px-4 py-3 text-left font-semibold">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <tr key={`sk-${i}`}>
                <td colSpan={columns.length} className="border-b border-slate-100 px-4 py-3">
                  <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                </td>
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-500">
                <div className="flex flex-col items-center gap-2">
                  <EmptyIcon />
                  <span>{emptyText}</span>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r[rowKey]} className="transition-colors hover:bg-indigo-50/40">
                {columns.map((c) => (
                  <td key={c.key} className="border-b border-slate-100/80 px-4 py-3">
                    {c.render ? c.render(r) : r[c.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

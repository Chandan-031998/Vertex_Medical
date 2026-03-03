import React, { useEffect } from "react";
import Button from "./Button.jsx";

export default function Modal({ open, title, children, onClose, footer }) {
  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl rounded-3xl border border-white/70 bg-white shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="font-display text-base font-semibold text-slate-900">{title}</div>
          <Button variant="ghost" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className="p-6">{children}</div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          {footer || (
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

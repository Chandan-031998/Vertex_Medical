import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../api/http.js";
import { endpoints } from "../api/endpoints.js";
import { Card, CardHeader, CardBody } from "../components/ui/Card.jsx";
import Table from "../components/ui/Table.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import Modal from "../components/ui/Modal.jsx";
import { useToast } from "../components/ui/ToastProvider.jsx";
import Select from "../components/ui/Select.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";

function fmtDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function money(v) {
  return `₹${Number(v || 0).toFixed(2)}`;
}

export default function Invoices() {
  const auth = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [from, setFrom] = useState(searchParams.get("from") || "");
  const [to, setTo] = useState(searchParams.get("to") || "");
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [invoiceNo, setInvoiceNo] = useState(searchParams.get("invoice_no") || "");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnSaving, setReturnSaving] = useState(false);
  const [returnForm, setReturnForm] = useState({
    reason: "",
    refunds: { mode: "CASH", amount: "", ref_no: "" },
    items: [],
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const loadList = async (nextPage = page) => {
    setLoading(true);
    try {
      const res = await api.get(endpoints.invoices, {
        params: {
          from: from || undefined,
          to: to || undefined,
          q: q || undefined,
          invoice_no: invoiceNo || undefined,
          page: nextPage,
          pageSize,
        },
      });
      const data = res.data || {};
      setRows(data.rows || []);
      setTotal(Number(data.total || 0));
      setPage(Number(data.page || nextPage));

      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        if (from) p.set("from", from); else p.delete("from");
        if (to) p.set("to", to); else p.delete("to");
        if (q) p.set("q", q); else p.delete("q");
        if (invoiceNo) p.set("invoice_no", invoiceNo); else p.delete("invoice_no");
        p.set("page", String(Number(data.page || nextPage)));
        return p;
      });
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await api.get(endpoints.invoiceById(id));
      setDetail(res.data || null);
      setDetailOpen(true);
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set("invoiceId", String(id));
        return p;
      });
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load invoice details");
    } finally {
      setDetailLoading(false);
    }
  };

  const openPdfBlob = async (id, { print = false, download = false } = {}) => {
    const res = await api.get(endpoints.invoicePdf(id), { responseType: "blob" });
    const blob = new Blob([res.data], { type: "application/pdf" });
    const fileUrl = URL.createObjectURL(blob);

    if (download) {
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = `invoice-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
      return;
    }

    const win = window.open(fileUrl, "_blank", "noopener,noreferrer");
    if (print && win) {
      setTimeout(() => {
        try {
          win.focus();
          win.print();
        } catch {}
      }, 600);
    }
  };

  const doShare = async (id) => {
    try {
      const res = await api.post(endpoints.invoiceShare(id));
      const payload = res.data || {};
      const msg = `${payload.messageTemplate || ""}\n${payload.shareUrl || ""}`.trim();
      await navigator.clipboard.writeText(msg);
      toast.success("Share message copied to clipboard");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Share failed");
    }
  };

  const openReturnModal = () => {
    if (!detail?.items?.length) return;
    setReturnForm({
      reason: "",
      refunds: { mode: "CASH", amount: "", ref_no: "" },
      items: detail.items.map((it) => ({
        batch_id: it.batch_id,
        medicine_name: it.medicine_name,
        sold_qty: Number(it.qty || 0),
        return_qty: 0,
      })),
    });
    setReturnOpen(true);
  };

  const submitReturn = async () => {
    if (!detail?.invoice?.id) return;
    const return_items = returnForm.items
      .map((x) => ({ batch_id: Number(x.batch_id), qty: Number(x.return_qty || 0) }))
      .filter((x) => x.qty > 0);
    if (!return_items.length) {
      toast.error("Enter return quantity for at least one item");
      return;
    }

    const refunds = [];
    const refundAmount = Number(returnForm.refunds.amount || 0);
    if (refundAmount > 0) {
      refunds.push({
        mode: returnForm.refunds.mode,
        amount: refundAmount,
        ref_no: returnForm.refunds.ref_no || null,
      });
    }

    setReturnSaving(true);
    try {
      await api.post(endpoints.billingReturns, {
        invoice_id: detail.invoice.id,
        reason: returnForm.reason || null,
        return_items,
        refunds,
      });
      toast.success("Return created");
      setReturnOpen(false);
      await loadDetail(detail.invoice.id);
      await loadList(page);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Return failed");
    } finally {
      setReturnSaving(false);
    }
  };

  useEffect(() => {
    loadList(1).catch(() => {});
  }, []);

  useEffect(() => {
    const initialInvoiceId = searchParams.get("invoiceId");
    if (initialInvoiceId) loadDetail(Number(initialInvoiceId)).catch(() => {});
  }, []);

  const cols = useMemo(() => [
    { key: "invoice_no", label: "Invoice" },
    { key: "invoice_date", label: "Date & Time", render: (r) => fmtDate(r.invoice_date) },
    { key: "customer_name", label: "Customer", render: (r) => r.customer_name || "Walk-in" },
    { key: "total", label: "Total", render: (r) => money(r.total) },
    { key: "amount_due", label: "Due", render: (r) => money(r.amount_due) },
    { key: "status", label: "Status" },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => loadDetail(r.id)}>View</Button>
          <Button variant="secondary" onClick={() => openPdfBlob(r.id, { download: true }).catch((e) => toast.error(e?.response?.data?.message || "PDF failed"))}>PDF</Button>
          <Button variant="secondary" onClick={() => doShare(r.id)}>Share</Button>
        </div>
      ),
    },
  ], []);

  const itemCols = useMemo(() => [
    { key: "medicine_name", label: "Medicine" },
    { key: "batch_no", label: "Batch" },
    { key: "qty", label: "Qty" },
    { key: "selling_rate", label: "Rate", render: (r) => money(r.selling_rate) },
    { key: "tax_amount", label: "Tax", render: (r) => money(r.tax_amount) },
    { key: "discount_amount", label: "Discount", render: (r) => money(r.discount_amount) },
    { key: "line_total", label: "Line Total", render: (r) => money(r.line_total) },
  ], []);

  const payCols = useMemo(() => [
    { key: "paid_at", label: "Paid At", render: (r) => fmtDate(r.paid_at) },
    { key: "mode", label: "Mode" },
    { key: "amount", label: "Amount", render: (r) => money(r.amount) },
    { key: "ref_no", label: "Reference", render: (r) => r.ref_no || "-" },
  ], []);

  const returnCols = useMemo(() => [
    { key: "return_no", label: "Return No" },
    { key: "created_at", label: "Date", render: (r) => fmtDate(r.created_at) },
    { key: "status", label: "Status" },
    { key: "reason", label: "Reason", render: (r) => r.reason || "-" },
  ], []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Invoices"
          right={
            <div className="flex flex-wrap gap-2">
              <Input type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)} />
              <Input type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)} />
              <Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Invoice / customer / phone" />
              <Input label="Invoice No" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="INV-..." />
              <div className="flex items-end gap-2">
                <Button variant="secondary" onClick={() => loadList(1).catch(() => {})}>Apply</Button>
                <Button variant="ghost" onClick={() => {
                  setFrom("");
                  setTo("");
                  setQ("");
                  setInvoiceNo("");
                  setPage(1);
                  navigate("/invoices", { replace: true });
                  setTimeout(() => loadList(1).catch(() => {}), 0);
                }}>Reset</Button>
              </div>
            </div>
          }
        />
        <CardBody>
          <Table columns={cols} rows={rows} rowKey="id" loading={loading} emptyText="No invoices found" />
          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <div>Total: {total}</div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => loadList(page - 1).catch(() => {})}>Prev</Button>
              <span>Page {page} / {totalPages}</span>
              <Button variant="secondary" disabled={page >= totalPages || loading} onClick={() => loadList(page + 1).catch(() => {})}>Next</Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Modal
        open={detailOpen}
        title={detail?.invoice?.invoice_no ? `Invoice ${detail.invoice.invoice_no}` : "Invoice Detail"}
        onClose={() => {
          setDetailOpen(false);
          setSearchParams((prev) => {
            const p = new URLSearchParams(prev);
            p.delete("invoiceId");
            return p;
          });
        }}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setDetailOpen(false)}>Close</Button>
            <Button variant="secondary" onClick={() => detail?.invoice?.id && openPdfBlob(detail.invoice.id, { download: true }).catch((e) => toast.error(e?.response?.data?.message || "PDF failed"))}>Download PDF</Button>
            <Button variant="secondary" onClick={() => detail?.invoice?.id && openPdfBlob(detail.invoice.id, { print: true }).catch((e) => toast.error(e?.response?.data?.message || "Print failed"))}>Print</Button>
            <Button onClick={() => detail?.invoice?.id && doShare(detail.invoice.id)}>Share</Button>
            {auth.can("BILLING_RETURN") ? <Button variant="secondary" onClick={openReturnModal}>Create Return</Button> : null}
          </div>
        }
      >
        {detailLoading ? (
          <div className="text-sm text-slate-500">Loading...</div>
        ) : !detail ? (
          <div className="text-sm text-slate-500">No invoice selected.</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div><div className="text-slate-500">Date</div><div className="font-semibold">{fmtDate(detail.invoice.invoice_date)}</div></div>
              <div><div className="text-slate-500">Customer</div><div className="font-semibold">{detail.invoice.customer_name || "Walk-in"}</div></div>
              <div><div className="text-slate-500">Status</div><div className="font-semibold">{detail.invoice.status}</div></div>
              <div><div className="text-slate-500">Total</div><div className="font-semibold">{money(detail.invoice.total)}</div></div>
            </div>

            <div>
              <div className="mb-2 font-semibold text-slate-900">Items</div>
              <Table columns={itemCols} rows={detail.items || []} rowKey="id" />
            </div>

            <div>
              <div className="mb-2 font-semibold text-slate-900">Payments</div>
              <Table columns={payCols} rows={detail.payments || []} rowKey="id" />
            </div>

            <div>
              <div className="mb-2 font-semibold text-slate-900">Returns</div>
              <Table columns={returnCols} rows={detail.returns || []} rowKey="id" emptyText="No returns" />
            </div>

            <div>
              <div className="mb-2 font-semibold text-slate-900">Linked Prescriptions</div>
              {(detail.linked_prescriptions || []).length === 0 ? (
                <div className="text-sm text-slate-500">No linked prescriptions</div>
              ) : (
                <div className="space-y-2">
                  {(detail.linked_prescriptions || []).map((pr) => (
                    <div key={pr.id} className="rounded-2xl border border-slate-200 p-3 text-sm">
                      <div className="font-semibold">Prescription #{pr.id}</div>
                      <div className="text-slate-500">Doctor: {pr.doctor_name || "-"}</div>
                      <div className="mt-1 space-y-1">
                        {(pr.files || []).map((f) => (
                          <a key={f.id} href={f.file_url} target="_blank" rel="noreferrer" className="block text-brand-600 hover:underline">
                            {f.original_name}
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={returnOpen}
        title={detail?.invoice?.invoice_no ? `Create Return - ${detail.invoice.invoice_no}` : "Create Return"}
        onClose={() => setReturnOpen(false)}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setReturnOpen(false)}>Cancel</Button>
            <Button onClick={submitReturn} disabled={returnSaving}>{returnSaving ? "Submitting..." : "Submit Return"}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Reason" value={returnForm.reason} onChange={(e) => setReturnForm((f) => ({ ...f, reason: e.target.value }))} />
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-900">Return Items</div>
            {returnForm.items.map((it, idx) => (
              <div key={`${it.batch_id}-${idx}`} className="grid grid-cols-12 gap-2 items-end rounded-2xl border border-slate-200 p-3">
                <div className="col-span-6">
                  <div className="text-sm font-medium">{it.medicine_name}</div>
                  <div className="text-xs text-slate-500">Sold qty: {it.sold_qty}</div>
                </div>
                <div className="col-span-6">
                  <Input
                    label="Return Qty"
                    type="number"
                    min={0}
                    max={it.sold_qty}
                    value={it.return_qty}
                    onChange={(e) => {
                      const v = Math.max(0, Math.min(Number(e.target.value || 0), Number(it.sold_qty || 0)));
                      setReturnForm((f) => ({
                        ...f,
                        items: f.items.map((x, i) => (i === idx ? { ...x, return_qty: v } : x)),
                      }));
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          {auth.can("BILLING_REFUND") ? (
            <div className="grid grid-cols-3 gap-2">
              <Select label="Refund Mode" value={returnForm.refunds.mode} onChange={(e) => setReturnForm((f) => ({ ...f, refunds: { ...f.refunds, mode: e.target.value } }))}>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
              </Select>
              <Input label="Refund Amount" type="number" value={returnForm.refunds.amount} onChange={(e) => setReturnForm((f) => ({ ...f, refunds: { ...f.refunds, amount: e.target.value } }))} />
              <Input label="Ref No (optional)" value={returnForm.refunds.ref_no} onChange={(e) => setReturnForm((f) => ({ ...f, refunds: { ...f.refunds, ref_no: e.target.value } }))} />
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

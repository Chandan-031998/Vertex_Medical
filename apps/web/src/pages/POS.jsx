import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getApiErrorMessage } from "../api/http.js";
import { endpoints } from "../api/endpoints.js";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import Select from "../components/ui/Select.jsx";
import { Card, CardHeader, CardBody } from "../components/ui/Card.jsx";
import Table from "../components/ui/Table.jsx";
import { useToast } from "../components/ui/ToastProvider.jsx";

export default function POS() {
  const navigate = useNavigate();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [suggest, setSuggest] = useState([]);
  const [stockOptions, setStockOptions] = useState([]);
  const [stockHint, setStockHint] = useState("");

  const [selected, setSelected] = useState(null);
  const [batchId, setBatchId] = useState("");
  const [qty, setQty] = useState(1);
  const [disc, setDisc] = useState(0);

  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [doctorName, setDoctorName] = useState("");

  const [payments, setPayments] = useState([{ mode: "CASH", amount: 0, ref_no: "" }]);
  const [isCreditSale, setIsCreditSale] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const [prescriptionId, setPrescriptionId] = useState("");
  const [rxUploading, setRxUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);

  const search = async (q) => {
    if (!q.trim()) { setSuggest([]); return; }
    const res = await api.get(endpoints.medicineSearch, { params: { q }});
    setSuggest(res.data || []);
  };

  useEffect(() => {
    const t = setTimeout(() => { search(query).catch(()=>{}); }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    api.get(endpoints.prescriptions).then((r) => setPrescriptions(r.data || [])).catch(() => {});
  }, []);

  const pickMedicine = async (m) => {
    setSelected(m);
    setSuggest([]);
    setQuery(m.name);
    setStockHint("");
    try {
      const st = await api.get(endpoints.stock, {
        params: { medicine_id: m.id, sellable_only: 1 },
      });
      const rows = (st.data || [])
        .filter((r) => Number(r.available_qty ?? r.qty ?? 0) > 0)
        .sort((a, b) => String(a.expiry_date || "").localeCompare(String(b.expiry_date || "")));
      setStockOptions(rows);
      setBatchId(rows?.[0]?.batch_id ? String(rows[0].batch_id) : "");
      if (!rows.length) {
        setStockHint("No stock available for this medicine. Add stock via Purchases or Inventory Adjust.");
      }
    } catch (e) {
      if (e?.response?.status === 404) {
        e.__suppressToast = true;
      } else {
        const msg = getApiErrorMessage(e, "Failed to load in-stock batches");
        if (msg) toast.error(msg);
      }
      setStockOptions([]);
      setBatchId("");
      setStockHint("No stock available for this medicine. Add stock via Purchases or Inventory Adjust.");
    }
  };

  const addToCart = () => {
    if (!selected) return alert("Select a medicine");
    if (!batchId) return alert("Select a batch");
    const opt = stockOptions.find(s => String(s.batch_id) === String(batchId));
    if (!opt) return alert("Batch not in stock");
    if (qty <= 0) return;

    const line = {
      id: Date.now(),
      medicine_id: selected.id,
      medicine_name: selected.name,
      batch_id: Number(batchId),
      batch_no: opt.batch_no,
      expiry_date: opt.expiry_date,
      rate: Number(opt.sell_rate ?? opt.selling_rate),
      qty: Number(qty),
      discount_amount: Number(disc || 0),
      line_total: Math.max(0, Number(qty) * Number(opt.sell_rate ?? opt.selling_rate) - Number(disc || 0)),
    };

    setCart((c) => [...c, line]);
    setSelected(null);
    setBatchId("");
    setStockOptions([]);
    setStockHint("");
    setQty(1);
    setDisc(0);
    setQuery("");
  };

  const removeLine = (id) => setCart(c => c.filter(x => x.id !== id));

  const total = useMemo(() => cart.reduce((s, x) => s + Number(x.line_total), 0), [cart]);
  const payableNow = useMemo(
    () => payments.reduce((s, p) => (p.mode === "CREDIT" ? s : s + Number(p.amount || 0)), 0),
    [payments]
  );
  const dueAmount = useMemo(
    () => Math.max(0, Number(total || 0) - Number(isCreditSale ? 0 : payableNow)),
    [total, payableNow, isCreditSale]
  );

  useEffect(() => {
    if (isCreditSale) return;
    setPayments((p) => p.map((x, idx) => (idx === 0 && x.mode !== "CREDIT" ? { ...x, amount: total } : x)));
  }, [total, isCreditSale]);

  const openPdf = async (invoiceId, { download = false } = {}) => {
    const res = await api.get(endpoints.invoicePdf(invoiceId), { responseType: "blob" });
    const blob = new Blob([res.data], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    if (download) {
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const createBill = async () => {
    if (cart.length === 0) return alert("Add items");
    if (!customer.name.trim()) return alert("Customer name required");
    const validPayments = isCreditSale
      ? []
      : payments
          .filter((p) => p.mode !== "CREDIT" && Number(p.amount || 0) > 0)
          .map((p) => ({ mode: p.mode, amount: Number(p.amount), ref_no: p.ref_no || null }));
    const paySum = validPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    if (!isCreditSale && paySum <= 0) return alert("Payment required");

    setCreating(true);
    try {
      const res = await api.post(endpoints.invoices, {
        customer: { name: customer.name, phone: customer.phone || null },
        doctor_name: doctorName || null,
        prescription_id: prescriptionId ? Number(prescriptionId) : null,
        items: cart.map(c => ({ batch_id: c.batch_id, qty: c.qty, discount_amount: c.discount_amount })),
        payments: validPayments,
      });
      setLastInvoice(res.data);
      setCart([]);
      setCustomer({ name: "", phone: "" });
      setDoctorName("");
      setPrescriptionId("");
      setIsCreditSale(false);
      setPayments([{ mode: "CASH", amount: 0, ref_no: "" }]);
      setQuery("");
      toast.success(`Bill created: ${res.data.invoice_no}`);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Billing failed");
    } finally {
      setCreating(false);
    }
  };

  const uploadPrescriptionInline = async (file) => {
    if (!file) return;
    setRxUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (doctorName) fd.append("doctor_name", doctorName);
      fd.append("notes", "Uploaded from POS");
      const res = await api.post(endpoints.prescriptionUpload, fd);
      const created = res.data;
      if (created?.id) {
        setPrescriptionId(String(created.id));
      }
      const list = await api.get(endpoints.prescriptions);
      setPrescriptions(list.data || []);
      toast.success("Prescription uploaded and attached");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Prescription upload failed");
    } finally {
      setRxUploading(false);
    }
  };

  const cartCols = useMemo(() => [
    { key: "medicine_name", label: "Medicine" },
    { key: "batch_no", label: "Batch" },
    { key: "expiry_date", label: "Expiry" },
    { key: "qty", label: "Qty" },
    { key: "rate", label: "Rate" },
    { key: "discount_amount", label: "Discount" },
    { key: "line_total", label: "Total" },
    { key: "actions", label: "", render: (r) => (
      <Button variant="danger" onClick={() => removeLine(r.id)}>Remove</Button>
    )}
  ], []);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Billing POS" />
          <CardBody>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="relative">
                <Input
                  label="Search medicine (name / barcode)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type medicine or scan barcode"
                />
                {suggest.length > 0 ? (
                  <div className="absolute z-10 mt-1 w-full rounded-2xl border border-slate-200 bg-white shadow-lg max-h-64 overflow-auto">
                    {suggest.slice(0, 20).map((m) => (
                      <button
                        key={m.id}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                        onClick={() => pickMedicine(m)}
                      >
                        <div className="font-semibold text-slate-900">{m.name}</div>
                        <div className="text-xs text-slate-500">{m.salt || "—"} • {m.schedule_type}</div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <Select label="Batch (in stock)" value={batchId} onChange={(e)=>setBatchId(e.target.value)}>
                <option value="">Select</option>
                {stockOptions.map((b) => (
                  <option key={b.batch_id} value={b.batch_id}>
                    {b.batch_no} • Exp {b.expiry_date} • Qty {b.available_qty ?? b.qty} • Rate {b.sell_rate ?? b.selling_rate}
                  </option>
                ))}
              </Select>
              {stockHint ? <div className="text-xs text-amber-700">{stockHint}</div> : null}

              <Input label="Qty" type="number" value={qty} onChange={(e)=>setQty(e.target.value)} />
              <Input label="Discount (₹)" type="number" value={disc} onChange={(e)=>setDisc(e.target.value)} />

              <div className="md:col-span-2">
                <Button onClick={addToCart}>Add Item</Button>
              </div>
            </div>

            <div className="mt-6">
              <Table columns={cartCols} rows={cart} rowKey="id" />
            </div>

            <div className="mt-4 flex justify-end text-lg font-extrabold">
              Total: ₹{total.toFixed(2)}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Customer & Payment" />
          <CardBody>
            <div className="space-y-3">
              <Input label="Customer Name" value={customer.name} onChange={(e)=>setCustomer(c=>({...c, name:e.target.value}))} />
              <Input label="Customer Phone (optional)" value={customer.phone} onChange={(e)=>setCustomer(c=>({...c, phone:e.target.value}))} />
              <Input label="Doctor Name (optional)" value={doctorName} onChange={(e)=>setDoctorName(e.target.value)} />
              <Select label="Attach Existing Prescription" value={prescriptionId} onChange={(e) => setPrescriptionId(e.target.value)}>
                <option value="">None</option>
                {prescriptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.id} - {p.customer_name || "No customer"} - {p.doctor_name || "No doctor"}
                  </option>
                ))}
              </Select>
              <label className="block">
                <div className="mb-1 text-sm font-medium text-slate-700">Upload Prescription Inline</div>
                <input
                  className="w-full rounded-2xl border border-slate-200/80 bg-white/90 px-3.5 py-2.5 text-sm"
                  type="file"
                  accept="image/*,.pdf"
                  disabled={rxUploading}
                  onChange={(e) => uploadPrescriptionInline(e.target.files?.[0])}
                />
              </label>

              <div className="pt-2 border-t border-slate-100" />

              <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={isCreditSale}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsCreditSale(checked);
                    if (checked) {
                      setPayments([{ mode: "CREDIT", amount: 0, ref_no: "" }]);
                    } else {
                      setPayments([{ mode: "CASH", amount: total, ref_no: "" }]);
                    }
                  }}
                />
                Credit Sale (collect payment later)
              </label>

              {payments.map((p, idx) => (
                <div key={idx} className="grid gap-2 md:grid-cols-2">
                  <Select
                    label="Mode"
                    value={p.mode}
                    onChange={(e)=>setPayments(arr => arr.map((x,i)=> i===idx ? { ...x, mode:e.target.value } : x))}
                    disabled={isCreditSale}
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="CREDIT">Credit</option>
                  </Select>
                  <Input label="Amount" type="number" value={p.amount} disabled={isCreditSale || p.mode === "CREDIT"} onChange={(e)=>setPayments(arr => arr.map((x,i)=> i===idx ? { ...x, amount:e.target.value } : x))} />
                  <div className="md:col-span-2">
                    <Input label="Ref No (optional)" disabled={isCreditSale || p.mode === "CREDIT"} value={p.ref_no} onChange={(e)=>setPayments(arr => arr.map((x,i)=> i===idx ? { ...x, ref_no:e.target.value } : x))} />
                  </div>
                </div>
              ))}

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={isCreditSale}
                  onClick={() => setPayments(p => [...p, { mode: "UPI", amount: 0, ref_no: "" }])}
                >
                  + Split Payment
                </Button>
                {payments.length > 1 ? (
                  <Button
                    variant="secondary"
                    onClick={() => setPayments(p => p.slice(0, -1))}
                  >
                    Remove Last
                  </Button>
                ) : null}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Bill Total</span>
                  <span className="font-semibold">{`₹${Number(total || 0).toFixed(2)}`}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-slate-500">Paid Now</span>
                  <span className="font-semibold">{`₹${Number(isCreditSale ? 0 : payableNow).toFixed(2)}`}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-slate-500">Due Amount</span>
                  <span className="font-semibold text-warning-500">{`₹${Number(dueAmount).toFixed(2)}`}</span>
                </div>
              </div>

              <Button className="w-full" onClick={createBill} disabled={creating}>
                {creating ? "Creating..." : "Create Bill"}
              </Button>

              {lastInvoice ? (
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 text-sm space-y-2">
                  <div className="font-semibold">Last Invoice</div>
                  <div className="text-slate-700">{lastInvoice.invoice_no}</div>
                  <div className="text-slate-500">Total ₹{Number(lastInvoice.total).toFixed(2)}</div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="secondary" onClick={() => navigate(`/invoices?invoiceId=${lastInvoice.id}`)}>View Invoice</Button>
                    <Button variant="secondary" onClick={() => openPdf(lastInvoice.id, { download: true }).catch((e) => toast.error(e?.response?.data?.message || "PDF failed"))}>Download PDF</Button>
                  </div>
                </div>
              ) : null}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

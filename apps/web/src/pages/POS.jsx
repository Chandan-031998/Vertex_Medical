import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/http.js";
import { endpoints } from "../api/endpoints.js";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import Select from "../components/ui/Select.jsx";
import { Card, CardHeader, CardBody } from "../components/ui/Card.jsx";
import Table from "../components/ui/Table.jsx";

export default function POS() {
  const [query, setQuery] = useState("");
  const [suggest, setSuggest] = useState([]);
  const [stockOptions, setStockOptions] = useState([]);

  const [selected, setSelected] = useState(null);
  const [batchId, setBatchId] = useState("");
  const [qty, setQty] = useState(1);
  const [disc, setDisc] = useState(0);

  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [doctorName, setDoctorName] = useState("");

  const [payments, setPayments] = useState([{ mode: "CASH", amount: 0, ref_no: "" }]);
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

  const pickMedicine = async (m) => {
    setSelected(m);
    setSuggest([]);
    setQuery(m.name);

    // Load stock rows filtered by medicine name, then pick those for this medicine
    const st = await api.get(endpoints.stock, { params: { q: m.name }});
    const rows = (st.data || []).filter(r => r.medicine_id === m.id && Number(r.qty) > 0);
    rows.sort((a,b)=> String(a.expiry_date).localeCompare(String(b.expiry_date)));
    setStockOptions(rows);
    setBatchId(rows?.[0]?.batch_id ? String(rows[0].batch_id) : "");
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
      rate: Number(opt.selling_rate),
      qty: Number(qty),
      discount_amount: Number(disc || 0),
      line_total: Math.max(0, Number(qty) * Number(opt.selling_rate) - Number(disc || 0)),
    };

    setCart((c) => [...c, line]);
    setSelected(null);
    setBatchId("");
    setStockOptions([]);
    setQty(1);
    setDisc(0);
    setQuery("");
  };

  const removeLine = (id) => setCart(c => c.filter(x => x.id !== id));

  const total = useMemo(() => cart.reduce((s, x) => s + Number(x.line_total), 0), [cart]);

  useEffect(() => {
    setPayments((p) => p.map((x, idx) => idx === 0 ? { ...x, amount: total } : x));
  }, [total]);

  const createBill = async () => {
    if (cart.length === 0) return alert("Add items");
    if (!customer.name.trim()) return alert("Customer name required");
    const paySum = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    if (paySum <= 0) return alert("Payment required");

    setCreating(true);
    try {
      const res = await api.post(endpoints.invoices, {
        customer: { name: customer.name, phone: customer.phone || null },
        doctor_name: doctorName || null,
        items: cart.map(c => ({ batch_id: c.batch_id, qty: c.qty, discount_amount: c.discount_amount })),
        payments: payments.map(p => ({ mode: p.mode, amount: Number(p.amount), ref_no: p.ref_no || null })),
      });
      setLastInvoice(res.data);
      setCart([]);
      setCustomer({ name: "", phone: "" });
      setDoctorName("");
      setQuery("");
      alert(`Bill created: ${res.data.invoice_no}`);
    } catch (e) {
      alert(e?.response?.data?.message || "Billing failed");
    } finally {
      setCreating(false);
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
                    {b.batch_no} • Exp {b.expiry_date} • Qty {b.qty} • Rate {b.selling_rate}
                  </option>
                ))}
              </Select>

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

              <div className="pt-2 border-t border-slate-100" />

              {payments.map((p, idx) => (
                <div key={idx} className="grid gap-2 md:grid-cols-2">
                  <Select label="Mode" value={p.mode} onChange={(e)=>setPayments(arr => arr.map((x,i)=> i===idx ? { ...x, mode:e.target.value } : x))}>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                  </Select>
                  <Input label="Amount" type="number" value={p.amount} onChange={(e)=>setPayments(arr => arr.map((x,i)=> i===idx ? { ...x, amount:e.target.value } : x))} />
                  <div className="md:col-span-2">
                    <Input label="Ref No (optional)" value={p.ref_no} onChange={(e)=>setPayments(arr => arr.map((x,i)=> i===idx ? { ...x, ref_no:e.target.value } : x))} />
                  </div>
                </div>
              ))}

              <div className="flex gap-2">
                <Button
                  variant="secondary"
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

              <Button className="w-full" onClick={createBill} disabled={creating}>
                {creating ? "Creating..." : "Create Bill"}
              </Button>

              {lastInvoice ? (
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 text-sm">
                  <div className="font-semibold">Last Invoice</div>
                  <div className="text-slate-700 mt-1">{lastInvoice.invoice_no}</div>
                  <div className="text-slate-500">Total ₹{Number(lastInvoice.total).toFixed(2)}</div>
                </div>
              ) : null}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

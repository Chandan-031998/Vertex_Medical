import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/http.js";
import { endpoints } from "../api/endpoints.js";
import { Card, CardHeader, CardBody } from "../components/ui/Card.jsx";
import Table from "../components/ui/Table.jsx";
import Button from "../components/ui/Button.jsx";
import Modal from "../components/ui/Modal.jsx";
import Input from "../components/ui/Input.jsx";
import Select from "../components/ui/Select.jsx";
import { useToast } from "../components/ui/ToastProvider.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

export default function Purchases() {
  const toast = useToast();
  const auth = useAuth();
  const [rows, setRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [meds, setMeds] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnSaving, setReturnSaving] = useState(false);
  const [returnTarget, setReturnTarget] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState("");

  const [form, setForm] = useState({
    supplier_id: "",
    invoice_no: "",
    invoice_date: today(),
    items: [
      { medicine_id:"", batch_no:"", expiry_date:"", qty:1, purchase_rate:0, mrp:0, selling_rate:0, gst_rate:12 }
    ]
  });

  const load = async () => {
    const r = await api.get(endpoints.purchaseInvoices);
    setRows(r.data || []);
    const s = await api.get(endpoints.suppliers);
    setSuppliers(s.data || []);
    const m = await api.get(endpoints.medicines, { params: { page: 1, pageSize: 1000 }});
    setMeds(m.data.rows || []);
  };

  useEffect(() => { load().catch(()=>{}); }, []);

  const cols = useMemo(() => [
    { key: "invoice_no", label: "Invoice No" },
    { key: "invoice_date", label: "Date" },
    { key: "supplier_name", label: "Supplier" },
    { key: "total", label: "Total" },
    { key: "status", label: "Status" },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex gap-2">
          {auth.can("PURCHASE_RETURN") ? (
            <Button variant="secondary" onClick={() => openReturn(r)}>Create Return</Button>
          ) : null}
        </div>
      ),
    },
  ], [auth]);

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { medicine_id:"", batch_no:"", expiry_date:"", qty:1, purchase_rate:0, mrp:0, selling_rate:0, gst_rate:12 }]}));
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_,i)=>i!==idx) }));

  const save = async () => {
    if (!form.supplier_id) return toast.error("Select supplier");
    if (!form.invoice_no.trim()) return toast.error("Invoice no required");
    if (!form.items.length) return toast.error("Add items");
    for (const it of form.items) {
      if (!it.medicine_id || !it.batch_no || !it.expiry_date) return toast.error("Fill item details");
    }

    setSaving(true);
    try {
      await api.post(endpoints.purchaseInvoices, {
        supplier_id: Number(form.supplier_id),
        invoice_no: form.invoice_no,
        invoice_date: form.invoice_date,
        items: form.items.map(it => ({
          medicine_id: Number(it.medicine_id),
          batch_no: it.batch_no,
          expiry_date: it.expiry_date,
          qty: Number(it.qty),
          purchase_rate: Number(it.purchase_rate),
          mrp: Number(it.mrp),
          selling_rate: Number(it.selling_rate),
          gst_rate: Number(it.gst_rate),
        }))
      });
      setOpen(false);
      setForm({ supplier_id:"", invoice_no:"", invoice_date: today(), items:[{ medicine_id:"", batch_no:"", expiry_date:"", qty:1, purchase_rate:0, mrp:0, selling_rate:0, gst_rate:12 }] });
      await load();
      toast.success("Purchase created");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Create purchase failed");
    } finally {
      setSaving(false);
    }
  };

  const openReturn = async (row) => {
    setReturnTarget(row);
    setReturnReason("");
    setReturnItems([]);
    setReturnOpen(true);
    setReturnLoading(true);
    try {
      const r = await api.get(endpoints.purchaseInvoiceById(row.id));
      const items = r?.data?.items || [];
      setReturnItems(items.map((it) => ({
        batch_id: it.batch_id,
        medicine_name: it.medicine_name,
        batch_no: it.batch_no,
        purchased_qty: Number(it.qty || 0),
        returned_qty: Number(it.returned_qty || 0),
        max_qty: Math.max(0, Number(it.qty || 0) - Number(it.returned_qty || 0)),
        return_qty: 0,
      })));
    } catch (e) {
      toast.error(e?.response?.data?.message || "Load purchase details failed");
      setReturnOpen(false);
    } finally {
      setReturnLoading(false);
    }
  };

  const submitReturn = async () => {
    if (!returnTarget?.id) return;
    const payloadItems = returnItems
      .filter((x) => Number(x.return_qty) > 0)
      .map((x) => ({ batch_id: x.batch_id, qty: Number(x.return_qty) }));
    if (!payloadItems.length) {
      toast.error("Enter return qty for at least one item");
      return;
    }
    setReturnSaving(true);
    try {
      await api.post(endpoints.purchaseReturn(returnTarget.id), {
        reason: returnReason || null,
        return_items: payloadItems,
      });
      toast.success("Purchase return created");
      setReturnOpen(false);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Create return failed");
    } finally {
      setReturnSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Purchase Invoices" right={<Button onClick={()=>setOpen(true)}>+ New Purchase</Button>} />
        <CardBody>
          <Table columns={cols} rows={rows} rowKey="id" />
        </CardBody>
      </Card>

      <Modal
        open={open}
        title="New Purchase Invoice"
        onClose={() => setOpen(false)}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Create"}</Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="Supplier" value={form.supplier_id} onChange={(e)=>setForm(f=>({...f, supplier_id:e.target.value}))}>
            <option value="">Select</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Input label="Invoice No" value={form.invoice_no} onChange={(e)=>setForm(f=>({...f, invoice_no:e.target.value}))} />
          <Input label="Invoice Date" value={form.invoice_date} onChange={(e)=>setForm(f=>({...f, invoice_date:e.target.value}))} />
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-slate-900">Items</div>
            <Button variant="secondary" onClick={addItem}>+ Add Item</Button>
          </div>

          {form.items.map((it, idx) => (
            <div key={idx} className="rounded-2xl border border-slate-200 p-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Select label="Medicine" value={it.medicine_id} onChange={(e)=>{
                  const v = e.target.value;
                  setForm(f=>({ ...f, items: f.items.map((x,i)=> i===idx ? { ...x, medicine_id:v } : x) }));
                }}>
                  <option value="">Select</option>
                  {meds.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>

                <Input label="Batch No" value={it.batch_no} onChange={(e)=>setForm(f=>({ ...f, items: f.items.map((x,i)=> i===idx ? { ...x, batch_no:e.target.value } : x) }))} />
                <Input label="Expiry (YYYY-MM-DD)" value={it.expiry_date} onChange={(e)=>setForm(f=>({ ...f, items: f.items.map((x,i)=> i===idx ? { ...x, expiry_date:e.target.value } : x) }))} />

                <Input label="Qty" type="number" value={it.qty} onChange={(e)=>setForm(f=>({ ...f, items: f.items.map((x,i)=> i===idx ? { ...x, qty:e.target.value } : x) }))} />
                <Input label="Purchase Rate" type="number" value={it.purchase_rate} onChange={(e)=>setForm(f=>({ ...f, items: f.items.map((x,i)=> i===idx ? { ...x, purchase_rate:e.target.value } : x) }))} />
                <Input label="GST %" type="number" value={it.gst_rate} onChange={(e)=>setForm(f=>({ ...f, items: f.items.map((x,i)=> i===idx ? { ...x, gst_rate:e.target.value } : x) }))} />

                <Input label="MRP" type="number" value={it.mrp} onChange={(e)=>setForm(f=>({ ...f, items: f.items.map((x,i)=> i===idx ? { ...x, mrp:e.target.value } : x) }))} />
                <Input label="Selling Rate" type="number" value={it.selling_rate} onChange={(e)=>setForm(f=>({ ...f, items: f.items.map((x,i)=> i===idx ? { ...x, selling_rate:e.target.value } : x) }))} />

                <div className="flex items-end">
                  {form.items.length > 1 ? (
                    <Button variant="danger" onClick={() => removeItem(idx)}>Remove</Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        open={returnOpen}
        title={`Create Purchase Return${returnTarget?.invoice_no ? ` - ${returnTarget.invoice_no}` : ""}`}
        onClose={() => setReturnOpen(false)}
        footer={(
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setReturnOpen(false)}>Cancel</Button>
            <Button onClick={submitReturn} disabled={returnSaving || returnLoading}>
              {returnSaving ? "Saving..." : "Create Return"}
            </Button>
          </div>
        )}
      >
        {returnLoading ? (
          <div className="text-sm text-slate-500">Loading purchase items...</div>
        ) : (
          <div className="space-y-3">
            <Input
              label="Reason"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="Optional reason"
            />
            <div className="space-y-2">
              {returnItems.map((it, idx) => (
                <div key={`${it.batch_id}-${idx}`} className="grid gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-5 md:items-end">
                  <div className="md:col-span-2">
                    <div className="text-sm font-medium text-slate-800">{it.medicine_name}</div>
                    <div className="text-xs text-slate-500">Batch: {it.batch_no}</div>
                  </div>
                  <div className="text-sm text-slate-600">Purchased: {it.purchased_qty}</div>
                  <div className="text-sm text-slate-600">Already Returned: {it.returned_qty}</div>
                  <Input
                    label={`Return Qty (max ${it.max_qty})`}
                    type="number"
                    value={it.return_qty}
                    onChange={(e) => {
                      const raw = Number(e.target.value || 0);
                      const bounded = Math.max(0, Math.min(it.max_qty, raw));
                      setReturnItems((prev) => prev.map((x, i) => (i === idx ? { ...x, return_qty: bounded } : x)));
                    }}
                    disabled={it.max_qty <= 0}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

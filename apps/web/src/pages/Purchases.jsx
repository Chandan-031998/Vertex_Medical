import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/http.js";
import { endpoints } from "../api/endpoints.js";
import { Card, CardHeader, CardBody } from "../components/ui/Card.jsx";
import Table from "../components/ui/Table.jsx";
import Button from "../components/ui/Button.jsx";
import Modal from "../components/ui/Modal.jsx";
import Input from "../components/ui/Input.jsx";
import Select from "../components/ui/Select.jsx";

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

export default function Purchases() {
  const [rows, setRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [meds, setMeds] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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
  ], []);

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { medicine_id:"", batch_no:"", expiry_date:"", qty:1, purchase_rate:0, mrp:0, selling_rate:0, gst_rate:12 }]}));
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_,i)=>i!==idx) }));

  const save = async () => {
    if (!form.supplier_id) return alert("Select supplier");
    if (!form.invoice_no.trim()) return alert("Invoice no required");
    if (!form.items.length) return alert("Add items");
    for (const it of form.items) {
      if (!it.medicine_id || !it.batch_no || !it.expiry_date) return alert("Fill item details");
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
    } catch (e) {
      alert(e?.response?.data?.message || "Create purchase failed");
    } finally {
      setSaving(false);
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
    </div>
  );
}

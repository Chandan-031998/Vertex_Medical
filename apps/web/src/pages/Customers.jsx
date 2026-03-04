import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/http.js";
import { endpoints } from "../api/endpoints.js";
import { Card, CardHeader, CardBody } from "../components/ui/Card.jsx";
import Table from "../components/ui/Table.jsx";
import Button from "../components/ui/Button.jsx";
import Modal from "../components/ui/Modal.jsx";
import Input from "../components/ui/Input.jsx";
import Select from "../components/ui/Select.jsx";
import ConfirmModal from "../components/ui/ConfirmModal.jsx";
import { useToast } from "../components/ui/ToastProvider.jsx";

export default function Customers() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [dues, setDues] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState(null);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerRows, setLedgerRows] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "", mode: "CASH", ref_no: "", notes: "" });
  const [form, setForm] = useState({ name:"", phone:"", email:"", address:"" });

  const load = async () => {
    const [r, d] = await Promise.all([
      api.get(endpoints.customers, { params: { q } }),
      api.get(endpoints.reportsCustomerDues, { params: { limit: 200 } }).catch(() => ({ data: [] })),
    ]);
    setRows(r.data || []);
    setDues(d.data || []);
  };

  useEffect(() => { load().catch(()=>{}); }, []);
  useEffect(() => {
    const t = setTimeout(() => { load().catch(()=>{}); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const cols = useMemo(() => [
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "loyalty_points", label: "Points" },
    { key: "credit_balance", label: "Due", render: (r) => `₹${Number(r.credit_balance || 0).toFixed(2)}` },
    { key: "actions", label: "", render: (r) => (
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => startEdit(r)}>Edit</Button>
        <Button variant="secondary" onClick={() => openPayment(r)}>Add Payment</Button>
        <Button variant="secondary" onClick={() => openLedger(r)}>Ledger</Button>
        <Button variant="danger" onClick={() => setConfirmDelete(r)}>Delete</Button>
      </div>
    )},
  ], []);

  const duesCols = useMemo(() => [
    { key: "customer_name", label: "Customer" },
    { key: "customer_phone", label: "Phone" },
    { key: "due_amount", label: "Due Amount", render: (r) => `₹${Number(r.due_amount || 0).toFixed(2)}` },
  ], []);

  const ledgerCols = useMemo(() => [
    { key: "created_at", label: "Date" },
    { key: "ref_type", label: "Ref Type" },
    { key: "notes", label: "Notes", render: (r) => r.notes || "-" },
    { key: "debit", label: "Debit", render: (r) => `₹${Number(r.debit || 0).toFixed(2)}` },
    { key: "credit", label: "Credit", render: (r) => `₹${Number(r.credit || 0).toFixed(2)}` },
  ], []);

  const startCreate = () => {
    setEdit(null);
    setForm({ name:"", phone:"", email:"", address:"" });
    setOpen(true);
  };

  const startEdit = (row) => {
    setEdit(row);
    setForm({
      name: row.name || "",
      phone: row.phone || "",
      email: row.email || "",
      address: row.address || "",
      loyalty_points: row.loyalty_points ?? 0,
      credit_balance: row.credit_balance ?? 0,
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      const payload = {
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
      };
      if (edit?.id) {
        await api.put(`${endpoints.customers}/${edit.id}`, payload);
        toast.success("Customer updated");
      } else {
        await api.post(endpoints.customers, payload);
        toast.success("Customer created");
      }
      setOpen(false);
      setForm({ name:"", phone:"", email:"", address:"" });
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Save customer failed");
    }
  };

  const doDelete = async () => {
    if (!confirmDelete?.id) return;
    setDeleting(true);
    try {
      await api.delete(`${endpoints.customers}/${confirmDelete.id}`);
      toast.success("Customer deleted");
      setConfirmDelete(null);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Delete customer failed");
    } finally {
      setDeleting(false);
    }
  };

  const openPayment = (row) => {
    setPaymentCustomer(row);
    setPaymentForm({ amount: "", mode: "CASH", ref_no: "", notes: "" });
    setPaymentOpen(true);
  };

  const savePayment = async () => {
    if (!paymentCustomer?.id) return;
    const amount = Number(paymentForm.amount || 0);
    if (amount <= 0) return toast.error("Enter valid amount");
    setPaymentSaving(true);
    try {
      await api.post(endpoints.customerPayments(paymentCustomer.id), {
        amount,
        mode: paymentForm.mode,
        ref_no: paymentForm.ref_no || null,
        notes: paymentForm.notes || null,
      });
      toast.success("Customer payment added");
      setPaymentOpen(false);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Add payment failed");
    } finally {
      setPaymentSaving(false);
    }
  };

  const openLedger = async (row) => {
    setLedgerOpen(true);
    setPaymentCustomer(row);
    setLedgerLoading(true);
    try {
      const res = await api.get(endpoints.customerLedger(row.id), { params: { limit: 200 } });
      setLedgerRows(res.data?.rows || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Load ledger failed");
      setLedgerRows([]);
    } finally {
      setLedgerLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Customer Dues" />
        <CardBody>
          <Table columns={duesCols} rows={dues} rowKey="customer_id" emptyText="No outstanding dues" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Customers" right={<Button onClick={startCreate}>+ Add Customer</Button>} />
        <CardBody>
          <div className="mb-4">
            <Input label="Search" value={q} onChange={(e)=>setQ(e.target.value)} />
          </div>
          <Table columns={cols} rows={rows} rowKey="id" />
        </CardBody>
      </Card>

      <Modal open={open} title="Add Customer" onClose={()=>setOpen(false)} footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={()=>setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
      }>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Name" value={form.name} onChange={(e)=>setForm(f=>({...f, name:e.target.value}))} />
          <Input label="Phone" value={form.phone} onChange={(e)=>setForm(f=>({...f, phone:e.target.value}))} />
          <Input label="Email" value={form.email} onChange={(e)=>setForm(f=>({...f, email:e.target.value}))} />
          <div className="md:col-span-2">
            <Input label="Address" value={form.address} onChange={(e)=>setForm(f=>({...f, address:e.target.value}))} />
          </div>
        </div>
      </Modal>

      <Modal
        open={paymentOpen}
        title={paymentCustomer ? `Add Payment - ${paymentCustomer.name}` : "Add Payment"}
        onClose={() => setPaymentOpen(false)}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <Button onClick={savePayment} disabled={paymentSaving}>{paymentSaving ? "Saving..." : "Save Payment"}</Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Amount" type="number" value={paymentForm.amount} onChange={(e)=>setPaymentForm((f)=>({...f, amount: e.target.value}))} />
          <Select label="Mode" value={paymentForm.mode} onChange={(e)=>setPaymentForm((f)=>({...f, mode: e.target.value}))}>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
          </Select>
          <Input label="Reference (optional)" value={paymentForm.ref_no} onChange={(e)=>setPaymentForm((f)=>({...f, ref_no: e.target.value}))} />
          <Input label="Notes (optional)" value={paymentForm.notes} onChange={(e)=>setPaymentForm((f)=>({...f, notes: e.target.value}))} />
        </div>
      </Modal>

      <Modal
        open={ledgerOpen}
        title={paymentCustomer ? `Ledger - ${paymentCustomer.name}` : "Customer Ledger"}
        onClose={() => setLedgerOpen(false)}
      >
        <Table columns={ledgerCols} rows={ledgerRows} rowKey="id" loading={ledgerLoading} emptyText="No ledger entries" />
      </Modal>

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete Customer"
        message={`Delete customer "${confirmDelete?.name || ""}"? This cannot be undone.`}
        confirmText="Delete"
        loading={deleting}
        onConfirm={doDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}

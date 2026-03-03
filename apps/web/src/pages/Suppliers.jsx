import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/http.js";
import { endpoints } from "../api/endpoints.js";
import { Card, CardHeader, CardBody } from "../components/ui/Card.jsx";
import Table from "../components/ui/Table.jsx";
import Button from "../components/ui/Button.jsx";
import Modal from "../components/ui/Modal.jsx";
import Input from "../components/ui/Input.jsx";
import ConfirmModal from "../components/ui/ConfirmModal.jsx";
import { useToast } from "../components/ui/ToastProvider.jsx";

export default function Suppliers() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ name:"", gstin:"", phone:"", email:"", address:"" });

  const load = async () => {
    const r = await api.get(endpoints.suppliers, { params: { q } });
    setRows(r.data || []);
  };

  useEffect(() => { load().catch(()=>{}); }, []);
  useEffect(() => {
    const t = setTimeout(() => { load().catch(()=>{}); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const cols = useMemo(() => [
    { key: "name", label: "Supplier" },
    { key: "gstin", label: "GSTIN" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "actions", label: "", render: (r) => (
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => startEdit(r)}>Edit</Button>
        <Button variant="danger" onClick={() => setConfirmDelete(r)}>Delete</Button>
      </div>
    )},
  ], []);

  const startCreate = () => {
    setEdit(null);
    setForm({ name:"", gstin:"", phone:"", email:"", address:"" });
    setOpen(true);
  };

  const startEdit = (row) => {
    setEdit(row);
    setForm({
      name: row.name || "",
      gstin: row.gstin || "",
      phone: row.phone || "",
      email: row.email || "",
      address: row.address || "",
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      const payload = {
        name: form.name,
        gstin: form.gstin || null,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
      };
      if (edit?.id) {
        await api.put(`${endpoints.suppliers}/${edit.id}`, payload);
        toast.success("Supplier updated");
      } else {
        await api.post(endpoints.suppliers, payload);
        toast.success("Supplier created");
      }
      setOpen(false);
      setForm({ name:"", gstin:"", phone:"", email:"", address:"" });
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Save supplier failed");
    }
  };

  const doDelete = async () => {
    if (!confirmDelete?.id) return;
    setDeleting(true);
    try {
      await api.delete(`${endpoints.suppliers}/${confirmDelete.id}`);
      toast.success("Supplier deleted");
      setConfirmDelete(null);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Delete supplier failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Suppliers" right={<Button onClick={startCreate}>+ Add Supplier</Button>} />
        <CardBody>
          <div className="mb-4">
            <Input label="Search" value={q} onChange={(e)=>setQ(e.target.value)} />
          </div>
          <Table columns={cols} rows={rows} rowKey="id" />
        </CardBody>
      </Card>

      <Modal open={open} title="Add Supplier" onClose={()=>setOpen(false)} footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={()=>setOpen(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </div>
      }>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Name" value={form.name} onChange={(e)=>setForm(f=>({...f, name:e.target.value}))} />
          <Input label="GSTIN" value={form.gstin} onChange={(e)=>setForm(f=>({...f, gstin:e.target.value}))} />
          <Input label="Phone" value={form.phone} onChange={(e)=>setForm(f=>({...f, phone:e.target.value}))} />
          <Input label="Email" value={form.email} onChange={(e)=>setForm(f=>({...f, email:e.target.value}))} />
          <div className="md:col-span-2">
            <Input label="Address" value={form.address} onChange={(e)=>setForm(f=>({...f, address:e.target.value}))} />
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete Supplier"
        message={`Delete supplier "${confirmDelete?.name || ""}"? This cannot be undone.`}
        confirmText="Delete"
        loading={deleting}
        onConfirm={doDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}

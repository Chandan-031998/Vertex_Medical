import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/http.js";
import { endpoints } from "../api/endpoints.js";
import Table from "../components/ui/Table.jsx";
import Button from "../components/ui/Button.jsx";
import Modal from "../components/ui/Modal.jsx";
import Input from "../components/ui/Input.jsx";
import Select from "../components/ui/Select.jsx";
import { Card, CardHeader, CardBody } from "../components/ui/Card.jsx";
import ConfirmModal from "../components/ui/ConfirmModal.jsx";
import { useToast } from "../components/ui/ToastProvider.jsx";

export default function Batches() {
  const toast = useToast();
  const [meds, setMeds] = useState([]);
  const [medicineId, setMedicineId] = useState("");
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    medicine_id: "",
    batch_no: "",
    expiry_date: "",
    mrp: "",
    purchase_rate: "",
    selling_rate: "",
    gst_rate: 12,
  });

  const loadMeds = async () => {
    const res = await api.get(endpoints.medicines, { params: { page: 1, pageSize: 500 }});
    setMeds(res.data.rows || []);
  };

  const loadBatches = async (mid) => {
    const res = await api.get(endpoints.batches, { params: mid ? { medicine_id: mid } : {} });
    setRows(res.data || []);
  };

  useEffect(() => {
    loadMeds().catch(()=>{});
    loadBatches("").catch(()=>{});
  }, []);

  useEffect(() => {
    loadBatches(medicineId).catch(()=>{});
  }, [medicineId]);

  const columns = useMemo(() => [
    { key: "medicine_name", label: "Medicine" },
    { key: "batch_no", label: "Batch" },
    { key: "expiry_date", label: "Expiry" },
    { key: "mrp", label: "MRP" },
    { key: "purchase_rate", label: "Purchase" },
    { key: "selling_rate", label: "Selling" },
    { key: "gst_rate", label: "GST%" },
    { key: "actions", label: "Actions", render: (r) => (
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => startEdit(r)}>Edit</Button>
        <Button variant="danger" onClick={() => setConfirmDelete(r)}>Delete</Button>
      </div>
    ) },
  ], []);

  const startCreate = () => {
    setEdit(null);
    setForm({
      medicine_id: medicineId || "",
      batch_no: "",
      expiry_date: "",
      mrp: "",
      purchase_rate: "",
      selling_rate: "",
      gst_rate: 12,
    });
    setOpen(true);
  };

  const startEdit = (row) => {
    setEdit(row);
    setForm({
      medicine_id: String(row.medicine_id || ""),
      batch_no: row.batch_no || "",
      expiry_date: row.expiry_date || "",
      mrp: row.mrp ?? "",
      purchase_rate: row.purchase_rate ?? "",
      selling_rate: row.selling_rate ?? "",
      gst_rate: row.gst_rate ?? 12,
    });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        medicine_id: Number(form.medicine_id),
        batch_no: form.batch_no,
        expiry_date: form.expiry_date,
        mrp: Number(form.mrp),
        purchase_rate: Number(form.purchase_rate),
        selling_rate: Number(form.selling_rate),
        gst_rate: Number(form.gst_rate),
      };
      if (edit?.id) {
        await api.put(`${endpoints.batches}/${edit.id}`, payload);
        toast.success("Batch updated");
      } else {
        await api.post(endpoints.batches, payload);
        toast.success("Batch created");
      }
      setOpen(false);
      await loadBatches(medicineId);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!confirmDelete?.id) return;
    setDeleting(true);
    try {
      await api.delete(`${endpoints.batches}/${confirmDelete.id}`);
      toast.success("Batch deleted");
      setConfirmDelete(null);
      await loadBatches(medicineId);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Batches" right={<Button onClick={startCreate}>+ Add Batch</Button>} />
        <CardBody>
          <div className="grid gap-3 md:grid-cols-3 mb-4">
            <Select label="Filter by medicine" value={medicineId} onChange={(e)=>setMedicineId(e.target.value)}>
              <option value="">All</option>
              {meds.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </div>
          <Table columns={columns} rows={rows} rowKey="id" />
        </CardBody>
      </Card>

      <Modal
        open={open}
        title={edit ? "Edit Batch" : "Add Batch"}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="Medicine" value={form.medicine_id} onChange={(e)=>setForm(f=>({...f, medicine_id:e.target.value}))}>
            <option value="">Select</option>
            {meds.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
          <Input label="Batch No" value={form.batch_no} onChange={(e)=>setForm(f=>({...f, batch_no:e.target.value}))} />
          <Input label="Expiry Date (YYYY-MM-DD)" value={form.expiry_date} onChange={(e)=>setForm(f=>({...f, expiry_date:e.target.value}))} />
          <Input label="MRP" type="number" value={form.mrp} onChange={(e)=>setForm(f=>({...f, mrp:e.target.value}))} />
          <Input label="Purchase Rate" type="number" value={form.purchase_rate} onChange={(e)=>setForm(f=>({...f, purchase_rate:e.target.value}))} />
          <Input label="Selling Rate" type="number" value={form.selling_rate} onChange={(e)=>setForm(f=>({...f, selling_rate:e.target.value}))} />
          <Input label="GST %" type="number" value={form.gst_rate} onChange={(e)=>setForm(f=>({...f, gst_rate:e.target.value}))} />
        </div>
      </Modal>

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete Batch"
        message={`Delete batch "${confirmDelete?.batch_no || ""}"?`}
        confirmText="Delete"
        loading={deleting}
        onConfirm={doDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}

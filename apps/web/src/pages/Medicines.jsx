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

const schedules = ["OTC","H","H1","X","NARCOTIC"];

export default function Medicines() {
  const toast = useToast();
  const [data, setData] = useState({ rows: [] });
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ name:"", salt:"", manufacturer:"", schedule_type:"OTC", gst_rate:12, reorder_level:0, barcode_primary:"" });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    const res = await api.get(endpoints.medicines, { params: { page: 1, pageSize: 200 }});
    setData(res.data);
  };

  useEffect(() => { load().catch(()=>{}); }, []);

  const columns = useMemo(() => [
    { key: "name", label: "Medicine" },
    { key: "salt", label: "Salt" },
    { key: "manufacturer", label: "Manufacturer" },
    { key: "schedule_type", label: "Schedule" },
    { key: "gst_rate", label: "GST %" },
    { key: "reorder_level", label: "Reorder" },
    { key: "barcode_primary", label: "Barcode" },
    { key: "actions", label: "Actions", render: (r) => (
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => { setEdit(r); setForm({ ...r }); setOpen(true); }}>Edit</Button>
        <Button variant="danger" onClick={() => setConfirmDelete(r)}>Delete</Button>
      </div>
    )},
  ], []);

  const startCreate = () => {
    setEdit(null);
    setForm({ name:"", salt:"", manufacturer:"", schedule_type:"OTC", gst_rate:12, reorder_level:0, barcode_primary:"" });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (edit?.id) {
        await api.put(`${endpoints.medicines}/${edit.id}`, {
          name: form.name, salt: form.salt, manufacturer: form.manufacturer,
          schedule_type: form.schedule_type,
          gst_rate: Number(form.gst_rate),
          reorder_level: Number(form.reorder_level),
          barcode_primary: form.barcode_primary || null,
        });
        toast.success("Medicine updated");
      } else {
        await api.post(endpoints.medicines, {
          name: form.name, salt: form.salt, manufacturer: form.manufacturer,
          schedule_type: form.schedule_type,
          gst_rate: Number(form.gst_rate),
          reorder_level: Number(form.reorder_level),
          barcode_primary: form.barcode_primary || null,
        });
        toast.success("Medicine created");
      }
      setOpen(false);
      await load();
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
      await api.delete(`${endpoints.medicines}/${confirmDelete.id}`);
      toast.success("Medicine deleted");
      setConfirmDelete(null);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Medicines" right={<Button onClick={startCreate}>+ Add Medicine</Button>} />
        <CardBody>
          <Table columns={columns} rows={data.rows || []} />
        </CardBody>
      </Card>

      <Modal
        open={open}
        title={edit ? "Edit Medicine" : "Add Medicine"}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Medicine name" value={form.name || ""} onChange={(e)=>setForm(f=>({...f, name:e.target.value}))} />
          <Input label="Salt composition" value={form.salt || ""} onChange={(e)=>setForm(f=>({...f, salt:e.target.value}))} />
          <Input label="Manufacturer" value={form.manufacturer || ""} onChange={(e)=>setForm(f=>({...f, manufacturer:e.target.value}))} />
          <Select label="Schedule type" value={form.schedule_type || "OTC"} onChange={(e)=>setForm(f=>({...f, schedule_type:e.target.value}))}>
            {schedules.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Input label="GST %" type="number" value={form.gst_rate ?? 0} onChange={(e)=>setForm(f=>({...f, gst_rate:e.target.value}))} />
          <Input label="Reorder level" type="number" value={form.reorder_level ?? 0} onChange={(e)=>setForm(f=>({...f, reorder_level:e.target.value}))} />
          <Input label="Primary Barcode (optional)" value={form.barcode_primary || ""} onChange={(e)=>setForm(f=>({...f, barcode_primary:e.target.value}))} />
        </div>
      </Modal>

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete Medicine"
        message={`Delete medicine "${confirmDelete?.name || ""}"?`}
        confirmText="Delete"
        loading={deleting}
        onConfirm={doDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}

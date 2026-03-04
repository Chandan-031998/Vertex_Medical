import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/http.js";
import { endpoints } from "../api/endpoints.js";
import { Card, CardBody, CardHeader } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import Table from "../components/ui/Table.jsx";
import Modal from "../components/ui/Modal.jsx";
import Input from "../components/ui/Input.jsx";
import { useToast } from "../components/ui/ToastProvider.jsx";

function fmtDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

export default function Prescriptions() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [form, setForm] = useState({ customer_id: "", doctor_name: "", doctor_reg_no: "", notes: "", file: null });

  const load = async () => {
    const res = await api.get(endpoints.prescriptions);
    setRows(res.data || []);
  };

  useEffect(() => {
    load().catch((e) => toast.error(e?.response?.data?.message || "Failed to load prescriptions"));
  }, []);

  const openDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await api.get(endpoints.prescriptionById(id));
      setDetail(res.data || null);
      setDetailOpen(true);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load prescription detail");
    } finally {
      setDetailLoading(false);
    }
  };

  const save = async () => {
    if (!form.file) return toast.error("Please select a file");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("file", form.file);
      if (form.customer_id) fd.append("customer_id", form.customer_id);
      if (form.doctor_name) fd.append("doctor_name", form.doctor_name);
      if (form.doctor_reg_no) fd.append("doctor_reg_no", form.doctor_reg_no);
      if (form.notes) fd.append("notes", form.notes);

      await api.post(endpoints.prescriptionUpload, fd);
      toast.success("Prescription uploaded");
      setOpen(false);
      setForm({ customer_id: "", doctor_name: "", doctor_reg_no: "", notes: "", file: null });
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const cols = useMemo(
    () => [
      { key: "id", label: "ID" },
      { key: "created_at", label: "Date", render: (r) => fmtDate(r.created_at) },
      { key: "customer_name", label: "Customer", render: (r) => r.customer_name || "-" },
      { key: "doctor_name", label: "Doctor", render: (r) => r.doctor_name || "-" },
      { key: "files", label: "Files" },
      { key: "actions", label: "", render: (r) => <Button variant="secondary" onClick={() => openDetail(r.id)}>View</Button> },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Prescriptions" right={<Button onClick={() => setOpen(true)}>+ Upload</Button>} />
        <CardBody>
          <Table columns={cols} rows={rows} rowKey="id" emptyText="No prescriptions" />
        </CardBody>
      </Card>

      <Modal
        open={open}
        title="Upload Prescription"
        onClose={() => setOpen(false)}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Uploading..." : "Upload"}</Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Customer ID (optional)" value={form.customer_id} onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value }))} />
          <Input label="Doctor Name" value={form.doctor_name} onChange={(e) => setForm((f) => ({ ...f, doctor_name: e.target.value }))} />
          <Input label="Doctor Reg No" value={form.doctor_reg_no} onChange={(e) => setForm((f) => ({ ...f, doctor_reg_no: e.target.value }))} />
          <Input label="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          <div className="md:col-span-2">
            <label className="block">
              <div className="mb-1 text-sm font-medium text-slate-700">File</div>
              <input className="w-full rounded-2xl border border-slate-200/80 bg-white/90 px-3.5 py-2.5 text-sm" type="file" accept="image/*,.pdf" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] || null }))} />
            </label>
          </div>
        </div>
      </Modal>

      <Modal open={detailOpen} title={detail ? `Prescription #${detail.id}` : "Prescription"} onClose={() => setDetailOpen(false)}>
        {detailLoading ? (
          <div className="text-sm text-slate-500">Loading...</div>
        ) : !detail ? (
          <div className="text-sm text-slate-500">No details found.</div>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <div><div className="text-slate-500">Customer</div><div className="font-semibold">{detail.customer_name || "-"}</div></div>
              <div><div className="text-slate-500">Doctor</div><div className="font-semibold">{detail.doctor_name || "-"}</div></div>
              <div><div className="text-slate-500">Doctor Reg</div><div className="font-semibold">{detail.doctor_reg_no || "-"}</div></div>
              <div><div className="text-slate-500">Created</div><div className="font-semibold">{fmtDate(detail.created_at)}</div></div>
            </div>
            <div>
              <div className="font-semibold text-slate-900">Files</div>
              {(detail.files || []).length === 0 ? (
                <div className="text-slate-500">No files</div>
              ) : (
                <div className="space-y-1">
                  {(detail.files || []).map((f) => (
                    <a key={f.id} className="block text-brand-600 hover:underline" href={f.file_url} target="_blank" rel="noreferrer">{f.original_name}</a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

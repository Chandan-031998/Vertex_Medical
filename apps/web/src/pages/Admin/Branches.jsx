import React, { useEffect, useMemo, useState } from "react";
import { api, getApiErrorMessage } from "../../api/http.js";
import { endpoints } from "../../api/endpoints.js";
import { Card, CardBody, CardHeader } from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Table from "../../components/ui/Table.jsx";
import { useToast } from "../../components/ui/ToastProvider.jsx";
import { useAuth } from "../../auth/AuthProvider.jsx";

const emptyForm = { name: "", code: "", address: "" };

export default function AdminBranches() {
  const auth = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const canWrite = auth.canAny(["BRANCH_WRITE", "USER_ADMIN"]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoints.adminBranches);
      setRows(res.data || []);
    } catch (e) {
      const msg = getApiErrorMessage(e, "Failed to load branches");
      if (msg) toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || "",
      code: row.code || "",
      address: row.address || "",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Branch name is required");
    if (!form.code.trim()) return toast.error("Branch code is required");
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        address: form.address?.trim() || null,
      };
      if (editing?.id) {
        await api.patch(endpoints.adminBranchById(editing.id), payload);
        toast.success("Branch updated");
      } else {
        await api.post(endpoints.adminBranches, payload);
        toast.success("Branch created");
      }
      setOpen(false);
      setForm(emptyForm);
      setEditing(null);
      await load();
    } catch (e) {
      const msg = getApiErrorMessage(e, editing?.id ? "Update branch failed" : "Create branch failed");
      if (msg) toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      { key: "name", label: "Branch" },
      { key: "code", label: "Code" },
      { key: "address", label: "Address", render: (r) => r.address || "-" },
      { key: "is_active", label: "Status", render: (r) => Number(r.is_active) === 1 ? "Active" : "Inactive" },
      {
        key: "actions",
        label: "",
        render: (r) => (
          <Button variant="secondary" onClick={() => openEdit(r)} disabled={!canWrite}>
            Edit
          </Button>
        ),
      },
    ],
    [canWrite]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Branch Management"
          right={canWrite ? <Button onClick={openCreate}>+ Add Branch</Button> : null}
        />
        <CardBody>
          <Table columns={columns} rows={rows} rowKey="id" loading={loading} emptyText="No branches" />
        </CardBody>
      </Card>

      <Modal
        open={open}
        title={editing ? "Edit Branch" : "Add Branch"}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !canWrite}>
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="Code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          <Input label="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}

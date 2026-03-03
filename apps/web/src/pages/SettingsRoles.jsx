import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/http.js";
import { endpoints } from "../api/endpoints.js";
import { Card, CardBody, CardHeader } from "../components/ui/Card.jsx";
import Table from "../components/ui/Table.jsx";
import Button from "../components/ui/Button.jsx";
import Modal from "../components/ui/Modal.jsx";
import Input from "../components/ui/Input.jsx";
import { useToast } from "../components/ui/ToastProvider.jsx";

const GROUP_TITLES = {
  BRANCH: "Admin / Setup",
  ROLE: "Admin / Setup",
  PERMISSION: "Admin / Setup",
  SETTINGS: "Admin / Setup",
  BILLING: "Billing",
  STOCK: "Inventory",
  DEAD: "Inventory",
  NEAR: "Inventory",
  REPORTS: "Reports",
  GST: "Reports",
  TALLY: "Reports",
  SCHEDULE: "Compliance",
  AUDIT: "Compliance",
  USER: "Admin / Setup",
  DASHBOARD: "General",
  MEDICINE: "Inventory",
  BATCH: "Inventory",
  INVENTORY: "Inventory",
  PURCHASE: "Inventory",
  CUSTOMER: "CRM",
  SUPPLIER: "Inventory",
  COMPLIANCE: "Compliance",
};

function groupPermissions(perms) {
  return perms.reduce((acc, p) => {
    const key = String(p.perm_key || "").split("_")[0];
    const group = GROUP_TITLES[key] || "Other";
    if (!acc[group]) acc[group] = [];
    acc[group].push(p);
    return acc;
  }, {});
}

export default function SettingsRoles() {
  const toast = useToast();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openPerms, setOpenPerms] = useState(false);

  const [createForm, setCreateForm] = useState({ name: "", role_key: "", description: "", active: 1 });
  const [editForm, setEditForm] = useState({ id: null, name: "", role_key: "", description: "", active: 1 });
  const [permRole, setPermRole] = useState(null);
  const [checked, setChecked] = useState(new Set());

  const groups = useMemo(() => groupPermissions(permissions), [permissions]);

  async function load() {
    setLoading(true);
    try {
      const [rolesResp, permsResp] = await Promise.all([
        api.get(endpoints.adminRoles),
        api.get(endpoints.adminPermissions),
      ]);
      setRoles(rolesResp.data || []);
      setPermissions(permsResp.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const columns = useMemo(() => [
    { key: "name", label: "Role" },
    { key: "role_key", label: "Key" },
    { key: "description", label: "Description" },
    { key: "active", label: "Active", render: (r) => Number(r.active) ? "Yes" : "No" },
    { key: "is_system", label: "System", render: (r) => Number(r.is_system) ? "Yes" : "No" },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => openEditRole(r)}>Edit</Button>
          <Button variant="secondary" onClick={() => openPermEditor(r)}>Permissions</Button>
          {!Number(r.is_system) ? <Button variant="danger" onClick={() => deleteRole(r.id)}>Delete</Button> : null}
        </div>
      ),
    },
  ], []);

  function openEditRole(role) {
    setEditForm({
      id: role.id,
      name: role.name || "",
      role_key: role.role_key || "",
      description: role.description || "",
      active: Number(role.active) ? 1 : 0,
    });
    setOpenEdit(true);
  }

  async function openPermEditor(role) {
    try {
      const resp = await api.get(endpoints.adminRolePermissions(role.id));
      const permKeys = (resp.data?.permissions || []).map((p) => p.perm_key);
      setChecked(new Set(permKeys));
      setPermRole(role);
      setOpenPerms(true);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load role permissions");
    }
  }

  async function createRole() {
    try {
      await api.post(endpoints.adminRoles, {
        name: createForm.name,
        role_key: createForm.role_key,
        description: createForm.description || null,
        active: Number(createForm.active),
      });
      setOpenCreate(false);
      setCreateForm({ name: "", role_key: "", description: "", active: 1 });
      toast.success("Role created");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to create role");
    }
  }

  async function updateRole() {
    try {
      await api.patch(`${endpoints.adminRoles}/${editForm.id}`, {
        name: editForm.name,
        role_key: editForm.role_key,
        description: editForm.description || null,
        active: Number(editForm.active),
      });
      setOpenEdit(false);
      toast.success("Role updated");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update role");
    }
  }

  async function deleteRole(id) {
    if (!window.confirm("Delete this role?")) return;
    try {
      await api.delete(`${endpoints.adminRoles}/${id}`);
      toast.success("Role deleted");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to delete role");
    }
  }

  async function savePermissions() {
    if (!permRole) return;
    try {
      await api.put(endpoints.adminRolePermissions(permRole.id), {
        perm_keys: [...checked],
      });
      setOpenPerms(false);
      toast.success("Permissions updated");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to save permissions");
    }
  }

  function togglePerm(key) {
    setChecked((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Roles & Permissions"
          right={<Button onClick={() => setOpenCreate(true)}>+ Create Role</Button>}
        />
        <CardBody>
          {loading ? <div className="text-sm text-slate-500">Loading...</div> : <Table columns={columns} rows={roles} rowKey="id" />}
        </CardBody>
      </Card>

      <Modal
        open={openCreate}
        title="Create Role"
        onClose={() => setOpenCreate(false)}
        footer={(
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setOpenCreate(false)}>Cancel</Button>
            <Button onClick={createRole}>Create</Button>
          </div>
        )}
      >
        <div className="grid gap-3">
          <Input label="Role Name" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="Role Key" value={createForm.role_key} onChange={(e) => setCreateForm((f) => ({ ...f, role_key: e.target.value.toUpperCase() }))} />
          <Input label="Description" value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} />
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={!!createForm.active} onChange={(e) => setCreateForm((f) => ({ ...f, active: e.target.checked ? 1 : 0 }))} />
            Active
          </label>
        </div>
      </Modal>

      <Modal
        open={openEdit}
        title="Edit Role"
        onClose={() => setOpenEdit(false)}
        footer={(
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setOpenEdit(false)}>Cancel</Button>
            <Button onClick={updateRole}>Save</Button>
          </div>
        )}
      >
        <div className="grid gap-3">
          <Input label="Role Name" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="Role Key" value={editForm.role_key} onChange={(e) => setEditForm((f) => ({ ...f, role_key: e.target.value.toUpperCase() }))} />
          <Input label="Description" value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={!!editForm.active} onChange={(e) => setEditForm((f) => ({ ...f, active: e.target.checked ? 1 : 0 }))} />
            Active
          </label>
        </div>
      </Modal>

      <Modal
        open={openPerms}
        title={`Permissions: ${permRole?.name || ""}`}
        onClose={() => setOpenPerms(false)}
        footer={(
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setOpenPerms(false)}>Cancel</Button>
            <Button onClick={savePermissions}>Save Permissions</Button>
          </div>
        )}
      >
        <div className="max-h-[60vh] overflow-auto space-y-4">
          {Object.entries(groups).map(([group, list]) => (
            <div key={group} className="rounded-xl border border-slate-200 p-3">
              <div className="text-sm font-semibold text-slate-900 mb-2">{group}</div>
              <div className="grid gap-2 md:grid-cols-2">
                {list.map((p) => (
                  <label key={p.perm_key} className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={checked.has(p.perm_key)}
                      onChange={() => togglePerm(p.perm_key)}
                    />
                    <span>{p.perm_key}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

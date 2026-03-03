import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/http.js";
import { endpoints } from "../api/endpoints.js";
import { Card, CardHeader, CardBody } from "../components/ui/Card.jsx";
import Table from "../components/ui/Table.jsx";
import Button from "../components/ui/Button.jsx";
import Modal from "../components/ui/Modal.jsx";
import Input from "../components/ui/Input.jsx";
import Select from "../components/ui/Select.jsx";

export default function Admin() {
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);

  const [openUser, setOpenUser] = useState(false);
  const [openBranch, setOpenBranch] = useState(false);

  const [userForm, setUserForm] = useState({ name:"", email:"", phone:"", password:"", role_id:"", branch_id:"" });
  const [branchForm, setBranchForm] = useState({ name:"", code:"", address:"", phone:"" });

  const load = async () => {
    const b = await api.get(endpoints.adminBranches);
    const r = await api.get(endpoints.adminRoles);
    const u = await api.get(endpoints.adminUsers);
    setBranches(b.data || []);
    setRoles(r.data || []);
    setUsers(u.data || []);
  };

  useEffect(() => { load().catch(()=>{}); }, []);

  const userCols = useMemo(() => [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "role_key", label: "Role" },
    { key: "branch_name", label: "Branch" },
    { key: "is_active", label: "Active" },
  ], []);

  const branchCols = useMemo(() => [
    { key: "name", label: "Branch" },
    { key: "code", label: "Code" },
    { key: "phone", label: "Phone" },
    { key: "is_active", label: "Active" },
  ], []);

  const createUser = async () => {
    try {
      await api.post(endpoints.adminUsers, {
        name: userForm.name,
        email: userForm.email,
        phone: userForm.phone || null,
        password: userForm.password,
        role_id: Number(userForm.role_id),
        branch_id: Number(userForm.branch_id),
      });
      setOpenUser(false);
      setUserForm({ name:"", email:"", phone:"", password:"", role_id:"", branch_id:"" });
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || "Create user failed");
    }
  };

  const createBranch = async () => {
    try {
      await api.post(endpoints.adminBranches, {
        name: branchForm.name,
        code: branchForm.code,
        address: branchForm.address || null,
        phone: branchForm.phone || null,
      });
      setOpenBranch(false);
      setBranchForm({ name:"", code:"", address:"", phone:"" });
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || "Create branch failed");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Branches" right={<Button onClick={()=>setOpenBranch(true)}>+ Add Branch</Button>} />
        <CardBody>
          <Table columns={branchCols} rows={branches} rowKey="id" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Users" right={<Button onClick={()=>setOpenUser(true)}>+ Add User</Button>} />
        <CardBody>
          <Table columns={userCols} rows={users} rowKey="id" />
        </CardBody>
      </Card>

      <Modal open={openBranch} title="Add Branch" onClose={()=>setOpenBranch(false)} footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={()=>setOpenBranch(false)}>Cancel</Button>
          <Button onClick={createBranch}>Create</Button>
        </div>
      }>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Name" value={branchForm.name} onChange={(e)=>setBranchForm(f=>({...f, name:e.target.value}))} />
          <Input label="Code" value={branchForm.code} onChange={(e)=>setBranchForm(f=>({...f, code:e.target.value}))} />
          <Input label="Phone" value={branchForm.phone} onChange={(e)=>setBranchForm(f=>({...f, phone:e.target.value}))} />
          <div className="md:col-span-2">
            <Input label="Address" value={branchForm.address} onChange={(e)=>setBranchForm(f=>({...f, address:e.target.value}))} />
          </div>
        </div>
      </Modal>

      <Modal open={openUser} title="Add User" onClose={()=>setOpenUser(false)} footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={()=>setOpenUser(false)}>Cancel</Button>
          <Button onClick={createUser}>Create</Button>
        </div>
      }>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Name" value={userForm.name} onChange={(e)=>setUserForm(f=>({...f, name:e.target.value}))} />
          <Input label="Email" value={userForm.email} onChange={(e)=>setUserForm(f=>({...f, email:e.target.value}))} />
          <Input label="Phone" value={userForm.phone} onChange={(e)=>setUserForm(f=>({...f, phone:e.target.value}))} />
          <Input label="Password" type="password" value={userForm.password} onChange={(e)=>setUserForm(f=>({...f, password:e.target.value}))} />
          <Select label="Role" value={userForm.role_id} onChange={(e)=>setUserForm(f=>({...f, role_id:e.target.value}))}>
            <option value="">Select</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name} ({r.role_key})</option>)}
          </Select>
          <Select label="Branch" value={userForm.branch_id} onChange={(e)=>setUserForm(f=>({...f, branch_id:e.target.value}))}>
            <option value="">Select</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
          </Select>
        </div>
      </Modal>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getApiErrorMessage } from "../api/http.js";
import { endpoints } from "../api/endpoints.js";
import { Card, CardBody, CardHeader } from "../components/ui/Card.jsx";
import Input from "../components/ui/Input.jsx";
import Select from "../components/ui/Select.jsx";
import Button from "../components/ui/Button.jsx";
import Table from "../components/ui/Table.jsx";
import Modal from "../components/ui/Modal.jsx";
import { useToast } from "../components/ui/ToastProvider.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";

function fmtDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

export default function StockTransfers() {
  const auth = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [branches, setBranches] = useState([]);
  const [stock, setStock] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ to_branch_id: "", batch_id: "", qty: 1, note: "" });
  const fromBranchId = Number(auth.user?.branch_id || 0);

  const getWithFallback = async (urls, config) => {
    let lastErr;
    for (const url of urls) {
      try {
        return await api.get(url, config);
      } catch (e) {
        if (e?.response?.status !== 404) throw e;
        e.__suppressToast = true;
        lastErr = e;
      }
    }
    throw lastErr || new Error("Route not found");
  };

  const load = async () => {
    const [b, s, t] = await Promise.all([
      getWithFallback([endpoints.branches, endpoints.inventoryBranches, endpoints.adminBranches]),
      api.get(endpoints.inventoryTransferBatches, { params: { from_branch_id: fromBranchId || undefined } }),
      getWithFallback([endpoints.inventoryTransfers, "/api/inventory/transfer"], { params: { limit: 200 } }),
    ]);
    setBranches((b.data || []).filter((x) => Number(x.is_active ?? 1) === 1));
    setStock((s.data || []).filter((x) => Number(x.available_qty || x.qty || 0) > 0));
    setTransfers(t.data || []);
  };

  useEffect(() => {
    if (!fromBranchId) return;
    load().catch((e) => {
      const msg = getApiErrorMessage(e, "Failed to load transfers");
      if (msg) toast.error(msg);
    });
  }, [fromBranchId]);

  const submit = async () => {
    if (!form.to_branch_id) return toast.error("Select destination branch");
    if (!form.batch_id) return toast.error("Select batch");
    if (Number(form.qty) <= 0) return toast.error("Enter valid qty");

    setSaving(true);
    try {
      await api.post(endpoints.transferStock, {
        to_branch_id: Number(form.to_branch_id),
        items: [{ batch_id: Number(form.batch_id), qty: Number(form.qty) }],
        note: form.note || null,
      });
      toast.success("Stock transferred");
      setForm({ to_branch_id: "", batch_id: "", qty: 1, note: "" });
      await load();
    } catch (e) {
      const msg = getApiErrorMessage(e, "Transfer failed");
      if (msg) toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (id) => {
    try {
      const res = await getWithFallback([endpoints.inventoryTransferById(id), `/api/inventory/transfer/${id}`]);
      setDetail(res.data || null);
      setDetailOpen(true);
    } catch (e) {
      const msg = getApiErrorMessage(e, "Failed to load transfer detail");
      if (msg) toast.error(msg);
    }
  };

  const transferCols = useMemo(
    () => [
      { key: "transfer_no", label: "Transfer No" },
      { key: "created_at", label: "Date", render: (r) => fmtDate(r.created_at) },
      { key: "from_branch_name", label: "From" },
      { key: "to_branch_name", label: "To" },
      { key: "total_qty", label: "Qty" },
      { key: "status", label: "Status" },
      { key: "actions", label: "", render: (r) => <Button variant="secondary" onClick={() => openDetail(r.id)}>View</Button> },
    ],
    []
  );

  const detailCols = useMemo(
    () => [
      { key: "medicine_name", label: "Medicine" },
      { key: "batch_no", label: "Batch" },
      { key: "qty", label: "Qty" },
    ],
    []
  );

  const toBranches = branches.filter((b) => Number(b.id) !== fromBranchId);
  const fromBranchName = branches.find((b) => Number(b.id) === fromBranchId)?.name || `Branch #${fromBranchId}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Transfer Stock" />
        <CardBody>
          <div className="grid gap-3 md:grid-cols-4">
            <Input label="From Branch" value={fromBranchId ? `${fromBranchName} (${fromBranchId})` : "Current"} disabled />
            <Select label="To Branch" value={form.to_branch_id} onChange={(e) => setForm((f) => ({ ...f, to_branch_id: e.target.value }))}>
              <option value="">Select</option>
              {toBranches.map((b) => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </Select>
            <Select label="Batch" value={form.batch_id} onChange={(e) => setForm((f) => ({ ...f, batch_id: e.target.value }))}>
              <option value="">Select</option>
              {stock.map((s) => (
                <option key={s.batch_id} value={s.batch_id}>
                  {s.medicine_name} / {s.batch_no} / Exp {s.expiry_date || s.expiry || "-"} / Qty {s.available_qty ?? s.qty}
                </option>
              ))}
            </Select>
            <Input label="Qty" type="number" value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))} />
            <div className="md:col-span-3">
              <Input label="Note" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
            <div className="flex items-end">
              <Button onClick={submit} disabled={saving || !auth.canAny(["STOCK_TRANSFER_CREATE", "INVENTORY_WRITE"])}>{saving ? "Submitting..." : "Submit Transfer"}</Button>
            </div>
          </div>
          {toBranches.length === 0 ? (
            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <span>Add another branch to enable transfers.</span>
              {auth.canAny(["BRANCH_READ", "USER_ADMIN"]) ? (
                <Button variant="secondary" onClick={() => navigate("/admin/branches")}>
                  Manage Branches
                </Button>
              ) : null}
            </div>
          ) : null}
          {stock.length === 0 ? (
            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
              <span>No stock available. Add stock via Purchases or Inventory Adjust.</span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => navigate("/purchases")}>
                  Go to Purchases
                </Button>
                <Button variant="secondary" onClick={() => navigate("/inventory")}>
                  Go to Inventory
                </Button>
              </div>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Transfer List" />
        <CardBody>
          <Table columns={transferCols} rows={transfers} rowKey="id" emptyText="No transfers" />
        </CardBody>
      </Card>

      <Modal open={detailOpen} title={detail?.transfer?.transfer_no || "Transfer Detail"} onClose={() => setDetailOpen(false)}>
        {detail ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
              <div><div className="text-slate-500">From</div><div className="font-semibold">{detail.transfer?.from_branch_name}</div></div>
              <div><div className="text-slate-500">To</div><div className="font-semibold">{detail.transfer?.to_branch_name}</div></div>
              <div><div className="text-slate-500">Date</div><div className="font-semibold">{fmtDate(detail.transfer?.created_at)}</div></div>
              <div><div className="text-slate-500">Status</div><div className="font-semibold">{detail.transfer?.status}</div></div>
            </div>
            <Table columns={detailCols} rows={detail.items || []} rowKey="id" />
          </div>
        ) : (
          <div className="text-sm text-slate-500">No details found.</div>
        )}
      </Modal>
    </div>
  );
}

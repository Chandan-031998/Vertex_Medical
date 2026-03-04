import React, { useEffect, useMemo, useState } from "react";
import { api, getApiErrorMessage } from "../api/http.js";
import { endpoints } from "../api/endpoints.js";
import Table from "../components/ui/Table.jsx";
import Button from "../components/ui/Button.jsx";
import Modal from "../components/ui/Modal.jsx";
import Input from "../components/ui/Input.jsx";
import { Card, CardHeader, CardBody } from "../components/ui/Card.jsx";
import ConfirmModal from "../components/ui/ConfirmModal.jsx";
import { useToast } from "../components/ui/ToastProvider.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useNavigate } from "react-router-dom";

export default function Inventory() {
  const auth = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [stock, setStock] = useState([]);
  const [low, setLow] = useState([]);
  const [near, setNear] = useState([]);
  const [adjustments, setAdjustments] = useState([]);

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjust, setAdjust] = useState({ batch_id: "", qty_delta: 0, reason: "" });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const bootstrapped = React.useRef(false);

  const load = async () => {
    const s = await api.get(endpoints.stock, { params: { q }});
    setStock(s.data || []);
    const l = await api.get(endpoints.lowStock);
    setLow(l.data || []);
    const n = await api.get(endpoints.nearExpiry, { params: { days: 60 }});
    setNear(n.data || []);
    const a = await api.get(endpoints.inventoryAdjustments, { params: { limit: 100 }});
    setAdjustments(a.data || []);
  };

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    load().catch((e) => {
      const msg = getApiErrorMessage(e, "Failed to load inventory");
      if (msg) toast.error(msg);
    });
  }, []); // initial
  useEffect(() => {
    const t = setTimeout(() => { load().catch(()=>{}); }, 400);
    return () => clearTimeout(t);
  }, [q]);

  const stockCols = useMemo(() => [
    { key: "medicine_name", label: "Medicine" },
    { key: "batch_no", label: "Batch" },
    { key: "expiry_date", label: "Expiry" },
    { key: "qty", label: "Qty" },
    { key: "selling_rate", label: "Sell" },
    { key: "mrp", label: "MRP" },
    { key: "actions", label: "Actions", render: (r) => (
      <Button variant="secondary" onClick={() => { setAdjust({ batch_id: r.batch_id, qty_delta: 0, reason: "" }); setAdjustOpen(true); }}>
        Adjust
      </Button>
    )},
  ], []);

  const lowCols = useMemo(() => [
    { key: "name", label: "Medicine" },
    { key: "qty", label: "Qty" },
    { key: "reorder_level", label: "Reorder Level" },
  ], []);

  const nearCols = useMemo(() => [
    { key: "medicine_name", label: "Medicine" },
    { key: "batch_no", label: "Batch" },
    { key: "expiry_date", label: "Expiry" },
    { key: "qty", label: "Qty" },
    { key: "schedule_type", label: "Schedule" },
    { key: "is_blocked", label: "Blocked", render: (r) => Number(r.is_blocked || 0) === 1 ? "Yes" : "No" },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex gap-2">
          {auth.canAny(["INVENTORY_WRITE", "NEAR_EXPIRY_VIEW"]) ? (
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await api.post(endpoints.blockBatch, { batch_id: Number(r.batch_id), blocked: Number(r.is_blocked || 0) !== 1 });
                  toast.success(Number(r.is_blocked || 0) === 1 ? "Batch unblocked" : "Batch blocked");
                  await load();
                } catch (e) {
                  const msg = getApiErrorMessage(e, "Block batch failed");
                  if (msg) toast.error(msg);
                }
              }}
            >
              {Number(r.is_blocked || 0) === 1 ? "Unblock Batch" : "Block Batch"}
            </Button>
          ) : null}
          {auth.canAny(["INVENTORY_WRITE", "STOCK_ADJUST_CREATE", "DEAD_STOCK_VIEW"]) ? (
            <Button
              variant="danger"
              onClick={async () => {
                const qtyStr = window.prompt(`Mark dead stock qty for batch ${r.batch_no}`, "1");
                const qty = Number(qtyStr || 0);
                if (!qty || qty <= 0) return;
                const reason = window.prompt("Reason", "Expired / damaged") || "Dead stock";
                try {
                  await api.post(endpoints.markDeadStock, { batch_id: Number(r.batch_id), qty, reason });
                  toast.success("Marked as dead stock");
                  await load();
                } catch (e) {
                  const msg = getApiErrorMessage(e, "Mark dead stock failed");
                  if (msg) toast.error(msg);
                }
              }}
            >
              Mark Dead Stock
            </Button>
          ) : null}
        </div>
      ),
    },
  ], []);

  const adjCols = useMemo(() => [
    { key: "id", label: "ID" },
    { key: "medicine_name", label: "Medicine" },
    { key: "batch_no", label: "Batch" },
    { key: "qty_delta", label: "Qty Delta" },
    { key: "reason", label: "Reason" },
    { key: "created_at", label: "Created At" },
    { key: "actions", label: "", render: (r) => (
      <Button variant="danger" onClick={() => setConfirmDelete(r)}>Delete</Button>
    ) },
  ], []);

  const doAdjust = async () => {
    try {
      await api.post(endpoints.adjustStock, {
        batch_id: Number(adjust.batch_id),
        qty_delta: Number(adjust.qty_delta),
        reason: adjust.reason,
      });
      setAdjustOpen(false);
      toast.success("Stock adjusted");
      await load();
    } catch (e) {
      const msg = getApiErrorMessage(e, "Adjust failed");
      if (msg) toast.error(msg);
    }
  };

  const doDeleteAdjustment = async () => {
    if (!confirmDelete?.id) return;
    setDeleting(true);
    try {
      await api.delete(endpoints.inventoryAdjustmentById(confirmDelete.id));
      toast.success("Adjustment deleted");
      setConfirmDelete(null);
      await load();
    } catch (e) {
      const msg = getApiErrorMessage(e, "Delete adjustment failed");
      if (msg) toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Inventory Stock (Batch-wise)"
          right={
            auth.canAny(["STOCK_TRANSFER_CREATE", "INVENTORY_WRITE"]) ? (
              <Button variant="secondary" onClick={() => navigate("/inventory/transfers")}>Transfer Stock</Button>
            ) : null
          }
        />
        <CardBody>
          <div className="mb-4">
            <Input label="Search (medicine / salt / batch / barcode)" value={q} onChange={(e)=>setQ(e.target.value)} />
          </div>
          <Table columns={stockCols} rows={stock} rowKey="stock_id" />
        </CardBody>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Low Stock" />
          <CardBody>
            <Table columns={lowCols} rows={low} rowKey="medicine_id" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Near Expiry (60 days)" />
          <CardBody>
            <Table columns={nearCols} rows={near} rowKey="batch_id" />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent Inventory Adjustments" />
        <CardBody>
          <Table columns={adjCols} rows={adjustments} rowKey="id" />
        </CardBody>
      </Card>

      <Modal
        open={adjustOpen}
        title="Adjust Stock"
        onClose={() => setAdjustOpen(false)}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button onClick={doAdjust}>Apply</Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Batch ID" value={adjust.batch_id} onChange={(e)=>setAdjust(a=>({...a, batch_id:e.target.value}))} />
          <Input label="Qty Delta (+/-)" type="number" value={adjust.qty_delta} onChange={(e)=>setAdjust(a=>({...a, qty_delta:e.target.value}))} />
          <div className="md:col-span-2">
            <Input label="Reason" value={adjust.reason} onChange={(e)=>setAdjust(a=>({...a, reason:e.target.value}))} />
          </div>
          <div className="text-xs text-slate-500 md:col-span-2">
            Use negative delta to reduce stock (damage/expired), positive to correct missing stock.
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete Adjustment"
        message={`Delete adjustment #${confirmDelete?.id || ""}? Stock will be reversed.`}
        confirmText="Delete"
        loading={deleting}
        onConfirm={doDeleteAdjustment}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}

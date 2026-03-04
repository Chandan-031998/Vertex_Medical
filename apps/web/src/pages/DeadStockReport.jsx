import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/http.js";
import { endpoints } from "../api/endpoints.js";
import { Card, CardBody, CardHeader } from "../components/ui/Card.jsx";
import Table from "../components/ui/Table.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import { useToast } from "../components/ui/ToastProvider.jsx";

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

export default function DeadStockReport() {
  const toast = useToast();
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoints.reportsDeadStock, { params: { from: from || undefined, to: to || undefined, limit: 500 } });
      setRows(res.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load dead stock report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const cols = useMemo(
    () => [
      { key: "created_at", label: "Date", render: (r) => fmtDate(r.created_at) },
      { key: "medicine_name", label: "Medicine" },
      { key: "batch_no", label: "Batch" },
      { key: "qty", label: "Dead Qty" },
      { key: "reason", label: "Reason" },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Dead Stock Report"
          right={
            <div className="flex gap-2">
              <Input type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)} />
              <Input type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)} />
              <div className="flex items-end">
                <Button variant="secondary" onClick={() => load().catch(() => {})}>Apply</Button>
              </div>
            </div>
          }
        />
        <CardBody>
          <Table columns={cols} rows={rows} rowKey="id" loading={loading} emptyText="No dead stock in selected period" />
        </CardBody>
      </Card>
    </div>
  );
}

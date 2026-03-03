import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/http.js";
import { endpoints } from "../api/endpoints.js";
import { Card, CardHeader, CardBody } from "../components/ui/Card.jsx";
import Table from "../components/ui/Table.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

export default function Compliance() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(today());
  const [rows, setRows] = useState([]);

  const load = async () => {
    const r = await api.get(endpoints.scheduleH1, { params: { from: from || undefined, to: to || undefined }});
    setRows(r.data || []);
  };

  useEffect(() => { load().catch(()=>{}); }, []);

  const cols = useMemo(() => [
    { key: "sold_at", label: "Sold At" },
    { key: "invoice_no", label: "Invoice" },
    { key: "medicine_name", label: "Medicine" },
    { key: "batch_no", label: "Batch" },
    { key: "qty", label: "Qty" },
    { key: "customer_name", label: "Customer" },
    { key: "customer_phone", label: "Phone" },
    { key: "doctor_name", label: "Doctor" },
  ], []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Schedule H1 Register" right={
          <div className="flex gap-2">
            <Input label="From" value={from} onChange={(e)=>setFrom(e.target.value)} placeholder="YYYY-MM-DD" />
            <Input label="To" value={to} onChange={(e)=>setTo(e.target.value)} placeholder="YYYY-MM-DD" />
            <div className="flex items-end">
              <Button variant="secondary" onClick={()=>load().catch(()=>{})}>Apply</Button>
            </div>
          </div>
        } />
        <CardBody>
          <Table columns={cols} rows={rows} rowKey="id" />
        </CardBody>
      </Card>
    </div>
  );
}

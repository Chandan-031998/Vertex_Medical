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

export default function Reports() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(today());
  const [sales, setSales] = useState([]);
  const [top, setTop] = useState([]);
  const [val, setVal] = useState([]);

  const load = async () => {
    const s = await api.get(endpoints.dashboard).catch(()=>({data:null}));
    // ignore
    const sale = await api.get("/api/reports/sales-summary", { params: { from: from || undefined, to: to || undefined }});
    setSales(sale.data || []);
    const tp = await api.get("/api/reports/top-selling", { params: { from: from || undefined, to: to || undefined, limit: 10 }});
    setTop(tp.data || []);
    const v = await api.get("/api/reports/stock-valuation");
    setVal(v.data || []);
  };

  useEffect(() => { load().catch(()=>{}); }, []);

  const salesCols = useMemo(() => [
    { key: "day", label: "Date" },
    { key: "bills", label: "Bills" },
    { key: "total_sales", label: "Total Sales" },
  ], []);

  const topCols = useMemo(() => [
    { key: "name", label: "Medicine" },
    { key: "qty_sold", label: "Qty Sold" },
    { key: "sales", label: "Sales" },
  ], []);

  const valCols = useMemo(() => [
    { key: "name", label: "Medicine" },
    { key: "qty", label: "Qty" },
    { key: "purchase_value", label: "Purchase Value" },
    { key: "mrp_value", label: "MRP Value" },
  ], []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Reports" right={
          <div className="flex gap-2">
            <Input label="From" value={from} onChange={(e)=>setFrom(e.target.value)} placeholder="YYYY-MM-DD" />
            <Input label="To" value={to} onChange={(e)=>setTo(e.target.value)} placeholder="YYYY-MM-DD" />
            <div className="flex items-end">
              <Button variant="secondary" onClick={()=>load().catch(()=>{})}>Apply</Button>
            </div>
          </div>
        } />
        <CardBody>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <div className="font-semibold text-slate-900 mb-2">Sales Summary</div>
              <Table columns={salesCols} rows={sales} rowKey="day" />
            </div>
            <div>
              <div className="font-semibold text-slate-900 mb-2">Top Selling</div>
              <Table columns={topCols} rows={top} rowKey="medicine_id" />
            </div>
          </div>

          <div className="mt-6">
            <div className="font-semibold text-slate-900 mb-2">Stock Valuation (Current Branch)</div>
            <Table columns={valCols} rows={val} rowKey="medicine_id" />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

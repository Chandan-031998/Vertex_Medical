import React, { useEffect, useMemo, useState } from "react";
import { api, getApiErrorMessage } from "../api/http.js";
import { endpoints } from "../api/endpoints.js";
import { Card, CardHeader, CardBody } from "../components/ui/Card.jsx";
import Table from "../components/ui/Table.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import { useToast } from "../components/ui/ToastProvider.jsx";

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString();
}

function toNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

export default function Reports() {
  const toast = useToast();
  const [from, setFrom] = useState(daysAgo(7));
  const [to, setTo] = useState(today());
  const [sales, setSales] = useState([]);
  const [top, setTop] = useState([]);
  const [salesDetails, setSalesDetails] = useState([]);
  const [val, setVal] = useState([]);
  const [gstSales, setGstSales] = useState({ slabs: [], totals: {} });
  const [gstPurchase, setGstPurchase] = useState({ slabs: [], totals: {} });
  const [gstr3b, setGstr3b] = useState({ outward: {}, inward: {}, net: {} });
  const [gstInlineError, setGstInlineError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setGstInlineError("");
    try {
      // Use stable endpoints only for faster and error-free loading across backend builds.
      const [salesRes, topRes, invoicesRes, valuationRes, gstSummaryRes] = await Promise.all([
        api.get("/api/reports/sales-summary", { params: { from: from || undefined, to: to || undefined } }),
        api.get("/api/reports/top-selling", { params: { from: from || undefined, to: to || undefined, limit: 10 } }),
        api.get(endpoints.invoices, { params: { from: from || undefined, to: to || undefined, page: 1, pageSize: 100 } }),
        api.get("/api/reports/stock-valuation"),
        api.get(endpoints.reportsGstSummary, { params: { from: from || undefined, to: to || undefined } }),
      ]);

      setSales(salesRes.data || []);
      setTop(topRes.data || []);
      setVal(valuationRes.data || []);

      const salesRows = (invoicesRes.data?.rows || []).map((r) => ({
        invoice_id: r.id,
        invoice_no: r.invoice_no,
        invoice_date: r.invoice_date,
        customer_name: r.customer_name || "Walk-in Customer",
        customer_phone: r.customer_phone || "-",
        status: r.status,
        total: toNumber(r.total),
        payment_total: toNumber(r.amount_paid),
        amount_due: toNumber(r.amount_due),
        payment_modes: "-",
        payment_refs: "-",
        last_paid_at: r.invoice_date,
      }));
      setSalesDetails(salesRows);

      const gstSummary = gstSummaryRes.data || {};
      setGstr3b(gstSummary || { outward: {}, inward: {}, net: {} });
      setGstSales({
        slabs: gstSummary?.slabs?.sales || [],
        totals: gstSummary?.outward || {},
      });
      setGstPurchase({
        slabs: gstSummary?.slabs?.purchase || [],
        totals: gstSummary?.inward || {},
      });
    } catch (e) {
      const msg = getApiErrorMessage(e, "Load reports failed");
      if (msg) toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load().catch(()=>{}); }, []);

  const salesCols = useMemo(() => [
    { key: "day", label: "Date", render: (r) => formatDate(r.day) },
    { key: "bills", label: "Bills" },
    { key: "total_sales", label: "Total Sales", render: (r) => toNumber(r.total_sales).toFixed(2) },
  ], []);

  const topCols = useMemo(() => [
    { key: "name", label: "Medicine" },
    { key: "qty_sold", label: "Qty Sold" },
    { key: "sales", label: "Sales", render: (r) => toNumber(r.sales).toFixed(2) },
  ], []);

  const valCols = useMemo(() => [
    { key: "name", label: "Medicine" },
    { key: "qty", label: "Qty" },
    { key: "purchase_value", label: "Purchase Value", render: (r) => toNumber(r.purchase_value).toFixed(2) },
    { key: "mrp_value", label: "MRP Value", render: (r) => toNumber(r.mrp_value).toFixed(2) },
  ], []);

  const salesDetailCols = useMemo(() => [
    { key: "invoice_no", label: "Invoice" },
    { key: "invoice_date", label: "Date & Time", render: (r) => formatDateTime(r.invoice_date) },
    { key: "customer_name", label: "Customer", render: (r) => r.customer_name || "Walk-in Customer" },
    { key: "customer_phone", label: "Phone", render: (r) => r.customer_phone || "-" },
    { key: "status", label: "Status" },
    { key: "total", label: "Bill Total", render: (r) => toNumber(r.total).toFixed(2) },
    { key: "payment_total", label: "Paid", render: (r) => toNumber(r.payment_total).toFixed(2) },
    { key: "amount_due", label: "Due", render: (r) => toNumber(r.amount_due).toFixed(2) },
    { key: "payment_modes", label: "Payment Mode(s)" },
    { key: "payment_refs", label: "Reference(s)" },
    { key: "last_paid_at", label: "Last Payment At", render: (r) => formatDateTime(r.last_paid_at) },
  ], []);

  const gstCols = useMemo(() => [
    { key: "gst_rate", label: "GST %" },
    { key: "taxable_value", label: "Taxable Value" },
    { key: "cgst", label: "CGST" },
    { key: "sgst", label: "SGST" },
    { key: "gst_total", label: "GST Total" },
    { key: "invoice_value", label: "Invoice Value" },
  ], []);

  const downloadGstr1 = async () => {
    try {
      const r = await api.get(endpoints.reportsGstr1Csv, {
        params: { from: from || undefined, to: to || undefined },
        responseType: "blob",
      });
      const blob = new Blob([r.data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gstr1_${from || "from"}_${to || "to"}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("GSTR1 CSV downloaded");
    } catch (e) {
      if (e?.response?.status === 404) {
        setGstInlineError("GSTR1 CSV export is not available on this backend build.");
      } else {
        const msg = getApiErrorMessage(e, "Download GSTR1 failed");
        if (msg) toast.error(msg);
      }
    }
  };

  const downloadGstSummaryCsv = () => {
    const lines = ["type,gst_rate,taxable_value,cgst,sgst,gst_total,invoice_value"];
    (gstSales.slabs || []).forEach((r) => {
      lines.push(`sales,${r.gst_rate},${r.taxable_value},${r.cgst},${r.sgst},${r.gst_total},${r.invoice_value}`);
    });
    (gstPurchase.slabs || []).forEach((r) => {
      lines.push(`purchase,${r.gst_rate},${r.taxable_value},${r.cgst},${r.sgst},${r.gst_total},${r.invoice_value}`);
    });
    const blob = new Blob([`${lines.join("\n")}\n`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gst_summary_${from || "from"}_${to || "to"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("GST summary CSV downloaded");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Reports" right={
          <div className="flex gap-2">
            <Input type="date" label="From" value={from} onChange={(e)=>setFrom(e.target.value)} />
            <Input type="date" label="To" value={to} onChange={(e)=>setTo(e.target.value)} />
            <div className="flex items-end">
              <Button variant="secondary" onClick={()=>load().catch(()=>{})}>Apply</Button>
            </div>
          </div>
        } />
        <CardBody>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <div className="font-semibold text-slate-900 mb-2">Sales Summary</div>
              <Table columns={salesCols} rows={sales} rowKey="day" loading={loading} />
            </div>
            <div>
              <div className="font-semibold text-slate-900 mb-2">Top Selling</div>
              <Table columns={topCols} rows={top} rowKey="medicine_id" loading={loading} />
            </div>
          </div>

          <div className="mt-6">
            <div className="font-semibold text-slate-900 mb-2">Sales Details</div>
            <Table columns={salesDetailCols} rows={salesDetails} rowKey="invoice_id" loading={loading} emptyText="No sales transactions in selected date range" />
          </div>

          <div className="mt-6">
            <div className="font-semibold text-slate-900 mb-2">Stock Valuation (Current Branch)</div>
            <Table columns={valCols} rows={val} rowKey="medicine_id" loading={loading} />
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="font-semibold text-slate-900">GST Reports</div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={downloadGstSummaryCsv}>Download GST Summary CSV</Button>
                <Button onClick={downloadGstr1}>Download GSTR1 CSV</Button>
              </div>
            </div>
            {gstInlineError ? (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {gstInlineError}
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-500">Sales Taxable</div>
                <div className="text-lg font-semibold text-slate-900">{Number(gstSales.totals?.taxable_value || 0).toFixed(2)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-500">Sales GST</div>
                <div className="text-lg font-semibold text-slate-900">{Number(gstSales.totals?.gst_total || 0).toFixed(2)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-500">Purchase GST ITC</div>
                <div className="text-lg font-semibold text-slate-900">{Number(gstPurchase.totals?.gst_total || 0).toFixed(2)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-500">Net GST Payable</div>
                <div className="text-lg font-semibold text-slate-900">{Number(gstr3b.net?.gst_payable || 0).toFixed(2)}</div>
              </div>
            </div>

            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div>
                <div className="mb-2 font-medium text-slate-900">GST Sales By Slab</div>
                <Table columns={gstCols} rows={gstSales.slabs || []} rowKey="gst_rate" loading={loading} />
              </div>
              <div>
                <div className="mb-2 font-medium text-slate-900">GST Purchase By Slab</div>
                <Table columns={gstCols} rows={gstPurchase.slabs || []} rowKey="gst_rate" loading={loading} />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

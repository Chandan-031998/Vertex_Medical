import { pool } from "../../db/pool.js";
import { todayISO } from "../../utils/dates.js";

export async function dashboard(org_id, branch_id) {
  const today = todayISO();

  const [[sales]] = await pool.execute(
    `SELECT COALESCE(SUM(total),0) AS sales_total, COUNT(*) AS bills
     FROM invoices
     WHERE org_id=? AND branch_id=? AND DATE(invoice_date)=? AND status <> 'VOID'`,
    [org_id, branch_id, today]
  );

  const [[dues]] = await pool.execute(
    `SELECT COALESCE(SUM(amount_due),0) AS due_total, COUNT(*) AS due_bills
     FROM invoices
     WHERE org_id=? AND branch_id=? AND amount_due > 0 AND status IN ('DUE','PARTIAL')`,
    [org_id, branch_id]
  );

  const [[lowStock]] = await pool.execute(
    `SELECT COUNT(*) AS low_count
     FROM (
        SELECT m.id, m.reorder_level, COALESCE(SUM(s.qty),0) AS qty
        FROM medicines m
        LEFT JOIN batches b ON b.medicine_id=m.id
        LEFT JOIN stock s ON s.batch_id=b.id AND s.branch_id=? AND s.org_id=?
        WHERE m.org_id=? AND m.is_active=1
        GROUP BY m.id
        HAVING qty <= m.reorder_level
     ) t`,
    [branch_id, org_id, org_id]
  );

  const [[nearExp]] = await pool.execute(
    `SELECT COUNT(*) AS near_expiry_count
     FROM stock s
     JOIN batches b ON b.id=s.batch_id
     WHERE s.org_id=? AND s.branch_id=? AND s.qty>0
       AND b.expiry_date BETWEEN ? AND DATE_ADD(?, INTERVAL 60 DAY)`,
    [org_id, branch_id, today, today]
  );

  return {
    today_sales_total: sales.sales_total,
    today_bills: sales.bills,
    due_total: dues.due_total,
    due_bills: dues.due_bills,
    low_stock_count: lowStock.low_count,
    near_expiry_count: nearExp.near_expiry_count,
  };
}

export async function salesSummary(org_id, branch_id, { from, to }) {
  const params = [org_id, branch_id];
  let where = "WHERE org_id=? AND branch_id=? AND status <> 'VOID'";
  if (from) { where += " AND DATE(COALESCE(invoice_date, created_at)) >= ?"; params.push(from); }
  if (to) { where += " AND DATE(COALESCE(invoice_date, created_at)) <= ?"; params.push(to); }

  const [rows] = await pool.execute(
    `SELECT DATE(COALESCE(invoice_date, created_at)) AS day, COUNT(*) AS bills, COALESCE(SUM(total),0) AS total_sales
     FROM invoices
     ${where}
     GROUP BY DATE(COALESCE(invoice_date, created_at))
     ORDER BY day DESC
     LIMIT 365`,
    params
  );
  return rows;
}

export async function topSelling(org_id, branch_id, { from, to, limit }) {
  const params = [org_id, branch_id];
  let where = "WHERE i.org_id=? AND i.branch_id=? AND i.status <> 'VOID'";
  if (from) { where += " AND DATE(COALESCE(i.invoice_date, i.created_at)) >= ?"; params.push(from); }
  if (to) { where += " AND DATE(COALESCE(i.invoice_date, i.created_at)) <= ?"; params.push(to); }

  const [rows] = await pool.execute(
    `SELECT m.id AS medicine_id, m.name, SUM(ii.qty) AS qty_sold, COALESCE(SUM(ii.line_total),0) AS sales
     FROM invoice_items ii
     JOIN invoices i ON i.id = ii.invoice_id
     JOIN medicines m ON m.id = ii.medicine_id
     ${where}
     GROUP BY m.id
     ORDER BY qty_sold DESC
     LIMIT ?`,
    [...params, limit]
  );
  return rows;
}

export async function stockValuation(org_id, branch_id) {
  const [rows] = await pool.execute(
    `SELECT m.id AS medicine_id, m.name,
            SUM(s.qty) AS qty,
            COALESCE(SUM(s.qty * b.purchase_rate),0) AS purchase_value,
            COALESCE(SUM(s.qty * b.mrp),0) AS mrp_value
     FROM stock s
     JOIN batches b ON b.id=s.batch_id
     JOIN medicines m ON m.id=b.medicine_id
     WHERE s.org_id=? AND s.branch_id=? AND s.qty>0
     GROUP BY m.id
     ORDER BY purchase_value DESC
     LIMIT 500`,
    [org_id, branch_id]
  );
  return rows;
}

export async function salesDetails(org_id, branch_id, { from, to, limit }) {
  const params = [org_id, branch_id];
  let where = "WHERE i.org_id=? AND i.branch_id=? AND i.status <> 'VOID'";
  if (from) {
    where += " AND DATE(COALESCE(i.invoice_date, i.created_at)) >= ?";
    params.push(from);
  }
  if (to) {
    where += " AND DATE(COALESCE(i.invoice_date, i.created_at)) <= ?";
    params.push(to);
  }

  const [rows] = await pool.execute(
    `SELECT
      i.id AS invoice_id,
      i.invoice_no,
      i.invoice_date,
      i.status,
      i.total,
      i.amount_paid,
      i.amount_due,
      c.name AS customer_name,
      c.phone AS customer_phone,
      COALESCE(pay.total_paid, 0) AS payment_total,
      COALESCE(pay.payment_modes, '-') AS payment_modes,
      COALESCE(pay.payment_refs, '-') AS payment_refs,
      pay.last_paid_at
     FROM invoices i
     LEFT JOIN customers c ON c.id = i.customer_id
     LEFT JOIN (
        SELECT
          p.invoice_id,
          SUM(p.amount) AS total_paid,
          GROUP_CONCAT(DISTINCT p.mode ORDER BY p.mode SEPARATOR ', ') AS payment_modes,
          GROUP_CONCAT(DISTINCT COALESCE(NULLIF(p.ref_no, ''), '-') ORDER BY p.ref_no SEPARATOR ', ') AS payment_refs,
          MAX(p.paid_at) AS last_paid_at
        FROM payments p
        GROUP BY p.invoice_id
     ) pay ON pay.invoice_id = i.id
     ${where}
     ORDER BY i.invoice_date DESC
     LIMIT ?`,
    [...params, limit]
  );

  return rows;
}

export async function customerDues(org_id, branch_id, { limit }) {
  try {
    const [rows] = await pool.execute(
      `SELECT
         c.id AS customer_id,
         c.name AS customer_name,
         c.phone AS customer_phone,
         COALESCE(SUM(cl.debit - cl.credit), 0) AS due_amount
       FROM customers c
       LEFT JOIN customer_ledger cl
         ON cl.customer_id = c.id
        AND cl.org_id = c.org_id
        AND cl.branch_id = ?
       WHERE c.org_id=? AND c.deleted_at IS NULL
       GROUP BY c.id
       HAVING due_amount > 0
       ORDER BY due_amount DESC
       LIMIT ?`,
      [branch_id, org_id, limit]
    );
    return rows;
  } catch (e) {
    if (e?.code !== "ER_NO_SUCH_TABLE") throw e;
    const [rows] = await pool.execute(
      `SELECT
         c.id AS customer_id,
         c.name AS customer_name,
         c.phone AS customer_phone,
         COALESCE(SUM(i.amount_due), 0) AS due_amount
       FROM customers c
       JOIN invoices i
         ON i.customer_id = c.id
        AND i.org_id = c.org_id
        AND i.branch_id = ?
        AND i.status IN ('DUE', 'PARTIAL')
       WHERE c.org_id=? AND c.deleted_at IS NULL
       GROUP BY c.id
       HAVING due_amount > 0
       ORDER BY due_amount DESC
       LIMIT ?`,
      [branch_id, org_id, limit]
    );
    return rows;
  }
}

export async function deadStock(org_id, branch_id, { from, to, limit }) {
  const params = [org_id, branch_id];
  let dateWhere = "";
  if (from) {
    dateWhere += " AND DATE(ds.created_at) >= ?";
    params.push(from);
  }
  if (to) {
    dateWhere += " AND DATE(ds.created_at) <= ?";
    params.push(to);
  }

  try {
    const [rows] = await pool.execute(
      `SELECT ds.id, ds.created_at, ds.qty, ds.reason,
              b.id AS batch_id, b.batch_no, m.id AS medicine_id, m.name AS medicine_name
       FROM dead_stock_records ds
       JOIN batches b ON b.id = ds.batch_id
       JOIN medicines m ON m.id = b.medicine_id
       WHERE ds.org_id=? AND ds.branch_id=?
       ${dateWhere}
       ORDER BY ds.id DESC
       LIMIT ?`,
      [...params, limit]
    );
    return rows;
  } catch (e) {
    if (e?.code !== "ER_NO_SUCH_TABLE") throw e;
    const fallbackParams = [org_id, branch_id];
    let fallbackWhere = "WHERE sm.org_id=? AND sm.branch_id=? AND sm.ref_table='dead_stock' AND sm.deleted_at IS NULL";
    if (from) {
      fallbackWhere += " AND DATE(sm.created_at) >= ?";
      fallbackParams.push(from);
    }
    if (to) {
      fallbackWhere += " AND DATE(sm.created_at) <= ?";
      fallbackParams.push(to);
    }
    const [rows] = await pool.execute(
      `SELECT sm.id, sm.created_at, ABS(sm.qty_delta) AS qty, sm.reason,
              b.id AS batch_id, b.batch_no, m.id AS medicine_id, m.name AS medicine_name
       FROM stock_movements sm
       JOIN batches b ON b.id = sm.batch_id
       JOIN medicines m ON m.id = b.medicine_id
       ${fallbackWhere}
       ORDER BY sm.id DESC
       LIMIT ?`,
      [...fallbackParams, limit]
    );
    return rows;
  }
}

export async function supplierDues(org_id, branch_id, { limit }) {
  try {
    const [rows] = await pool.execute(
      `SELECT
         s.id AS supplier_id,
         s.name AS supplier_name,
         s.phone AS supplier_phone,
         COALESCE(pur.purchase_total, 0) AS purchase_total,
         COALESCE(ret.return_total, 0) AS return_total,
         COALESCE(pay.paid_total, 0) AS paid_total,
         (COALESCE(pur.purchase_total, 0) - COALESCE(ret.return_total, 0) - COALESCE(pay.paid_total, 0)) AS due_amount
       FROM suppliers s
       LEFT JOIN (
         SELECT supplier_id, SUM(total) AS purchase_total
         FROM purchase_invoices
         WHERE org_id=? AND branch_id=?
         GROUP BY supplier_id
       ) pur ON pur.supplier_id = s.id
       LEFT JOIN (
         SELECT pi.supplier_id, SUM(pri.amount) AS return_total
         FROM purchase_returns pr
         JOIN purchase_invoices pi ON pi.id = pr.purchase_id
         JOIN purchase_return_items pri ON pri.purchase_return_id = pr.id
         WHERE pr.org_id=? AND pr.branch_id=? AND pr.status='POSTED'
         GROUP BY pi.supplier_id
       ) ret ON ret.supplier_id = s.id
       LEFT JOIN (
         SELECT supplier_id, SUM(amount) AS paid_total
         FROM supplier_payments
         WHERE org_id=? AND branch_id=?
         GROUP BY supplier_id
       ) pay ON pay.supplier_id = s.id
       WHERE s.org_id=? AND s.deleted_at IS NULL
       HAVING due_amount > 0
       ORDER BY due_amount DESC
       LIMIT ?`,
      [org_id, branch_id, org_id, branch_id, org_id, branch_id, org_id, limit]
    );
    return rows;
  } catch (e) {
    if (e?.code !== "ER_NO_SUCH_TABLE") throw e;
    const [rows] = await pool.execute(
      `SELECT
         s.id AS supplier_id,
         s.name AS supplier_name,
         s.phone AS supplier_phone,
         COALESCE(SUM(pi.total), 0) AS due_amount
       FROM suppliers s
       LEFT JOIN purchase_invoices pi
         ON pi.supplier_id = s.id
        AND pi.org_id = s.org_id
        AND pi.branch_id = ?
       WHERE s.org_id=? AND s.deleted_at IS NULL
       GROUP BY s.id
       HAVING due_amount > 0
       ORDER BY due_amount DESC
       LIMIT ?`,
      [branch_id, org_id, limit]
    );
    return rows;
  }
}

function gstDateFilter(alias, col, { from, to }, params) {
  let where = "";
  if (from) {
    where += ` AND DATE(${alias}.${col}) >= ?`;
    params.push(from);
  }
  if (to) {
    where += ` AND DATE(${alias}.${col}) <= ?`;
    params.push(to);
  }
  return where;
}

async function gstBySlabSales(org_id, branch_id, input) {
  const params = [org_id, branch_id];
  const where = gstDateFilter("i", "invoice_date", input, params);
  const [rows] = await pool.execute(
    `SELECT
       ROUND(ii.gst_rate, 2) AS gst_rate,
       ROUND(SUM(ii.line_total - ii.tax_amount), 2) AS taxable_value,
       ROUND(SUM(ii.tax_amount / 2), 2) AS cgst,
       ROUND(SUM(ii.tax_amount / 2), 2) AS sgst,
       ROUND(SUM(ii.tax_amount), 2) AS gst_total,
       ROUND(SUM(ii.line_total), 2) AS invoice_value
     FROM invoice_items ii
     JOIN invoices i ON i.id = ii.invoice_id
     WHERE i.org_id=? AND i.branch_id=? AND i.status <> 'VOID'
     ${where}
     GROUP BY ROUND(ii.gst_rate, 2)
     ORDER BY gst_rate ASC`,
    params
  );
  return rows;
}

async function gstBySlabPurchase(org_id, branch_id, input) {
  const params = [org_id, branch_id];
  const where = gstDateFilter("pi", "invoice_date", input, params);
  const [rows] = await pool.execute(
    `SELECT
       ROUND(pit.gst_rate, 2) AS gst_rate,
       ROUND(SUM(pit.line_total - pit.tax_amount), 2) AS taxable_value,
       ROUND(SUM(pit.tax_amount / 2), 2) AS cgst,
       ROUND(SUM(pit.tax_amount / 2), 2) AS sgst,
       ROUND(SUM(pit.tax_amount), 2) AS gst_total,
       ROUND(SUM(pit.line_total), 2) AS invoice_value
     FROM purchase_items pit
     JOIN purchase_invoices pi ON pi.id = pit.purchase_invoice_id
     WHERE pi.org_id=? AND pi.branch_id=? AND pi.status <> 'CANCELLED'
     ${where}
     GROUP BY ROUND(pit.gst_rate, 2)
     ORDER BY gst_rate ASC`,
    params
  );
  return rows;
}

function sumGst(rows = []) {
  return rows.reduce(
    (acc, r) => {
      acc.taxable_value += Number(r.taxable_value || 0);
      acc.cgst += Number(r.cgst || 0);
      acc.sgst += Number(r.sgst || 0);
      acc.gst_total += Number(r.gst_total || 0);
      acc.invoice_value += Number(r.invoice_value || 0);
      return acc;
    },
    { taxable_value: 0, cgst: 0, sgst: 0, gst_total: 0, invoice_value: 0 }
  );
}

export async function gstSales(org_id, branch_id, input) {
  const slabs = await gstBySlabSales(org_id, branch_id, input);
  return {
    slabs,
    totals: sumGst(slabs),
  };
}

export async function gstPurchase(org_id, branch_id, input) {
  const slabs = await gstBySlabPurchase(org_id, branch_id, input);
  return {
    slabs,
    totals: sumGst(slabs),
  };
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function gstr1Csv(org_id, branch_id, input) {
  const params = [org_id, branch_id];
  const where = gstDateFilter("i", "invoice_date", input, params);
  const [rows] = await pool.execute(
    `SELECT
       i.invoice_no,
       DATE(i.invoice_date) AS invoice_date,
       COALESCE(c.name, 'Walk-in') AS customer_name,
       '' AS customer_gstin,
       ROUND(ii.gst_rate, 2) AS gst_rate,
       ROUND(SUM(ii.line_total - ii.tax_amount), 2) AS taxable_value,
       ROUND(SUM(ii.tax_amount / 2), 2) AS cgst,
       ROUND(SUM(ii.tax_amount / 2), 2) AS sgst,
       ROUND(SUM(ii.tax_amount), 2) AS gst_total,
       ROUND(SUM(ii.line_total), 2) AS invoice_value
     FROM invoice_items ii
     JOIN invoices i ON i.id = ii.invoice_id
     LEFT JOIN customers c ON c.id = i.customer_id
     WHERE i.org_id=? AND i.branch_id=? AND i.status <> 'VOID'
     ${where}
     GROUP BY i.id, DATE(i.invoice_date), c.name, ROUND(ii.gst_rate, 2)
     ORDER BY i.invoice_date ASC, i.id ASC`,
    params
  );

  const headers = [
    "invoice_no",
    "invoice_date",
    "customer_name",
    "customer_gstin",
    "gst_rate",
    "taxable_value",
    "cgst",
    "sgst",
    "gst_total",
    "invoice_value",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    const line = [
      r.invoice_no,
      r.invoice_date,
      r.customer_name,
      r.customer_gstin,
      r.gst_rate,
      r.taxable_value,
      r.cgst,
      r.sgst,
      r.gst_total,
      r.invoice_value,
    ].map(csvEscape).join(",");
    lines.push(line);
  }
  return `${lines.join("\n")}\n`;
}

export async function gstr3bSummary(org_id, branch_id, input) {
  const [sales, purchase] = await Promise.all([
    gstBySlabSales(org_id, branch_id, input),
    gstBySlabPurchase(org_id, branch_id, input),
  ]);
  const outward = sumGst(sales);
  const inward = sumGst(purchase);
  const net = {
    cgst_payable: Number((outward.cgst - inward.cgst).toFixed(2)),
    sgst_payable: Number((outward.sgst - inward.sgst).toFixed(2)),
    gst_payable: Number((outward.gst_total - inward.gst_total).toFixed(2)),
  };
  return {
    outward,
    inward,
    net,
    slabs: {
      sales,
      purchase,
    },
  };
}

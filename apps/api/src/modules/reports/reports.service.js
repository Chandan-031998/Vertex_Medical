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
  if (from) { where += " AND DATE(invoice_date) >= ?"; params.push(from); }
  if (to) { where += " AND DATE(invoice_date) <= ?"; params.push(to); }

  const [rows] = await pool.execute(
    `SELECT DATE(invoice_date) AS day, COUNT(*) AS bills, COALESCE(SUM(total),0) AS total_sales
     FROM invoices
     ${where}
     GROUP BY DATE(invoice_date)
     ORDER BY day DESC
     LIMIT 365`,
    params
  );
  return rows;
}

export async function topSelling(org_id, branch_id, { from, to, limit }) {
  const params = [org_id, branch_id];
  let where = "WHERE i.org_id=? AND i.branch_id=? AND i.status <> 'VOID'";
  if (from) { where += " AND DATE(i.invoice_date) >= ?"; params.push(from); }
  if (to) { where += " AND DATE(i.invoice_date) <= ?"; params.push(to); }

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

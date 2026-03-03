import { pool } from "../../db/pool.js";

export async function scheduleH1(org_id, branch_id, { from, to }) {
  const params = [org_id, branch_id];
  let where = "WHERE h.org_id=? AND h.branch_id=?";
  if (from) { where += " AND DATE(h.sold_at) >= ?"; params.push(from); }
  if (to) { where += " AND DATE(h.sold_at) <= ?"; params.push(to); }

  const [rows] = await pool.execute(
    `SELECT h.id, h.sold_at, h.qty,
            h.customer_name, h.customer_phone, h.doctor_name,
            m.name AS medicine_name, b.batch_no, i.invoice_no
     FROM schedule_h1_register h
     JOIN medicines m ON m.id = h.medicine_id
     JOIN batches b ON b.id = h.batch_id
     JOIN invoices i ON i.id = h.invoice_id
     ${where}
     ORDER BY h.sold_at DESC
     LIMIT 500`,
    params
  );
  return rows;
}

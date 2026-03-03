import { pool } from "../../db/pool.js";
import { withTx } from "../../db/tx.js";

function taxInclusive(total, gstRate) {
  const r = Number(gstRate || 0);
  if (r <= 0) return { taxable: total, tax: 0 };
  const taxable = total / (1 + r / 100);
  const tax = total - taxable;
  return { taxable, tax };
}

async function findOrCreateBatch(conn, org_id, item) {
  const [rows] = await conn.execute(
    `SELECT id, gst_rate, mrp, purchase_rate, selling_rate, expiry_date
     FROM batches
     WHERE org_id=? AND medicine_id=? AND batch_no=? LIMIT 1`,
    [org_id, item.medicine_id, item.batch_no]
  );
  if (rows.length) return rows[0];

  const [res] = await conn.execute(
    `INSERT INTO batches (org_id, medicine_id, batch_no, expiry_date, mrp, purchase_rate, selling_rate, gst_rate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [org_id, item.medicine_id, item.batch_no, item.expiry_date, item.mrp, item.purchase_rate, item.selling_rate, item.gst_rate]
  );
  const id = res.insertId;
  const [out] = await conn.execute(`SELECT * FROM batches WHERE id=?`, [id]);
  return out[0];
}

async function upsertStock(conn, org_id, branch_id, batch_id, qty_delta) {
  const [rows] = await conn.execute(
    `SELECT id, qty FROM stock WHERE org_id=? AND branch_id=? AND batch_id=? LIMIT 1`,
    [org_id, branch_id, batch_id]
  );
  if (!rows.length) {
    await conn.execute(
      `INSERT INTO stock (org_id, branch_id, batch_id, qty) VALUES (?, ?, ?, ?)`,
      [org_id, branch_id, batch_id, qty_delta]
    );
    return qty_delta;
  }
  const cur = rows[0];
  const newQty = Number(cur.qty) + Number(qty_delta);
  await conn.execute(`UPDATE stock SET qty=? WHERE id=?`, [newQty, cur.id]);
  return newQty;
}

export async function createPurchase({ org_id, branch_id, user_id }, input) {
  return withTx(async (conn) => {
    let subtotal = 0;
    let tax_total = 0;
    let total = 0;

    const [piRes] = await conn.execute(
      `INSERT INTO purchase_invoices (org_id, branch_id, supplier_id, invoice_no, invoice_date, subtotal, tax_total, total, status, created_by)
       VALUES (?, ?, ?, ?, ?, 0, 0, 0, 'POSTED', ?)`,
      [org_id, branch_id, input.supplier_id, input.invoice_no, input.invoice_date, user_id]
    );
    const purchase_invoice_id = piRes.insertId;

    for (const it of input.items) {
      const batch = await findOrCreateBatch(conn, org_id, it);
      const line_total = Number(it.qty) * Number(it.purchase_rate);
      const { taxable, tax } = taxInclusive(line_total, it.gst_rate);

      subtotal += taxable;
      tax_total += tax;
      total += line_total;

      await conn.execute(
        `INSERT INTO purchase_items (purchase_invoice_id, medicine_id, batch_id, qty, purchase_rate, mrp, selling_rate, gst_rate, tax_amount, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [purchase_invoice_id, it.medicine_id, batch.id, it.qty, it.purchase_rate, it.mrp, it.selling_rate, it.gst_rate, tax, line_total]
      );

      await upsertStock(conn, org_id, branch_id, batch.id, it.qty);

      await conn.execute(
        `INSERT INTO stock_movements (org_id, branch_id, batch_id, move_type, qty_delta, ref_table, ref_id, reason, created_by)
         VALUES (?, ?, ?, 'PURCHASE', ?, 'purchase_invoices', ?, ?, ?)`,
        [org_id, branch_id, batch.id, it.qty, purchase_invoice_id, input.invoice_no, user_id]
      );
    }

    await conn.execute(
      `UPDATE purchase_invoices SET subtotal=?, tax_total=?, total=? WHERE id=?`,
      [subtotal, tax_total, total, purchase_invoice_id]
    );

    const [rows] = await conn.execute(
      `SELECT * FROM purchase_invoices WHERE id=?`,
      [purchase_invoice_id]
    );

    return rows[0];
  });
}

export async function listPurchases(org_id, branch_id, { from, to }) {
  const params = [org_id, branch_id];
  let where = "WHERE pi.org_id=? AND pi.branch_id=?";
  if (from) { where += " AND pi.invoice_date >= ?"; params.push(from); }
  if (to) { where += " AND pi.invoice_date <= ?"; params.push(to); }

  const [rows] = await pool.execute(
    `SELECT pi.id, pi.invoice_no, pi.invoice_date, pi.subtotal, pi.tax_total, pi.total, pi.status,
            s.name AS supplier_name, pi.created_at
     FROM purchase_invoices pi
     JOIN suppliers s ON s.id = pi.supplier_id
     ${where}
     ORDER BY pi.id DESC
     LIMIT 300`,
    params
  );
  return rows;
}

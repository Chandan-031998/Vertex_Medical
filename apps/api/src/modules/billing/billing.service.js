import { pool } from "../../db/pool.js";
import { withTx } from "../../db/tx.js";
import { isExpired } from "../../utils/dates.js";

function taxInclusive(total, gstRate) {
  const r = Number(gstRate || 0);
  if (r <= 0) return { taxable: total, tax: 0 };
  const taxable = total / (1 + r / 100);
  const tax = total - taxable;
  return { taxable, tax };
}

async function ensureCustomer(conn, org_id, customer_id, customerObj) {
  if (customer_id) return customer_id;
  if (!customerObj) return null;
  const [res] = await conn.execute(
    `INSERT INTO customers (org_id, name, phone) VALUES (?, ?, ?)`,
    [org_id, customerObj.name, customerObj.phone || null]
  );
  return res.insertId;
}

async function getStockRow(conn, org_id, branch_id, batch_id) {
  const [rows] = await conn.execute(
    `SELECT id, qty FROM stock WHERE org_id=? AND branch_id=? AND batch_id=? LIMIT 1`,
    [org_id, branch_id, batch_id]
  );
  return rows?.[0] || null;
}

async function upsertStock(conn, org_id, branch_id, batch_id, qty_delta) {
  const cur = await getStockRow(conn, org_id, branch_id, batch_id);
  if (!cur) {
    await conn.execute(
      `INSERT INTO stock (org_id, branch_id, batch_id, qty) VALUES (?, ?, ?, ?)`,
      [org_id, branch_id, batch_id, qty_delta]
    );
    return qty_delta;
  }
  const newQty = Number(cur.qty) + Number(qty_delta);
  await conn.execute(`UPDATE stock SET qty=? WHERE id=?`, [newQty, cur.id]);
  return newQty;
}

async function getBranchCode(conn, branch_id) {
  const [rows] = await conn.execute(`SELECT code FROM branches WHERE id=? LIMIT 1`, [branch_id]);
  return rows?.[0]?.code || "BR";
}

export async function createInvoice({ org_id, branch_id, user_id }, input) {
  return withTx(async (conn) => {
    const customer_id = await ensureCustomer(conn, org_id, input.customer_id, input.customer);

    // Insert invoice placeholder
    const [invRes] = await conn.execute(
      `INSERT INTO invoices (org_id, branch_id, customer_id, invoice_no, invoice_date, subtotal, tax_total, discount_total, total, amount_paid, amount_due, status, created_by)
       VALUES (?, ?, ?, 'TEMP', NOW(), 0, 0, 0, 0, 0, 0, 'PAID', ?)`,
      [org_id, branch_id, customer_id, user_id]
    );
    const invoice_id = invRes.insertId;

    // Update invoice no
    const branchCode = await getBranchCode(conn, branch_id);
    const invoice_no = `INV-${branchCode}-${String(invoice_id).padStart(6, "0")}`;
    await conn.execute(`UPDATE invoices SET invoice_no=? WHERE id=?`, [invoice_no, invoice_id]);

    let subtotal = 0;
    let tax_total = 0;
    let discount_total = 0;
    let total = 0;

    // Validate stock and expiry
    for (const line of input.items) {
      const [batchRows] = await conn.execute(
        `SELECT b.id, b.batch_no, b.expiry_date, b.mrp, b.selling_rate, b.gst_rate,
                m.id AS medicine_id, m.name AS medicine_name, m.schedule_type
         FROM batches b
         JOIN medicines m ON m.id = b.medicine_id
         WHERE b.id=? AND b.org_id=? LIMIT 1`,
        [line.batch_id, org_id]
      );
      const batch = batchRows?.[0];
      if (!batch) {
        const err = new Error(`Batch not found: ${line.batch_id}`);
        err.status = 400;
        throw err;
      }
      if (isExpired(batch.expiry_date)) {
        const err = new Error(`Expired batch blocked: ${batch.medicine_name} / ${batch.batch_no || ""}`);
        err.status = 400;
        throw err;
      }
      const stock = await getStockRow(conn, org_id, branch_id, line.batch_id);
      const qtyAvail = Number(stock?.qty || 0);
      if (qtyAvail < line.qty) {
        const err = new Error(`Insufficient stock for ${batch.medicine_name} (batch ${line.batch_id}). Available: ${qtyAvail}`);
        err.status = 400;
        throw err;
      }
    }

    // Insert items + deduct stock + compliance
    for (const line of input.items) {
      const [batchRows] = await conn.execute(
        `SELECT b.id, b.batch_no, b.expiry_date, b.mrp, b.selling_rate, b.gst_rate,
                m.id AS medicine_id, m.name AS medicine_name, m.schedule_type
         FROM batches b
         JOIN medicines m ON m.id = b.medicine_id
         WHERE b.id=? AND b.org_id=? LIMIT 1`,
        [line.batch_id, org_id]
      );
      const batch = batchRows[0];

      const line_gross = Number(line.qty) * Number(batch.selling_rate);
      const disc = Number(line.discount_amount || 0);
      const line_total = Math.max(0, line_gross - disc);
      const { taxable, tax } = taxInclusive(line_total, batch.gst_rate);

      subtotal += taxable;
      tax_total += tax;
      discount_total += disc;
      total += line_total;

      const [itemRes] = await conn.execute(
        `INSERT INTO invoice_items (invoice_id, medicine_id, batch_id, qty, selling_rate, mrp, gst_rate, tax_amount, discount_amount, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [invoice_id, batch.medicine_id, batch.id, line.qty, batch.selling_rate, batch.mrp, batch.gst_rate, tax, disc, line_total]
      );
      const invoice_item_id = itemRes.insertId;

      const newQty = await upsertStock(conn, org_id, branch_id, batch.id, -line.qty);
      if (newQty < 0) {
        const err = new Error("Stock cannot be negative (race condition)");
        err.status = 400;
        throw err;
      }

      await conn.execute(
        `INSERT INTO stock_movements (org_id, branch_id, batch_id, move_type, qty_delta, ref_table, ref_id, reason, created_by)
         VALUES (?, ?, ?, 'SALE', ?, 'invoices', ?, ?, ?)`,
        [org_id, branch_id, batch.id, -line.qty, invoice_id, invoice_no, user_id]
      );

      // Schedule H1 register auto-entry
      if (batch.schedule_type === "H1") {
        let custName = input.customer?.name || null;
        let custPhone = input.customer?.phone || null;
        if (customer_id) {
          const [cRows] = await conn.execute(`SELECT name, phone FROM customers WHERE id=? LIMIT 1`, [customer_id]);
          if (cRows.length) {
            custName = cRows[0].name;
            custPhone = cRows[0].phone;
          }
        }
        await conn.execute(
          `INSERT INTO schedule_h1_register (org_id, branch_id, invoice_id, invoice_item_id, medicine_id, batch_id, customer_name, customer_phone, doctor_name, qty, sold_at, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
          [org_id, branch_id, invoice_id, invoice_item_id, batch.medicine_id, batch.id, custName, custPhone, input.doctor_name || null, line.qty, user_id]
        );
      }
    }

    // Payments
    let amount_paid = 0;
    for (const pay of input.payments) {
      amount_paid += Number(pay.amount);
      await conn.execute(
        `INSERT INTO payments (invoice_id, mode, amount, ref_no) VALUES (?, ?, ?, ?)`,
        [invoice_id, pay.mode, pay.amount, pay.ref_no || null]
      );
    }

    const amount_due = Math.max(0, total - amount_paid);
    let status = "PAID";
    if (amount_due > 0 && amount_paid > 0) status = "PARTIAL";
    if (amount_due > 0 && amount_paid <= 0) status = "DUE";

    await conn.execute(
      `UPDATE invoices
       SET subtotal=?, tax_total=?, discount_total=?, total=?, amount_paid=?, amount_due=?, status=?
       WHERE id=?`,
      [subtotal, tax_total, discount_total, total, amount_paid, amount_due, status, invoice_id]
    );

    // Link prescription if provided
    if (input.prescription_id) {
      await conn.execute(
        `INSERT IGNORE INTO invoice_prescriptions (invoice_id, prescription_id) VALUES (?, ?)`,
        [invoice_id, input.prescription_id]
      );
    }

    const [out] = await conn.execute(
      `SELECT * FROM invoices WHERE id=?`,
      [invoice_id]
    );
    return out[0];
  });
}

export async function listInvoices(org_id, branch_id, { from, to, q }) {
  const params = [org_id, branch_id];
  let where = "WHERE i.org_id=? AND i.branch_id=?";
  if (from) { where += " AND DATE(i.invoice_date) >= ?"; params.push(from); }
  if (to) { where += " AND DATE(i.invoice_date) <= ?"; params.push(to); }
  if (q && q.trim()) {
    const like = `%${q.trim()}%`;
    where += " AND (i.invoice_no LIKE ?)";
    params.push(like);
  }
  const [rows] = await pool.execute(
    `SELECT i.id, i.invoice_no, i.invoice_date, i.total, i.amount_paid, i.amount_due, i.status,
            c.name AS customer_name, c.phone AS customer_phone
     FROM invoices i
     LEFT JOIN customers c ON c.id = i.customer_id
     ${where}
     ORDER BY i.id DESC
     LIMIT 300`,
    params
  );
  return rows;
}

export async function getInvoice(org_id, id) {
  const [invRows] = await pool.execute(
    `SELECT * FROM invoices WHERE id=? AND org_id=? LIMIT 1`,
    [id, org_id]
  );
  if (!invRows.length) return null;

  const [itemRows] = await pool.execute(
    `SELECT ii.*, m.name AS medicine_name, b.batch_no, b.expiry_date
     FROM invoice_items ii
     JOIN medicines m ON m.id = ii.medicine_id
     JOIN batches b ON b.id = ii.batch_id
     WHERE ii.invoice_id=?`,
    [id]
  );

  const [payRows] = await pool.execute(
    `SELECT * FROM payments WHERE invoice_id=?`,
    [id]
  );

  return { invoice: invRows[0], items: itemRows, payments: payRows };
}

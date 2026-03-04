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

export async function getPurchase(org_id, branch_id, purchaseId) {
  const [invRows] = await pool.execute(
    `SELECT pi.id, pi.invoice_no, pi.invoice_date, pi.subtotal, pi.tax_total, pi.total, pi.status,
            pi.supplier_id, s.name AS supplier_name, pi.created_at
     FROM purchase_invoices pi
     JOIN suppliers s ON s.id = pi.supplier_id
     WHERE pi.org_id=? AND pi.branch_id=? AND pi.id=?
     LIMIT 1`,
    [org_id, branch_id, purchaseId]
  );
  if (!invRows.length) return null;

  let items = [];
  try {
    const [rows] = await pool.execute(
      `SELECT pi.id AS purchase_item_id, pi.medicine_id, pi.batch_id, pi.qty, pi.purchase_rate, pi.gst_rate, pi.line_total,
              b.batch_no, b.expiry_date, m.name AS medicine_name,
              COALESCE(ret.returned_qty, 0) AS returned_qty
       FROM purchase_items pi
       JOIN batches b ON b.id = pi.batch_id
       JOIN medicines m ON m.id = pi.medicine_id
       LEFT JOIN (
         SELECT pri.purchase_item_id, SUM(pri.qty) AS returned_qty
         FROM purchase_return_items pri
         JOIN purchase_returns pr ON pr.id = pri.purchase_return_id
         WHERE pr.org_id=? AND pr.branch_id=? AND pr.purchase_id=? AND pr.status='POSTED'
         GROUP BY pri.purchase_item_id
       ) ret ON ret.purchase_item_id = pi.id
       WHERE pi.purchase_invoice_id=?
       ORDER BY pi.id ASC`,
      [org_id, branch_id, purchaseId, purchaseId]
    );
    items = rows;
  } catch (e) {
    if (e?.code !== "ER_NO_SUCH_TABLE") throw e;
    const [rows] = await pool.execute(
      `SELECT pi.id AS purchase_item_id, pi.medicine_id, pi.batch_id, pi.qty, pi.purchase_rate, pi.gst_rate, pi.line_total,
              b.batch_no, b.expiry_date, m.name AS medicine_name,
              0 AS returned_qty
       FROM purchase_items pi
       JOIN batches b ON b.id = pi.batch_id
       JOIN medicines m ON m.id = pi.medicine_id
       WHERE pi.purchase_invoice_id=?
       ORDER BY pi.id ASC`,
      [purchaseId]
    );
    items = rows;
  }

  return { invoice: invRows[0], items };
}

async function getStockRow(conn, org_id, branch_id, batch_id) {
  const [rows] = await conn.execute(
    `SELECT id, qty FROM stock WHERE org_id=? AND branch_id=? AND batch_id=? LIMIT 1`,
    [org_id, branch_id, batch_id]
  );
  return rows?.[0] || null;
}

export async function createPurchaseReturn({ org_id, branch_id, user_id }, purchaseId, input) {
  try {
    return await withTx(async (conn) => {
      const [invRows] = await conn.execute(
        `SELECT id, invoice_no, subtotal, tax_total, total
         FROM purchase_invoices
         WHERE id=? AND org_id=? AND branch_id=?
         LIMIT 1`,
        [purchaseId, org_id, branch_id]
      );
      const invoice = invRows?.[0];
      if (!invoice) {
        const err = new Error("Purchase not found");
        err.status = 404;
        throw err;
      }

      let returnSubtotal = 0;
      let returnTax = 0;
      let returnTotal = 0;

      const [insertRes] = await conn.execute(
        `INSERT INTO purchase_returns (org_id, branch_id, purchase_id, return_no, reason, status, created_by)
         VALUES (?, ?, ?, 'TEMP', ?, 'POSTED', ?)`,
        [org_id, branch_id, purchaseId, input.reason || null, user_id]
      );
      const returnId = insertRes.insertId;
      const returnNo = `PR-${String(returnId).padStart(6, "0")}`;
      await conn.execute(`UPDATE purchase_returns SET return_no=? WHERE id=?`, [returnNo, returnId]);

      for (const it of input.return_items) {
        const [piRows] = await conn.execute(
          `SELECT id, purchase_invoice_id, batch_id, qty, purchase_rate, gst_rate
           FROM purchase_items
           WHERE purchase_invoice_id=? AND batch_id=?
           LIMIT 1`,
          [purchaseId, it.batch_id]
        );
        const pItem = piRows?.[0];
        if (!pItem) {
          const err = new Error(`Batch ${it.batch_id} not found in this purchase`);
          err.status = 400;
          throw err;
        }

        const [[retRow]] = await conn.execute(
          `SELECT COALESCE(SUM(pri.qty), 0) AS returned_qty
           FROM purchase_return_items pri
           JOIN purchase_returns pr ON pr.id = pri.purchase_return_id
           WHERE pr.org_id=? AND pr.branch_id=? AND pr.purchase_id=? AND pr.status='POSTED'
             AND pri.purchase_item_id=?`,
          [org_id, branch_id, purchaseId, pItem.id]
        );
        const alreadyReturned = Number(retRow?.returned_qty || 0);
        const purchasedQty = Number(pItem.qty || 0);
        const nextReturned = alreadyReturned + Number(it.qty);
        if (nextReturned > purchasedQty) {
          const err = new Error(`Return qty exceeds purchased qty for batch ${it.batch_id}`);
          err.status = 400;
          throw err;
        }

        const stock = await getStockRow(conn, org_id, branch_id, it.batch_id);
        const available = Number(stock?.qty || 0);
        if (available < Number(it.qty)) {
          const err = new Error(`Insufficient stock for batch ${it.batch_id}`);
          err.status = 400;
          throw err;
        }

        const amount = Number(it.qty) * Number(pItem.purchase_rate);
        const { taxable, tax } = taxInclusive(amount, pItem.gst_rate);
        returnSubtotal += taxable;
        returnTax += tax;
        returnTotal += amount;

        await conn.execute(
          `INSERT INTO purchase_return_items (purchase_return_id, purchase_item_id, batch_id, qty, rate, gst_rate, amount)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [returnId, pItem.id, it.batch_id, it.qty, pItem.purchase_rate, pItem.gst_rate, amount]
        );

        await conn.execute(
          `UPDATE stock SET qty = qty - ? WHERE id=?`,
          [it.qty, stock.id]
        );

        await conn.execute(
          `INSERT INTO stock_movements (org_id, branch_id, batch_id, move_type, qty_delta, ref_table, ref_id, reason, created_by)
           VALUES (?, ?, ?, 'PURCHASE_RETURN', ?, 'purchase_returns', ?, ?, ?)`,
          [org_id, branch_id, it.batch_id, -Number(it.qty), returnId, input.reason || returnNo, user_id]
        );
      }

      const nextSubtotal = Math.max(0, Number(invoice.subtotal || 0) - returnSubtotal);
      const nextTaxTotal = Math.max(0, Number(invoice.tax_total || 0) - returnTax);
      const nextTotal = Math.max(0, Number(invoice.total || 0) - returnTotal);
      await conn.execute(
        `UPDATE purchase_invoices SET subtotal=?, tax_total=?, total=? WHERE id=?`,
        [nextSubtotal, nextTaxTotal, nextTotal, purchaseId]
      );

      const [rows] = await conn.execute(
        `SELECT id, org_id, branch_id, purchase_id, return_no, reason, status, created_by, created_at
         FROM purchase_returns
         WHERE id=?
         LIMIT 1`,
        [returnId]
      );
      return rows[0];
    });
  } catch (e) {
    if (e?.code === "ER_NO_SUCH_TABLE") {
      const err = new Error("purchase return tables missing. Run 2026_03_supplier_payments_purchase_returns.sql");
      err.status = 500;
      throw err;
    }
    throw e;
  }
}

import { pool } from "../../db/pool.js";
import { withTx } from "../../db/tx.js";
import { env } from "../../config/env.js";
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

async function requirePrescriptionForH1Setting(conn, org_id) {
  try {
    const [rows] = await conn.execute(
      `SELECT setting_key, setting_value_json
       FROM org_settings
       WHERE org_id=? AND setting_key IN ('require_prescription_for_h1', 'compliance')
       LIMIT 5`,
      [org_id]
    );
    for (const row of rows) {
      if (row.setting_key === "require_prescription_for_h1") {
        const v = row.setting_value_json;
        if (typeof v === "number") return v === 1;
        if (typeof v === "string") return ["1", "true", "yes", "on"].includes(v.toLowerCase());
        if (typeof v === "boolean") return v;
      }
      if (row.setting_key === "compliance" && row.setting_value_json && typeof row.setting_value_json === "object") {
        const raw = row.setting_value_json.require_prescription_for_h1;
        if (typeof raw === "boolean") return raw;
        if (typeof raw === "number") return raw === 1;
        if (typeof raw === "string") return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
      }
    }
  } catch (e) {
    if (e?.code === "ER_NO_SUCH_TABLE") return false;
    throw e;
  }
  return false;
}

async function addLedgerEntry(conn, { org_id, branch_id, customer_id, ref_type, ref_id = null, debit = 0, credit = 0, notes = null, created_by = null }) {
  if (!customer_id) return;
  try {
    await conn.execute(
      `INSERT INTO customer_ledger (org_id, branch_id, customer_id, ref_type, ref_id, debit, credit, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [org_id, branch_id, customer_id, ref_type, ref_id, Number(debit || 0), Number(credit || 0), notes, created_by]
    );
  } catch (e) {
    if (e?.code === "ER_NO_SUCH_TABLE") return;
    throw e;
  }
}

async function refreshCustomerBalance(conn, org_id, customer_id) {
  if (!customer_id) return;
  try {
    const [[agg]] = await conn.execute(
      `SELECT COALESCE(SUM(debit - credit), 0) AS balance
       FROM customer_ledger
       WHERE org_id=? AND customer_id=?`,
      [org_id, customer_id]
    );
    const balance = Number(agg?.balance || 0);
    await conn.execute(
      `UPDATE customers SET credit_balance=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=?`,
      [Math.max(0, balance), customer_id, org_id]
    );
  } catch (e) {
    if (e?.code === "ER_NO_SUCH_TABLE") return;
    if (e?.code === "ER_BAD_FIELD_ERROR") {
      await conn.execute(`UPDATE customers SET credit_balance=? WHERE id=? AND org_id=?`, [0, customer_id, org_id]);
      return;
    }
    throw e;
  }
}

export async function createInvoice({ org_id, branch_id, user_id }, input) {
  return withTx(async (conn) => {
    const customer_id = await ensureCustomer(conn, org_id, input.customer_id, input.customer);
    const mustHavePrescriptionForH1 = await requirePrescriptionForH1Setting(conn, org_id);

    const [invRes] = await conn.execute(
      `INSERT INTO invoices (org_id, branch_id, customer_id, invoice_no, invoice_date, subtotal, tax_total, discount_total, total, amount_paid, amount_due, status, created_by)
       VALUES (?, ?, ?, 'TEMP', NOW(), 0, 0, 0, 0, 0, 0, 'PAID', ?)`,
      [org_id, branch_id, customer_id, user_id]
    );
    const invoice_id = invRes.insertId;

    const branchCode = await getBranchCode(conn, branch_id);
    const invoice_no = `INV-${branchCode}-${String(invoice_id).padStart(6, "0")}`;
    await conn.execute(`UPDATE invoices SET invoice_no=? WHERE id=?`, [invoice_no, invoice_id]);

    let subtotal = 0;
    let tax_total = 0;
    let discount_total = 0;
    let total = 0;

    for (const line of input.items) {
      const [batchRows] = await conn.execute(
        `SELECT b.id, b.batch_no, b.expiry_date, b.mrp, b.selling_rate, b.gst_rate, b.is_blocked,
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
      if (Number(batch.is_blocked || 0) === 1) {
        const err = new Error(`Blocked batch cannot be sold: ${batch.medicine_name} / ${batch.batch_no || ""}`);
        err.status = 400;
        throw err;
      }
      if (mustHavePrescriptionForH1 && ["H", "H1"].includes(String(batch.schedule_type || "")) && !input.prescription_id) {
        const err = new Error(`Prescription is required for ${batch.schedule_type} medicine: ${batch.medicine_name}`);
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

    for (const line of input.items) {
      const [batchRows] = await conn.execute(
        `SELECT b.id, b.batch_no, b.expiry_date, b.mrp, b.selling_rate, b.gst_rate, b.is_blocked,
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

    if (customer_id) {
      await addLedgerEntry(conn, {
        org_id,
        branch_id,
        customer_id,
        ref_type: "INVOICE",
        ref_id: invoice_id,
        debit: total,
        credit: 0,
        notes: `Invoice ${invoice_no}`,
        created_by: user_id,
      });
      if (amount_paid > 0) {
        await addLedgerEntry(conn, {
          org_id,
          branch_id,
          customer_id,
          ref_type: "INVOICE_PAYMENT",
          ref_id: invoice_id,
          debit: 0,
          credit: amount_paid,
          notes: `Invoice payment ${invoice_no}`,
          created_by: user_id,
        });
      }
      await refreshCustomerBalance(conn, org_id, customer_id);
    }

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

function buildInvoiceWhere({ from, to, q, invoice_no, customer_id }) {
  const params = [];
  let where = "WHERE i.org_id=? AND i.branch_id=?";

  if (from) {
    where += " AND DATE(i.invoice_date) >= ?";
    params.push(from);
  }
  if (to) {
    where += " AND DATE(i.invoice_date) <= ?";
    params.push(to);
  }
  if (customer_id) {
    where += " AND i.customer_id = ?";
    params.push(customer_id);
  }
  if (invoice_no && invoice_no.trim()) {
    where += " AND i.invoice_no LIKE ?";
    params.push(`%${invoice_no.trim()}%`);
  }
  if (q && q.trim()) {
    const like = `%${q.trim()}%`;
    where += " AND (i.invoice_no LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)";
    params.push(like, like, like);
  }

  return { where, params };
}

export async function listInvoices(org_id, branch_id, input) {
  const page = Math.max(1, Number(input.page || 1));
  const pageSize = Math.min(200, Math.max(1, Number(input.pageSize || 25)));
  const offset = (page - 1) * pageSize;

  const base = buildInvoiceWhere(input);
  const params = [org_id, branch_id, ...base.params];

  const [[countRow]] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM invoices i
     LEFT JOIN customers c ON c.id = i.customer_id
     ${base.where}`,
    params
  );

  const [rows] = await pool.execute(
    `SELECT i.id, i.invoice_no, i.invoice_date, i.total, i.amount_paid, i.amount_due, i.status,
            c.name AS customer_name, c.phone AS customer_phone
     FROM invoices i
     LEFT JOIN customers c ON c.id = i.customer_id
     ${base.where}
     ORDER BY i.id DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return {
    rows,
    page,
    pageSize,
    total: Number(countRow?.total || 0),
  };
}

function readInvoiceFooter(settingsRows = []) {
  let footer = "Thank you for your business.";
  for (const row of settingsRows) {
    if (row.setting_key === "invoice_footer") {
      if (typeof row.setting_value_json === "string") {
        footer = row.setting_value_json;
      } else if (row.setting_value_json && typeof row.setting_value_json === "object") {
        footer = row.setting_value_json.footer || row.setting_value_json.value || footer;
      }
    }
    if (row.setting_key === "billing" && row.setting_value_json && typeof row.setting_value_json === "object") {
      footer = row.setting_value_json.invoice_footer || footer;
    }
  }
  return footer;
}

export async function getInvoice(org_id, id) {
  const [invRows] = await pool.execute(
    `SELECT i.*, c.name AS customer_name, c.phone AS customer_phone,
            o.name AS org_name, b.name AS branch_name, b.code AS branch_code, b.address AS branch_address, b.phone AS branch_phone
     FROM invoices i
     LEFT JOIN customers c ON c.id = i.customer_id
     JOIN orgs o ON o.id = i.org_id
     JOIN branches b ON b.id = i.branch_id
     WHERE i.id=? AND i.org_id=? LIMIT 1`,
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
    `SELECT * FROM payments WHERE invoice_id=? ORDER BY id ASC`,
    [id]
  );

  let linkedPrescriptions = [];
  try {
    const [prs] = await pool.execute(
      `SELECT p.id, p.customer_id, p.doctor_name, p.doctor_reg_no, p.notes, p.created_at
       FROM invoice_prescriptions ip
       JOIN prescriptions p ON p.id = ip.prescription_id
       WHERE ip.invoice_id=?
       ORDER BY p.id DESC`,
      [id]
    );
    linkedPrescriptions = prs;
    for (const pr of linkedPrescriptions) {
      const [files] = await pool.execute(
        `SELECT id, file_path, original_name, mime_type, size_bytes, uploaded_at
         FROM prescription_files
         WHERE prescription_id=?
         ORDER BY id DESC`,
        [pr.id]
      );
      pr.files = files.map((f) => {
        const p = String(f.file_path || "").replace(/\\/g, "/");
        const normalized = p.startsWith("/") ? p : `/${p}`;
        return { ...f, file_url: `/uploads${normalized}` };
      });
    }
  } catch (e) {
    if (e?.code !== "ER_NO_SUCH_TABLE") throw e;
  }

  let returnRows = [];
  let returnItemRows = [];
  let returnRefundRows = [];
  try {
    const [rRows] = await pool.execute(
      `SELECT id, return_no, reason, status, created_at
       FROM \`returns\`
       WHERE org_id=? AND branch_id=? AND invoice_id=?
       ORDER BY id DESC`,
      [org_id, invRows[0].branch_id, id]
    );
    returnRows = rRows;
    if (rRows.length) {
      const returnIds = rRows.map((r) => r.id);
      const ph = returnIds.map(() => "?").join(",");
      const [riRows] = await pool.query(
        `SELECT ri.*, m.name AS medicine_name, b.batch_no
         FROM return_items ri
         JOIN batches b ON b.id = ri.batch_id
         JOIN medicines m ON m.id = b.medicine_id
         WHERE ri.return_id IN (${ph})
         ORDER BY ri.id DESC`,
        returnIds
      );
      returnItemRows = riRows;
      const [rfRows] = await pool.query(
        `SELECT rr.*
         FROM return_refunds rr
         WHERE rr.return_id IN (${ph})
         ORDER BY rr.id DESC`,
        returnIds
      );
      returnRefundRows = rfRows;
    }
  } catch (e) {
    if (e?.code !== "ER_NO_SUCH_TABLE") throw e;
  }

  const [brandRows] = await pool.execute(
    `SELECT app_name, logo_url, primary_color, secondary_color, support_phone, terms_url
     FROM org_branding
     WHERE org_id=?
     LIMIT 1`,
    [org_id]
  );

  const [settingsRows] = await pool.execute(
    `SELECT setting_key, setting_value_json
     FROM org_settings
     WHERE org_id=? AND setting_key IN ('invoice_footer', 'billing')`,
    [org_id]
  );

  return {
    invoice: invRows[0],
    items: itemRows,
    payments: payRows,
    returns: returnRows,
    return_items: returnItemRows,
    return_refunds: returnRefundRows,
    linked_prescriptions: linkedPrescriptions,
    branding: brandRows?.[0] || null,
    invoice_footer: readInvoiceFooter(settingsRows),
  };
}

export function buildSharePayload(invoiceDetails) {
  const invoice = invoiceDetails.invoice;
  const base = (env.PUBLIC_APP_URL || "http://localhost:5173").replace(/\/$/, "");
  const shareUrl = `${base}/invoices?invoiceId=${invoice.id}`;
  const customer = invoice.customer_name || "Customer";
  const messageTemplate = `Invoice ${invoice.invoice_no} for ${customer}. Amount ₹${Number(invoice.total || 0).toFixed(2)}. View: ${shareUrl}`;

  return {
    invoiceId: invoice.id,
    shareUrl,
    messageTemplate,
  };
}

export async function createReturn({ org_id, branch_id, user_id }, input) {
  return withTx(async (conn) => {
    const [invRows] = await conn.execute(
      `SELECT id, org_id, branch_id, customer_id, invoice_no, subtotal, tax_total, discount_total, total, amount_paid, amount_due, status
       FROM invoices
       WHERE id=? AND org_id=? AND branch_id=? LIMIT 1`,
      [input.invoice_id, org_id, branch_id]
    );
    if (!invRows.length) {
      const err = new Error("Invoice not found");
      err.status = 404;
      throw err;
    }
    const inv = invRows[0];
    if (inv.status === "VOID") {
      const err = new Error("Cannot return a void invoice");
      err.status = 409;
      throw err;
    }

    const [soldRows] = await conn.execute(
      `SELECT ii.id AS invoice_item_id, ii.batch_id, ii.qty, ii.selling_rate, ii.gst_rate, ii.tax_amount, ii.discount_amount, ii.line_total
       FROM invoice_items ii
       WHERE ii.invoice_id=?`,
      [inv.id]
    );
    const soldMap = new Map(soldRows.map((r) => [Number(r.batch_id), r]));

    const [retRows] = await conn.execute(
      `SELECT ri.batch_id, COALESCE(SUM(ri.qty),0) AS qty_returned
       FROM return_items ri
       JOIN \`returns\` r ON r.id = ri.return_id
       WHERE r.org_id=? AND r.branch_id=? AND r.invoice_id=? AND r.status='POSTED'
       GROUP BY ri.batch_id`,
      [org_id, branch_id, inv.id]
    );
    const returnedMap = new Map(retRows.map((r) => [Number(r.batch_id), Number(r.qty_returned || 0)]));

    const normalizedItems = [];
    for (const it of input.return_items) {
      const sold = soldMap.get(Number(it.batch_id));
      if (!sold) {
        const err = new Error(`Batch ${it.batch_id} not found in invoice`);
        err.status = 400;
        throw err;
      }
      const alreadyReturned = Number(returnedMap.get(Number(it.batch_id)) || 0);
      const maxAllowed = Number(sold.qty) - alreadyReturned;
      if (Number(it.qty) > maxAllowed) {
        const err = new Error(`Return qty exceeds sold qty for batch ${it.batch_id}. Max allowed: ${maxAllowed}`);
        err.status = 400;
        throw err;
      }
      normalizedItems.push({ batch_id: Number(it.batch_id), qty: Number(it.qty), sold });
    }

    const [retInsert] = await conn.execute(
      `INSERT INTO \`returns\` (org_id, branch_id, invoice_id, return_no, reason, status, created_by)
       VALUES (?, ?, ?, 'TEMP', ?, 'POSTED', ?)`,
      [org_id, branch_id, inv.id, input.reason || null, user_id]
    );
    const return_id = retInsert.insertId;
    const branchCode = await getBranchCode(conn, branch_id);
    const return_no = `RET-${branchCode}-${String(return_id).padStart(6, "0")}`;
    await conn.execute(`UPDATE \`returns\` SET return_no=? WHERE id=?`, [return_no, return_id]);

    let retSubtotal = 0;
    let retTax = 0;
    let retDiscount = 0;
    let retAmount = 0;

    for (const row of normalizedItems) {
      const sold = row.sold;
      const unitRate = Number(sold.selling_rate || 0);
      const unitTax = Number(sold.tax_amount || 0) / Math.max(1, Number(sold.qty || 1));
      const unitDiscount = Number(sold.discount_amount || 0) / Math.max(1, Number(sold.qty || 1));
      const unitAmount = Number(sold.line_total || 0) / Math.max(1, Number(sold.qty || 1));
      const qty = Number(row.qty);

      const lineTax = unitTax * qty;
      const lineDiscount = unitDiscount * qty;
      const lineAmount = unitAmount * qty;
      const lineSubtotal = lineAmount - lineTax;

      retSubtotal += lineSubtotal;
      retTax += lineTax;
      retDiscount += lineDiscount;
      retAmount += lineAmount;

      await conn.execute(
        `INSERT INTO return_items (return_id, invoice_item_id, batch_id, qty, rate, gst_rate, tax_amount, discount_amount, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [return_id, sold.invoice_item_id, row.batch_id, qty, unitRate, sold.gst_rate, lineTax, lineDiscount, lineAmount]
      );

      const newQty = await upsertStock(conn, org_id, branch_id, row.batch_id, qty);
      if (newQty < 0) {
        const err = new Error("Stock cannot be negative after return");
        err.status = 400;
        throw err;
      }

      await conn.execute(
        `INSERT INTO stock_movements (org_id, branch_id, batch_id, move_type, qty_delta, ref_table, ref_id, reason, created_by)
         VALUES (?, ?, ?, 'RETURN_IN', ?, 'returns', ?, ?, ?)`,
        [org_id, branch_id, row.batch_id, qty, return_id, return_no, user_id]
      );
    }

    let refundTotal = 0;
    for (const rf of input.refunds || []) {
      refundTotal += Number(rf.amount || 0);
      await conn.execute(
        `INSERT INTO return_refunds (return_id, mode, amount, ref_no, paid_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [return_id, rf.mode, rf.amount, rf.ref_no || null]
      );
    }

    const newSubtotal = Math.max(0, Number(inv.subtotal || 0) - retSubtotal);
    const newTax = Math.max(0, Number(inv.tax_total || 0) - retTax);
    const newDiscount = Math.max(0, Number(inv.discount_total || 0) - retDiscount);
    const newTotal = Math.max(0, Number(inv.total || 0) - retAmount);
    const newAmountPaid = Math.max(0, Number(inv.amount_paid || 0) - refundTotal);
    const newDue = Math.max(0, newTotal - newAmountPaid);

    let newStatus = "PAID";
    if (newDue > 0 && newAmountPaid > 0) newStatus = "PARTIAL";
    if (newDue > 0 && newAmountPaid <= 0) newStatus = "DUE";

    await conn.execute(
      `UPDATE invoices
       SET subtotal=?, tax_total=?, discount_total=?, total=?, amount_paid=?, amount_due=?, status=?
       WHERE id=?`,
      [newSubtotal, newTax, newDiscount, newTotal, newAmountPaid, newDue, newStatus, inv.id]
    );

    if (inv.customer_id) {
      await addLedgerEntry(conn, {
        org_id,
        branch_id,
        customer_id: inv.customer_id,
        ref_type: "RETURN",
        ref_id: return_id,
        debit: 0,
        credit: retAmount,
        notes: `Return ${return_no}`,
        created_by: user_id,
      });
      if (refundTotal > 0) {
        await addLedgerEntry(conn, {
          org_id,
          branch_id,
          customer_id: inv.customer_id,
          ref_type: "RETURN_REFUND",
          ref_id: return_id,
          debit: refundTotal,
          credit: 0,
          notes: `Refund for ${return_no}`,
          created_by: user_id,
        });
      }
      await refreshCustomerBalance(conn, org_id, inv.customer_id);
    }

    const [retOut] = await conn.execute(`SELECT * FROM \`returns\` WHERE id=?`, [return_id]);
    return {
      return: retOut[0],
      return_amount: Number(retAmount.toFixed(2)),
      refund_amount: Number(refundTotal.toFixed(2)),
      invoice_id: inv.id,
      invoice_total: Number(newTotal.toFixed(2)),
      invoice_due: Number(newDue.toFixed(2)),
    };
  });
}

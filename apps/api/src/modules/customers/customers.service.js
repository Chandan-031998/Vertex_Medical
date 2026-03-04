import { pool } from "../../db/pool.js";
import { withTx } from "../../db/tx.js";

export async function list(org_id, { q }) {
  const params = [org_id];
  let where = "WHERE org_id=? AND deleted_at IS NULL";
  if (q && q.trim()) {
    const like = `%${q.trim()}%`;
    where += " AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)";
    params.push(like, like, like);
  }
  const [rows] = await pool.execute(
    `SELECT id, name, phone, email, address, loyalty_points, credit_balance, created_at
     FROM customers
     ${where}
     ORDER BY id DESC
     LIMIT 300`,
    params
  );
  return rows;
}

export async function create(org_id, input) {
  const [res] = await pool.execute(
    `INSERT INTO customers (org_id, name, phone, email, address) VALUES (?, ?, ?, ?, ?)`,
    [org_id, input.name, input.phone || null, input.email || null, input.address || null]
  );
  const id = res.insertId;
  const [rows] = await pool.execute(`SELECT * FROM customers WHERE id=? AND deleted_at IS NULL`, [id]);
  return rows[0];
}

export async function getById(org_id, id) {
  const [rows] = await pool.execute(
    `SELECT * FROM customers WHERE id=? AND org_id=? AND deleted_at IS NULL LIMIT 1`,
    [id, org_id]
  );
  return rows?.[0] || null;
}

async function refreshCustomerBalance(conn, org_id, customer_id) {
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
    return balance;
  } catch (e) {
    if (e?.code === "ER_NO_SUCH_TABLE") {
      const [[fromInv]] = await conn.execute(
        `SELECT COALESCE(SUM(amount_due), 0) AS due
         FROM invoices
         WHERE org_id=? AND customer_id=? AND status IN ('DUE', 'PARTIAL')`,
        [org_id, customer_id]
      );
      const due = Number(fromInv?.due || 0);
      await conn.execute(`UPDATE customers SET credit_balance=? WHERE id=? AND org_id=?`, [due, customer_id, org_id]);
      return due;
    }
    throw e;
  }
}

export async function listLedger(org_id, customer_id, { limit }) {
  try {
    const [rows] = await pool.execute(
      `SELECT id, ref_type, ref_id, debit, credit, notes, created_at
       FROM customer_ledger
       WHERE org_id=? AND customer_id=?
       ORDER BY id DESC
       LIMIT ?`,
      [org_id, customer_id, limit]
    );
    return rows;
  } catch (e) {
    if (e?.code === "ER_NO_SUCH_TABLE") return [];
    throw e;
  }
}

export async function addPayment({ org_id, branch_id, user_id }, customer_id, input) {
  return withTx(async (conn) => {
    const customer = await getById(org_id, customer_id);
    if (!customer) {
      const err = new Error("Customer not found");
      err.status = 404;
      throw err;
    }

    let paymentId = null;
    try {
      const [payRes] = await conn.execute(
        `INSERT INTO customer_payments (org_id, branch_id, customer_id, mode, amount, ref_no, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [org_id, branch_id, customer_id, input.mode, input.amount, input.ref_no || null, input.notes || null, user_id]
      );
      paymentId = payRes.insertId;
    } catch (e) {
      if (e?.code !== "ER_NO_SUCH_TABLE") throw e;
    }

    try {
      await conn.execute(
        `INSERT INTO customer_ledger (org_id, branch_id, customer_id, ref_type, ref_id, debit, credit, notes, created_by)
         VALUES (?, ?, ?, 'CUSTOMER_PAYMENT', ?, 0, ?, ?, ?)`,
        [org_id, branch_id, customer_id, paymentId, input.amount, input.notes || `Customer payment via ${input.mode}`, user_id]
      );
    } catch (e) {
      if (e?.code !== "ER_NO_SUCH_TABLE") throw e;
    }

    const balance = await refreshCustomerBalance(conn, org_id, customer_id);
    const [rows] = await conn.execute(`SELECT * FROM customers WHERE id=? AND org_id=? LIMIT 1`, [customer_id, org_id]);

    return {
      payment_id: paymentId,
      customer: rows?.[0] || null,
      balance,
    };
  });
}

export async function update(org_id, id, patch) {
  const cur = await getById(org_id, id);
  if (!cur) {
    const err = new Error("Customer not found");
    err.status = 404;
    throw err;
  }

  const fields = [];
  const vals = [];
  const map = {
    name: "name",
    phone: "phone",
    email: "email",
    address: "address",
    loyalty_points: "loyalty_points",
    credit_balance: "credit_balance",
  };
  for (const [k, col] of Object.entries(map)) {
    if (patch[k] !== undefined) { fields.push(`${col}=?`); vals.push(patch[k]); }
  }
  if (!fields.length) return cur;

  vals.push(id, org_id);
  await pool.execute(`UPDATE customers SET ${fields.join(", ")} WHERE id=? AND org_id=? AND deleted_at IS NULL`, vals);

  const [out] = await pool.execute(`SELECT * FROM customers WHERE id=? AND deleted_at IS NULL`, [id]);
  return out[0];
}

export async function remove(org_id, id) {
  const cur = await getById(org_id, id);
  if (!cur) {
    const err = new Error("Customer not found");
    err.status = 404;
    throw err;
  }

  const [[useRow]] = await pool.execute(
    `SELECT COUNT(*) AS cnt FROM invoices WHERE org_id=? AND customer_id=?`,
    [org_id, id]
  );
  if (Number(useRow?.cnt || 0) > 0) {
    const err = new Error("Customer is in use and cannot be deleted");
    err.status = 409;
    throw err;
  }

  await pool.execute(
    `UPDATE customers SET deleted_at = NOW(), updated_at = CURRENT_TIMESTAMP WHERE id=? AND org_id=? AND deleted_at IS NULL`,
    [id, org_id]
  );
  return { ok: true };
}

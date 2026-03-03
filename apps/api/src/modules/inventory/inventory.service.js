import { pool } from "../../db/pool.js";
import { withTx } from "../../db/tx.js";
import { todayISO } from "../../utils/dates.js";

export async function listStock(org_id, branch_id, { q }) {
  const params = [org_id, branch_id];
  let where = "WHERE s.org_id=? AND s.branch_id=?";
  if (q && q.trim()) {
    where += " AND (m.name LIKE ? OR m.salt LIKE ? OR b.batch_no LIKE ? OR m.barcode_primary = ?)";
    const like = `%${q.trim()}%`;
    params.push(like, like, like, q.trim());
  }

  const [rows] = await pool.execute(
    `SELECT s.id AS stock_id, s.qty,
            b.id AS batch_id, b.batch_no, b.expiry_date, b.mrp, b.purchase_rate, b.selling_rate, b.gst_rate,
            m.id AS medicine_id, m.name AS medicine_name, m.salt, m.schedule_type, m.reorder_level
     FROM stock s
     JOIN batches b ON b.id = s.batch_id
     JOIN medicines m ON m.id = b.medicine_id
     ${where}
     ORDER BY m.name ASC, b.expiry_date ASC
     LIMIT 1000`,
    params
  );
  return rows;
}

export async function lowStock(org_id, branch_id) {
  const [rows] = await pool.execute(
    `SELECT m.id AS medicine_id, m.name, m.reorder_level,
            COALESCE(SUM(s.qty), 0) AS qty
     FROM medicines m
     LEFT JOIN batches b ON b.medicine_id = m.id
     LEFT JOIN stock s ON s.batch_id = b.id AND s.branch_id = ? AND s.org_id = ?
     WHERE m.org_id = ? AND m.is_active=1
     GROUP BY m.id
     HAVING qty <= m.reorder_level
     ORDER BY qty ASC
     LIMIT 200`,
    [branch_id, org_id, org_id]
  );
  return rows;
}

export async function nearExpiry(org_id, branch_id, days) {
  const [rows] = await pool.execute(
    `SELECT m.name AS medicine_name, m.schedule_type,
            b.id AS batch_id, b.batch_no, b.expiry_date, s.qty
     FROM stock s
     JOIN batches b ON b.id = s.batch_id
     JOIN medicines m ON m.id = b.medicine_id
     WHERE s.org_id=? AND s.branch_id=? AND s.qty>0
       AND b.expiry_date BETWEEN ? AND DATE_ADD(?, INTERVAL ? DAY)
     ORDER BY b.expiry_date ASC
     LIMIT 500`,
    [org_id, branch_id, todayISO(), todayISO(), days]
  );
  return rows;
}

async function getStockQty(conn, org_id, branch_id, batch_id) {
  const [rows] = await conn.execute(
    `SELECT id, qty FROM stock WHERE org_id=? AND branch_id=? AND batch_id=? LIMIT 1`,
    [org_id, branch_id, batch_id]
  );
  return rows?.[0] || null;
}

async function upsertStock(conn, org_id, branch_id, batch_id, qty_delta) {
  const cur = await getStockQty(conn, org_id, branch_id, batch_id);
  if (!cur) {
    await conn.execute(
      `INSERT INTO stock (org_id, branch_id, batch_id, qty) VALUES (?, ?, ?, ?)`,
      [org_id, branch_id, batch_id, qty_delta]
    );
    return qty_delta;
  }
  const newQty = Number(cur.qty) + Number(qty_delta);
  await conn.execute(
    `UPDATE stock SET qty=? WHERE id=?`,
    [newQty, cur.id]
  );
  return newQty;
}

export async function adjustStock({ org_id, branch_id, user_id }, { batch_id, qty_delta, reason }) {
  return withTx(async (conn) => {
    const newQty = await upsertStock(conn, org_id, branch_id, batch_id, qty_delta);
    if (newQty < 0) {
      const err = new Error("Stock cannot be negative");
      err.status = 400;
      throw err;
    }
    await conn.execute(
      `INSERT INTO stock_movements (org_id, branch_id, batch_id, move_type, qty_delta, ref_table, ref_id, reason, created_by)
       VALUES (?, ?, ?, 'ADJUST', ?, 'manual_adjust', NULL, ?, ?)`,
      [org_id, branch_id, batch_id, qty_delta, reason, user_id]
    );
    return { ok: true, batch_id, qty: newQty };
  });
}

export async function transferStock({ org_id, from_branch_id, user_id }, { to_branch_id, items, note }) {
  if (to_branch_id === from_branch_id) {
    const err = new Error("To branch cannot be same as from branch");
    err.status = 400;
    throw err;
  }

  return withTx(async (conn) => {
    // Validate & deduct from source first
    for (const it of items) {
      const cur = await getStockQty(conn, org_id, from_branch_id, it.batch_id);
      const curQty = Number(cur?.qty || 0);
      if (curQty < it.qty) {
        const err = new Error(`Insufficient stock for batch ${it.batch_id}`);
        err.status = 400;
        throw err;
      }
    }

    for (const it of items) {
      const afterFrom = await upsertStock(conn, org_id, from_branch_id, it.batch_id, -it.qty);
      const afterTo = await upsertStock(conn, org_id, to_branch_id, it.batch_id, it.qty);

      await conn.execute(
        `INSERT INTO stock_movements (org_id, branch_id, batch_id, move_type, qty_delta, ref_table, reason, created_by)
         VALUES (?, ?, ?, 'TRANSFER_OUT', ?, 'stock_transfer', ?, ?)`,
        [org_id, from_branch_id, it.batch_id, -it.qty, note || null, user_id]
      );

      await conn.execute(
        `INSERT INTO stock_movements (org_id, branch_id, batch_id, move_type, qty_delta, ref_table, reason, created_by)
         VALUES (?, ?, ?, 'TRANSFER_IN', ?, 'stock_transfer', ?, ?)`,
        [org_id, to_branch_id, it.batch_id, it.qty, note || null, user_id]
      );

      if (afterFrom < 0 || afterTo < 0) {
        const err = new Error("Transfer resulted in negative stock");
        err.status = 400;
        throw err;
      }
    }

    return { ok: true };
  });
}

export async function listAdjustments(org_id, branch_id, { limit }) {
  const [rows] = await pool.execute(
    `SELECT sm.id, sm.org_id, sm.branch_id, sm.batch_id, sm.qty_delta, sm.reason, sm.created_by, sm.created_at,
            b.batch_no, m.name AS medicine_name
     FROM stock_movements sm
     JOIN batches b ON b.id = sm.batch_id
     JOIN medicines m ON m.id = b.medicine_id
     WHERE sm.org_id=? AND sm.branch_id=? AND sm.move_type='ADJUST' AND sm.deleted_at IS NULL
     ORDER BY sm.id DESC
     LIMIT ?`,
    [org_id, branch_id, limit]
  );
  return rows;
}

export async function deleteAdjustment(org_id, branch_id, movementId) {
  return withTx(async (conn) => {
    const [rows] = await conn.execute(
      `SELECT id, batch_id, qty_delta
       FROM stock_movements
       WHERE id=? AND org_id=? AND branch_id=? AND move_type='ADJUST' AND deleted_at IS NULL
       LIMIT 1`,
      [movementId, org_id, branch_id]
    );
    const rec = rows?.[0];
    if (!rec) {
      const err = new Error("Adjustment not found");
      err.status = 404;
      throw err;
    }

    const reverseDelta = -Number(rec.qty_delta);
    const newQty = await upsertStock(conn, org_id, branch_id, rec.batch_id, reverseDelta);
    if (newQty < 0) {
      const err = new Error("Cannot delete adjustment because stock would become negative");
      err.status = 409;
      throw err;
    }

    await conn.execute(
      `UPDATE stock_movements SET deleted_at=NOW() WHERE id=?`,
      [movementId]
    );
    return { ok: true };
  });
}

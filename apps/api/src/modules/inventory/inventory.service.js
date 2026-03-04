import { pool } from "../../db/pool.js";
import { withTx } from "../../db/tx.js";
import { todayISO } from "../../utils/dates.js";

export async function listBranches(org_id) {
  const [rows] = await pool.execute(
    `SELECT id, name, code, is_active
     FROM branches
     WHERE org_id=?
     ORDER BY name ASC`,
    [org_id]
  );
  return rows;
}

export async function listStock(org_id, branch_id, { q, medicine_id, sellable_only }) {
  const params = [org_id, branch_id];
  let where = "WHERE s.org_id=? AND s.branch_id=?";
  if (medicine_id) {
    where += " AND m.id = ?";
    params.push(medicine_id);
  }
  if (q && q.trim()) {
    where += " AND (m.name LIKE ? OR m.salt LIKE ? OR b.batch_no LIKE ? OR m.barcode_primary = ?)";
    const like = `%${q.trim()}%`;
    params.push(like, like, like, q.trim());
  }
  if (Number(sellable_only || 0) === 1 || sellable_only === true) {
    where += " AND s.qty > 0 AND b.expiry_date >= ? AND COALESCE(b.is_blocked, 0) = 0";
    params.push(todayISO());
  }

  const [rows] = await pool.execute(
    `SELECT s.id AS stock_id, s.qty,
            b.id AS batch_id, b.batch_no, b.expiry_date, b.mrp, b.purchase_rate, b.selling_rate, b.gst_rate,
            COALESCE(b.is_blocked, 0) AS is_blocked,
            m.id AS medicine_id, m.name AS medicine_name, m.salt, m.schedule_type, m.reorder_level,
            s.qty AS available_qty,
            b.selling_rate AS sell_rate
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

export async function listTransferBatches(org_id, from_branch_id) {
  const [rows] = await pool.execute(
    `SELECT
       b.id AS batch_id,
       b.batch_no,
       b.expiry_date,
       m.name AS medicine_name,
       s.qty AS available_qty
     FROM stock s
     JOIN batches b ON b.id = s.batch_id
     JOIN medicines m ON m.id = b.medicine_id
     WHERE s.org_id=? AND s.branch_id=? AND s.qty > 0
     ORDER BY m.name ASC, b.expiry_date ASC
     LIMIT 1000`,
    [org_id, from_branch_id]
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
            b.id AS batch_id, b.batch_no, b.expiry_date, COALESCE(b.is_blocked, 0) AS is_blocked, s.qty
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

async function getBranchCode(conn, branch_id) {
  const [rows] = await conn.execute(`SELECT code FROM branches WHERE id=? LIMIT 1`, [branch_id]);
  return rows?.[0]?.code || "BR";
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
    for (const it of items) {
      const cur = await getStockQty(conn, org_id, from_branch_id, it.batch_id);
      const curQty = Number(cur?.qty || 0);
      if (curQty < it.qty) {
        const err = new Error(`Insufficient stock for batch ${it.batch_id}`);
        err.status = 400;
        throw err;
      }
    }

    let transferId = null;
    let transferNo = null;
    try {
      const [tr] = await conn.execute(
        `INSERT INTO inventory_transfers (org_id, from_branch_id, to_branch_id, transfer_no, note, status, created_by)
         VALUES (?, ?, ?, 'TEMP', ?, 'POSTED', ?)`,
        [org_id, from_branch_id, to_branch_id, note || null, user_id]
      );
      transferId = tr.insertId;
      const branchCode = await getBranchCode(conn, from_branch_id);
      transferNo = `TR-${branchCode}-${String(transferId).padStart(6, "0")}`;
      await conn.execute(`UPDATE inventory_transfers SET transfer_no=? WHERE id=?`, [transferNo, transferId]);
    } catch (e) {
      if (e?.code !== "ER_NO_SUCH_TABLE") throw e;
    }

    for (const it of items) {
      const afterFrom = await upsertStock(conn, org_id, from_branch_id, it.batch_id, -it.qty);
      const afterTo = await upsertStock(conn, org_id, to_branch_id, it.batch_id, it.qty);

      if (transferId) {
        await conn.execute(
          `INSERT INTO inventory_transfer_items (transfer_id, batch_id, qty) VALUES (?, ?, ?)`,
          [transferId, it.batch_id, it.qty]
        );
      }

      await conn.execute(
        `INSERT INTO stock_movements (org_id, branch_id, batch_id, move_type, qty_delta, ref_table, ref_id, reason, created_by)
         VALUES (?, ?, ?, 'TRANSFER_OUT', ?, 'inventory_transfers', ?, ?, ?)`,
        [org_id, from_branch_id, it.batch_id, -it.qty, transferId, note || transferNo || null, user_id]
      );

      await conn.execute(
        `INSERT INTO stock_movements (org_id, branch_id, batch_id, move_type, qty_delta, ref_table, ref_id, reason, created_by)
         VALUES (?, ?, ?, 'TRANSFER_IN', ?, 'inventory_transfers', ?, ?, ?)`,
        [org_id, to_branch_id, it.batch_id, it.qty, transferId, note || transferNo || null, user_id]
      );

      if (afterFrom < 0 || afterTo < 0) {
        const err = new Error("Transfer resulted in negative stock");
        err.status = 400;
        throw err;
      }
    }

    return { ok: true, transfer_id: transferId, transfer_no: transferNo };
  });
}

export async function listTransfers(org_id, branch_id, { limit, from, to, from_branch_id, to_branch_id }) {
  try {
    const params = [org_id, branch_id, branch_id];
    let where = `WHERE t.org_id=? AND (t.from_branch_id=? OR t.to_branch_id=?)`;
    if (from) {
      where += ` AND DATE(t.created_at) >= ?`;
      params.push(from);
    }
    if (to) {
      where += ` AND DATE(t.created_at) <= ?`;
      params.push(to);
    }
    if (from_branch_id) {
      where += ` AND t.from_branch_id = ?`;
      params.push(from_branch_id);
    }
    if (to_branch_id) {
      where += ` AND t.to_branch_id = ?`;
      params.push(to_branch_id);
    }

    const [rows] = await pool.execute(
      `SELECT t.id, t.transfer_no, t.note, t.status, t.created_at,
              fb.name AS from_branch_name, tb.name AS to_branch_name,
              COUNT(ti.id) AS item_count,
              COALESCE(SUM(ti.qty), 0) AS total_qty
       FROM inventory_transfers t
       JOIN branches fb ON fb.id = t.from_branch_id
       JOIN branches tb ON tb.id = t.to_branch_id
       LEFT JOIN inventory_transfer_items ti ON ti.transfer_id = t.id
       ${where}
       GROUP BY t.id
       ORDER BY t.id DESC
       LIMIT ?`,
      [...params, limit]
    );
    return rows;
  } catch (e) {
    if (e?.code === "ER_NO_SUCH_TABLE") return [];
    throw e;
  }
}

export async function getTransfer(org_id, branch_id, transferId) {
  try {
    const [rows] = await pool.execute(
      `SELECT t.id, t.transfer_no, t.note, t.status, t.created_at, t.from_branch_id, t.to_branch_id,
              fb.name AS from_branch_name, tb.name AS to_branch_name
       FROM inventory_transfers t
       JOIN branches fb ON fb.id = t.from_branch_id
       JOIN branches tb ON tb.id = t.to_branch_id
       WHERE t.org_id=? AND t.id=? AND (t.from_branch_id=? OR t.to_branch_id=?)
       LIMIT 1`,
      [org_id, transferId, branch_id, branch_id]
    );
    if (!rows.length) return null;

    const [items] = await pool.execute(
      `SELECT ti.id, ti.batch_id, ti.qty, b.batch_no, m.name AS medicine_name
       FROM inventory_transfer_items ti
       JOIN batches b ON b.id = ti.batch_id
       JOIN medicines m ON m.id = b.medicine_id
       WHERE ti.transfer_id=?
       ORDER BY ti.id ASC`,
      [transferId]
    );

    return { transfer: rows[0], items };
  } catch (e) {
    if (e?.code === "ER_NO_SUCH_TABLE") return null;
    throw e;
  }
}

export async function markDeadStock({ org_id, branch_id, user_id }, { batch_id, qty, reason }) {
  return withTx(async (conn) => {
    const cur = await getStockQty(conn, org_id, branch_id, batch_id);
    const curQty = Number(cur?.qty || 0);
    if (curQty < qty) {
      const err = new Error(`Insufficient stock for batch ${batch_id}. Available: ${curQty}`);
      err.status = 400;
      throw err;
    }

    const newQty = await upsertStock(conn, org_id, branch_id, batch_id, -qty);
    if (newQty < 0) {
      const err = new Error("Stock cannot be negative");
      err.status = 400;
      throw err;
    }

    let deadStockId = null;
    try {
      const [ds] = await conn.execute(
        `INSERT INTO dead_stock_records (org_id, branch_id, batch_id, qty, reason, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [org_id, branch_id, batch_id, qty, reason, user_id]
      );
      deadStockId = ds.insertId;
    } catch (e) {
      if (e?.code !== "ER_NO_SUCH_TABLE") throw e;
    }

    await conn.execute(
      `INSERT INTO stock_movements (org_id, branch_id, batch_id, move_type, qty_delta, ref_table, ref_id, reason, created_by)
       VALUES (?, ?, ?, 'ADJUST', ?, 'dead_stock', ?, ?, ?)`,
      [org_id, branch_id, batch_id, -qty, deadStockId, reason, user_id]
    );

    return { ok: true, dead_stock_id: deadStockId, batch_id, qty, remaining_qty: newQty };
  });
}

export async function blockBatch(org_id, batch_id, blocked) {
  try {
    const [res] = await pool.execute(
      `UPDATE batches SET is_blocked=? WHERE org_id=? AND id=?`,
      [blocked ? 1 : 0, org_id, batch_id]
    );
    if (Number(res.affectedRows || 0) === 0) {
      const err = new Error("Batch not found");
      err.status = 404;
      throw err;
    }
    const [rows] = await pool.execute(
      `SELECT id AS batch_id, is_blocked FROM batches WHERE id=? AND org_id=? LIMIT 1`,
      [batch_id, org_id]
    );
    return rows[0];
  } catch (e) {
    if (e?.code === "ER_BAD_FIELD_ERROR") {
      const err = new Error("batches.is_blocked missing. Run migration 2026_03_store_manager_workflows.sql");
      err.status = 500;
      throw err;
    }
    throw e;
  }
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

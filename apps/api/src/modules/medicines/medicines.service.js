import { pool } from "../../db/pool.js";

export async function list(org_id, { page = 1, pageSize = 50 }) {
  const p = Math.max(1, Number(page));
  const ps = Math.min(200, Math.max(1, Number(pageSize)));
  const offset = (p - 1) * ps;

  const [rows] = await pool.execute(
    `SELECT id, name, salt, manufacturer, schedule_type, gst_rate, reorder_level, barcode_primary, is_active, created_at
     FROM medicines
     WHERE org_id = ? AND deleted_at IS NULL
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [org_id, ps, offset]
  );

  const [[countRow]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM medicines WHERE org_id = ? AND deleted_at IS NULL`,
    [org_id]
  );

  return { rows, page: p, pageSize: ps, total: countRow.total };
}

export async function create(org_id, input) {
  const [res] = await pool.execute(
    `INSERT INTO medicines (org_id, name, salt, manufacturer, schedule_type, gst_rate, reorder_level, barcode_primary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      org_id,
      input.name,
      input.salt || null,
      input.manufacturer || null,
      input.schedule_type || "OTC",
      input.gst_rate ?? 0,
      input.reorder_level ?? 0,
      input.barcode_primary || null,
    ]
  );

  const id = res.insertId;
  const [rows] = await pool.execute(
    `SELECT * FROM medicines WHERE id=? AND deleted_at IS NULL`,
    [id]
  );
  return rows[0];
}

export async function getById(org_id, id) {
  const [rows] = await pool.execute(
    `SELECT * FROM medicines WHERE id=? AND org_id=? AND deleted_at IS NULL LIMIT 1`,
    [id, org_id]
  );
  return rows?.[0] || null;
}

export async function update(org_id, id, patch) {
  const current = await getById(org_id, id);
  if (!current) {
    const err = new Error("Medicine not found");
    err.status = 404;
    throw err;
  }

  const fields = [];
  const vals = [];

  const map = {
    name: "name",
    salt: "salt",
    manufacturer: "manufacturer",
    schedule_type: "schedule_type",
    gst_rate: "gst_rate",
    reorder_level: "reorder_level",
    barcode_primary: "barcode_primary",
    is_active: "is_active",
  };

  for (const [k, col] of Object.entries(map)) {
    if (patch[k] !== undefined) {
      fields.push(`${col}=?`);
      vals.push(patch[k]);
    }
  }

  if (fields.length === 0) return current;

  vals.push(id, org_id);
  await pool.execute(
    `UPDATE medicines SET ${fields.join(", ")}, updated_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=? AND deleted_at IS NULL`,
    vals
  );

  const [out] = await pool.execute(
    `SELECT * FROM medicines WHERE id=? AND deleted_at IS NULL`,
    [id]
  );
  return out[0];
}

export async function remove(org_id, id) {
  const current = await getById(org_id, id);
  if (!current) {
    const err = new Error("Medicine not found");
    err.status = 404;
    throw err;
  }

  const [[batchRow]] = await pool.execute(
    `SELECT COUNT(*) AS cnt FROM batches WHERE org_id=? AND medicine_id=? AND deleted_at IS NULL`,
    [org_id, id]
  );
  if (Number(batchRow?.cnt || 0) > 0) {
    const err = new Error("Medicine has batches and cannot be deleted");
    err.status = 409;
    throw err;
  }

  await pool.execute(
    `UPDATE medicines SET deleted_at=NOW(), is_active=0, updated_at=CURRENT_TIMESTAMP
     WHERE id=? AND org_id=? AND deleted_at IS NULL`,
    [id, org_id]
  );
  return { ok: true };
}

export async function search(org_id, q) {
  const term = q.trim();
  const like = `%${term}%`;

  // Try barcode exact match first
  const [barcodeMatch] = await pool.execute(
    `SELECT m.id, m.name, m.salt, m.manufacturer, m.schedule_type, m.gst_rate, m.reorder_level, m.barcode_primary
     FROM medicines m
     LEFT JOIN medicine_barcodes mb ON mb.medicine_id = m.id
     WHERE m.org_id=? AND m.is_active=1 AND m.deleted_at IS NULL
       AND (m.barcode_primary = ? OR mb.barcode = ?)
     LIMIT 20`,
    [org_id, term, term]
  );
  if (barcodeMatch.length) return barcodeMatch;

  const [rows] = await pool.execute(
    `SELECT id, name, salt, manufacturer, schedule_type, gst_rate, reorder_level, barcode_primary
     FROM medicines
     WHERE org_id=? AND is_active=1 AND deleted_at IS NULL
       AND (name LIKE ? OR salt LIKE ? OR manufacturer LIKE ?)
     ORDER BY name ASC
     LIMIT 50`,
    [org_id, like, like, like]
  );
  return rows;
}

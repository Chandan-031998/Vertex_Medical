import { pool } from "../../db/pool.js";

export async function list(org_id, { medicine_id }) {
  const params = [org_id];
  let where = "WHERE b.org_id=? AND b.deleted_at IS NULL";
  if (medicine_id) {
    where += " AND b.medicine_id=?";
    params.push(medicine_id);
  }
  const [rows] = await pool.execute(
    `SELECT b.id, b.medicine_id, m.name AS medicine_name, b.batch_no, b.expiry_date,
            b.mrp, b.purchase_rate, b.selling_rate, b.gst_rate, b.created_at
     FROM batches b
     JOIN medicines m ON m.id = b.medicine_id AND m.deleted_at IS NULL
     ${where}
     ORDER BY b.id DESC
     LIMIT 500`,
    params
  );
  return rows;
}

export async function create(org_id, input) {
  const [res] = await pool.execute(
    `INSERT INTO batches (org_id, medicine_id, batch_no, expiry_date, mrp, purchase_rate, selling_rate, gst_rate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [org_id, input.medicine_id, input.batch_no, input.expiry_date, input.mrp, input.purchase_rate, input.selling_rate, input.gst_rate]
  );
  const id = res.insertId;
  const [rows] = await pool.execute(
    `SELECT * FROM batches WHERE id=? AND deleted_at IS NULL`,
    [id]
  );
  return rows[0];
}

export async function getById(org_id, id) {
  const [rows] = await pool.execute(
    `SELECT * FROM batches WHERE id=? AND org_id=? AND deleted_at IS NULL LIMIT 1`,
    [id, org_id]
  );
  return rows?.[0] || null;
}

export async function update(org_id, id, patch) {
  const current = await getById(org_id, id);
  if (!current) {
    const err = new Error("Batch not found");
    err.status = 404;
    throw err;
  }

  const fields = [];
  const vals = [];
  const map = {
    batch_no: "batch_no",
    expiry_date: "expiry_date",
    mrp: "mrp",
    purchase_rate: "purchase_rate",
    selling_rate: "selling_rate",
    gst_rate: "gst_rate",
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
    `UPDATE batches SET ${fields.join(", ")}, updated_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=? AND deleted_at IS NULL`,
    vals
  );

  const [out] = await pool.execute(
    `SELECT * FROM batches WHERE id=? AND deleted_at IS NULL`,
    [id]
  );
  return out[0];
}

export async function remove(org_id, id) {
  const current = await getById(org_id, id);
  if (!current) {
    const err = new Error("Batch not found");
    err.status = 404;
    throw err;
  }

  const [[stockRow]] = await pool.execute(
    `SELECT COUNT(*) AS cnt FROM stock WHERE org_id=? AND batch_id=? AND qty > 0`,
    [org_id, id]
  );
  if (Number(stockRow?.cnt || 0) > 0) {
    const err = new Error("Batch has stock and cannot be deleted");
    err.status = 409;
    throw err;
  }

  await pool.execute(
    `UPDATE batches SET deleted_at=NOW(), updated_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=? AND deleted_at IS NULL`,
    [id, org_id]
  );
  return { ok: true };
}

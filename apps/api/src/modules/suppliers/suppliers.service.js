import { pool } from "../../db/pool.js";

export async function list(org_id, { q }) {
  const params = [org_id];
  let where = "WHERE org_id=? AND deleted_at IS NULL";
  if (q && q.trim()) {
    const like = `%${q.trim()}%`;
    where += " AND (name LIKE ? OR gstin LIKE ? OR phone LIKE ?)";
    params.push(like, like, like);
  }
  const [rows] = await pool.execute(
    `SELECT id, name, gstin, phone, email, address, created_at
     FROM suppliers
     ${where}
     ORDER BY id DESC
     LIMIT 300`,
    params
  );
  return rows;
}

export async function create(org_id, input) {
  const [res] = await pool.execute(
    `INSERT INTO suppliers (org_id, name, gstin, phone, email, address) VALUES (?, ?, ?, ?, ?, ?)`,
    [org_id, input.name, input.gstin || null, input.phone || null, input.email || null, input.address || null]
  );
  const id = res.insertId;
  const [rows] = await pool.execute(`SELECT * FROM suppliers WHERE id=? AND deleted_at IS NULL`, [id]);
  return rows[0];
}

export async function getById(org_id, id) {
  const [rows] = await pool.execute(
    `SELECT * FROM suppliers WHERE id=? AND org_id=? AND deleted_at IS NULL LIMIT 1`,
    [id, org_id]
  );
  return rows?.[0] || null;
}

export async function update(org_id, id, patch) {
  const cur = await getById(org_id, id);
  if (!cur) {
    const err = new Error("Supplier not found");
    err.status = 404;
    throw err;
  }

  const fields = [];
  const vals = [];
  const map = { name:"name", gstin:"gstin", phone:"phone", email:"email", address:"address" };
  for (const [k, col] of Object.entries(map)) {
    if (patch[k] !== undefined) { fields.push(`${col}=?`); vals.push(patch[k]); }
  }
  if (!fields.length) return cur;

  vals.push(id, org_id);
  await pool.execute(`UPDATE suppliers SET ${fields.join(", ")}, updated_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=? AND deleted_at IS NULL`, vals);

  const [out] = await pool.execute(`SELECT * FROM suppliers WHERE id=? AND deleted_at IS NULL`, [id]);
  return out[0];
}

export async function remove(org_id, id) {
  const cur = await getById(org_id, id);
  if (!cur) {
    const err = new Error("Supplier not found");
    err.status = 404;
    throw err;
  }
  const [[useRow]] = await pool.execute(
    `SELECT COUNT(*) AS cnt FROM purchase_invoices WHERE org_id=? AND supplier_id=?`,
    [org_id, id]
  );
  if (Number(useRow?.cnt || 0) > 0) {
    const err = new Error("Supplier is in use and cannot be deleted");
    err.status = 409;
    throw err;
  }
  await pool.execute(
    `UPDATE suppliers SET deleted_at=NOW(), updated_at=CURRENT_TIMESTAMP WHERE id=? AND org_id=? AND deleted_at IS NULL`,
    [id, org_id]
  );
  return { ok: true };
}

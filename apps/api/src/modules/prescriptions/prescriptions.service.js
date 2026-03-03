import { pool } from "../../db/pool.js";

export async function list(org_id, branch_id) {
  const [rows] = await pool.execute(
    `SELECT p.id, p.customer_id, c.name AS customer_name, c.phone AS customer_phone,
            p.doctor_name, p.doctor_reg_no, p.notes, p.created_at
     FROM prescriptions p
     LEFT JOIN customers c ON c.id = p.customer_id
     WHERE p.org_id=? AND p.branch_id=?
     ORDER BY p.id DESC
     LIMIT 200`,
    [org_id, branch_id]
  );

  // Attach file count
  const ids = rows.map(r => r.id);
  if (ids.length) {
    const [fc] = await pool.query(
      `SELECT prescription_id, COUNT(*) AS files FROM prescription_files WHERE prescription_id IN (${ids.map(()=>"?").join(",")}) GROUP BY prescription_id`,
      ids
    );
    const map = new Map(fc.map(r => [r.prescription_id, r.files]));
    for (const r of rows) r.files = map.get(r.id) || 0;
  }
  return rows;
}

export async function create({ org_id, branch_id, user_id }, input, fileMeta) {
  const [res] = await pool.execute(
    `INSERT INTO prescriptions (org_id, branch_id, customer_id, doctor_name, doctor_reg_no, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [org_id, branch_id, input.customer_id || null, input.doctor_name || null, input.doctor_reg_no || null, input.notes || null, user_id]
  );
  const id = res.insertId;

  if (fileMeta) {
    await pool.execute(
      `INSERT INTO prescription_files (prescription_id, file_path, original_name, mime_type, size_bytes)
       VALUES (?, ?, ?, ?, ?)`,
      [id, fileMeta.file_path, fileMeta.original_name, fileMeta.mime_type, fileMeta.size_bytes]
    );
  }

  const [rows] = await pool.execute(`SELECT * FROM prescriptions WHERE id=?`, [id]);
  return rows[0];
}

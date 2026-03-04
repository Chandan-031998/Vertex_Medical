import { pool } from "../../db/pool.js";

function normalizeFilePath(filePath) {
  if (!filePath) return null;
  const normalized = String(filePath).replace(/\\/g, "/");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

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

  const ids = rows.map((r) => r.id);
  if (ids.length) {
    const [fc] = await pool.query(
      `SELECT prescription_id, COUNT(*) AS files FROM prescription_files WHERE prescription_id IN (${ids.map(() => "?").join(",")}) GROUP BY prescription_id`,
      ids
    );
    const map = new Map(fc.map((r) => [r.prescription_id, r.files]));
    for (const r of rows) r.files = map.get(r.id) || 0;
  }
  return rows;
}

export async function getById(org_id, branch_id, id) {
  const [rows] = await pool.execute(
    `SELECT p.id, p.customer_id, c.name AS customer_name, c.phone AS customer_phone,
            p.doctor_name, p.doctor_reg_no, p.notes, p.created_at
     FROM prescriptions p
     LEFT JOIN customers c ON c.id = p.customer_id
     WHERE p.id=? AND p.org_id=? AND p.branch_id=?
     LIMIT 1`,
    [id, org_id, branch_id]
  );
  if (!rows.length) return null;

  const [files] = await pool.execute(
    `SELECT id, file_path, original_name, mime_type, size_bytes, uploaded_at
     FROM prescription_files
     WHERE prescription_id=?
     ORDER BY id DESC`,
    [id]
  );

  return {
    ...rows[0],
    files: files.map((f) => ({ ...f, file_url: `/uploads${normalizeFilePath(f.file_path)}` })),
  };
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

  return getById(org_id, branch_id, id);
}

export async function linkToInvoice(org_id, { invoice_id, prescription_id }) {
  const [[inv]] = await pool.execute(
    `SELECT id, org_id FROM invoices WHERE id=? AND org_id=? LIMIT 1`,
    [invoice_id, org_id]
  );
  if (!inv) {
    const err = new Error("Invoice not found");
    err.status = 404;
    throw err;
  }

  const [[pr]] = await pool.execute(
    `SELECT id, org_id FROM prescriptions WHERE id=? AND org_id=? LIMIT 1`,
    [prescription_id, org_id]
  );
  if (!pr) {
    const err = new Error("Prescription not found");
    err.status = 404;
    throw err;
  }

  await pool.execute(
    `INSERT IGNORE INTO invoice_prescriptions (invoice_id, prescription_id) VALUES (?, ?)`,
    [invoice_id, prescription_id]
  );

  return { ok: true, invoice_id, prescription_id };
}

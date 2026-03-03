import { pool } from "../db/pool.js";

export async function auditLog({ org_id, branch_id, user_id, action, entity, entity_id, before, after, req }) {
  try {
    const ip = req?.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() || req?.ip || null;
    const ua = req?.headers["user-agent"] || null;
    const payload = [
      org_id,
      branch_id || null,
      user_id || null,
      action,
      entity,
      entity_id || null,
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null,
      ip,
      ua,
    ];
    try {
      await pool.execute(
        `INSERT INTO audit_logs (org_id, branch_id, user_id, action, entity, entity_id, before_json, after_json, ip, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        payload
      );
    } catch (insertErr) {
      if (insertErr?.code !== "ER_BAD_FIELD_ERROR") throw insertErr;
      await pool.execute(
        `INSERT INTO audit_logs (org_id, branch_id, user_id, action, entity, entity_id, before_json, after_json, ip, ua)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        payload
      );
    }
  } catch (e) {
    // don't fail main request on audit insert errors
    console.warn("Audit log failed:", e.message);
  }
}

import { pool } from "../db/pool.js";

export function requireModule(moduleKey) {
  return async (req, res, next) => {
    try {
      const [rows] = await pool.execute(
        `SELECT m.module_key, m.is_core, COALESCE(om.enabled, m.is_core) AS enabled
         FROM modules m
         LEFT JOIN org_modules om
           ON om.module_key = m.module_key AND om.org_id = ?
         WHERE m.module_key = ?
         LIMIT 1`,
        [req.user.org_id, moduleKey]
      );
      const mod = rows?.[0];
      if (!mod) return next();
      if (Number(mod.enabled) === 1) return next();
      return res.status(403).json({ message: "Module disabled" });
    } catch (err) {
      next(err);
    }
  };
}

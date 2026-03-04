import { Router } from "express";
import { authRequired } from "../../middleware/auth.middleware.js";
import { requireAnyPerms } from "../../middleware/rbac.middleware.js";
import { pool } from "../../db/pool.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const r = Router();

r.use(authRequired);

r.get(
  "/",
  requireAnyPerms(["USER_ADMIN", "BRANCH_READ", "INVENTORY_READ", "STOCK_TRANSFER_CREATE"]),
  asyncHandler(async (req, res) => {
    const [rows] = await pool.execute(
      `SELECT id, name, code
       FROM branches
       WHERE org_id=? AND is_active=1
       ORDER BY name ASC`,
      [req.user.org_id]
    );
    res.json(rows);
  })
);

export default r;

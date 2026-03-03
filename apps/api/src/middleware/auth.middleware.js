import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";

export async function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing Authorization Bearer token" });

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    const [rows] = await pool.execute(
      `SELECT org_id, is_active, token_version FROM users WHERE id=? LIMIT 1`,
      [payload.user_id]
    );
    const user = rows?.[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ message: "User inactive or not found" });
    }
    if (Number(payload.org_id) !== Number(user.org_id)) {
      return res.status(401).json({ message: "Token org mismatch" });
    }
    if (Number(payload.token_version) !== Number(user.token_version)) {
      return res.status(401).json({ message: "Token has been invalidated. Please login again." });
    }

    req.user = payload; // { user_id, org_id, branch_id, role_id, perms: [], token_version }
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

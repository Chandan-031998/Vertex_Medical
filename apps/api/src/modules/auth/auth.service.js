import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { pool } from "../../db/pool.js";
import { env } from "../../config/env.js";

function sha256Hex(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL });
}

function refreshExpiryDate() {
  const days = Number(env.REFRESH_TOKEN_TTL_DAYS || 14);
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

export async function login({ email, password }) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.org_id, u.branch_id, u.role_id, u.name, u.email, u.password_hash, u.token_version, r.role_key
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.email = ? AND u.is_active = 1 AND r.is_active = 1
     LIMIT 1`,
    [email]
  );

  const user = rows?.[0];
  if (!user) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }

  // permissions
  const [permRows] = await pool.execute(
    `SELECT p.perm_key
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = ?`,
    [user.role_id]
  );
  const perms = permRows.map(r => r.perm_key);

  const access_payload = {
    user_id: user.id,
    org_id: user.org_id,
    branch_id: user.branch_id,
    role_id: user.role_id,
    role_key: user.role_key,
    perms,
    token_version: user.token_version,
  };

  const access_token = signAccessToken(access_payload);

  // refresh token = random string, stored hashed in DB
  const refresh_token = crypto.randomBytes(48).toString("base64url");
  const token_hash = sha256Hex(refresh_token);
  const expires_at = refreshExpiryDate();

  await pool.execute(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
    [user.id, token_hash, expires_at]
  );

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      org_id: user.org_id,
      branch_id: user.branch_id,
      role_key: user.role_key,
      perms,
    },
    access_token,
    refresh_token,
  };
}

export async function refresh({ refresh_token }) {
  const token_hash = sha256Hex(refresh_token);
  const [rows] = await pool.execute(
    `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at,
            u.org_id, u.branch_id, u.role_id, u.name, u.email, u.token_version, r.role_key
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     JOIN roles r ON r.id = u.role_id
     WHERE rt.token_hash = ? AND u.is_active = 1 AND r.is_active = 1
     LIMIT 1`,
    [token_hash]
  );

  const rec = rows?.[0];
  if (!rec || rec.revoked_at) {
    const err = new Error("Invalid refresh token");
    err.status = 401;
    throw err;
  }

  if (new Date(rec.expires_at).getTime() < Date.now()) {
    const err = new Error("Refresh token expired");
    err.status = 401;
    throw err;
  }

  const [permRows] = await pool.execute(
    `SELECT p.perm_key
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = ?`,
    [rec.role_id]
  );
  const perms = permRows.map(r => r.perm_key);

  const access_payload = {
    user_id: rec.user_id,
    org_id: rec.org_id,
    branch_id: rec.branch_id,
    role_id: rec.role_id,
    role_key: rec.role_key,
    perms,
    token_version: rec.token_version,
  };

  const access_token = signAccessToken(access_payload);
  return { access_token };
}

export async function logout({ refresh_token }) {
  const token_hash = sha256Hex(refresh_token);
  await pool.execute(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?`,
    [token_hash]
  );
  return { ok: true };
}

export async function me(user_id) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.email, u.org_id, u.branch_id, r.role_key
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = ? LIMIT 1`,
    [user_id]
  );
  return rows?.[0] || null;
}

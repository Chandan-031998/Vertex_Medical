import bcrypt from "bcryptjs";
import { pool } from "../../db/pool.js";
import { withTx } from "../../db/tx.js";

async function invalidateUsersByRole(conn, org_id, role_id) {
  await conn.execute(
    `UPDATE users
     SET token_version = token_version + 1
     WHERE org_id=? AND role_id=?`,
    [org_id, role_id]
  );
  await conn.execute(
    `UPDATE refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     SET rt.revoked_at = NOW()
     WHERE u.org_id=? AND u.role_id=? AND rt.revoked_at IS NULL`,
    [org_id, role_id]
  );
}

export async function listBranches(org_id) {
  const [rows] = await pool.execute(
    `SELECT id, name, code, address, phone, is_active, created_at
     FROM branches WHERE org_id = ? ORDER BY id DESC`,
    [org_id]
  );
  return rows;
}

export async function createBranch(org_id, input) {
  const [res] = await pool.execute(
    `INSERT INTO branches (org_id, name, code, address, phone) VALUES (?, ?, ?, ?, ?)`,
    [org_id, input.name, input.code, input.address || null, input.phone || null]
  );
  const id = res.insertId;
  const [rows] = await pool.execute(
    `SELECT id, name, code, address, phone, is_active, created_at FROM branches WHERE id=?`,
    [id]
  );
  return rows[0];
}

export async function listRoles(org_id) {
  const [rows] = await pool.execute(
    `SELECT id, name, role_key, description, is_system, is_active AS active, created_at
     FROM roles WHERE org_id = ? ORDER BY id ASC`,
    [org_id]
  );
  return rows;
}

export async function listPermissions() {
  const [rows] = await pool.execute(
    `SELECT id, perm_key, name FROM permissions ORDER BY perm_key ASC`
  );
  return rows;
}

export async function getRoleById(org_id, roleId) {
  const [rows] = await pool.execute(
    `SELECT id, name, role_key, description, is_system, is_active AS active, created_at
     FROM roles WHERE id=? AND org_id=? LIMIT 1`,
    [roleId, org_id]
  );
  return rows?.[0] || null;
}

export async function getUserById(org_id, userId) {
  const [rows] = await pool.execute(
    `SELECT id, name, email, phone, branch_id, role_id, is_active, token_version, created_at
     FROM users WHERE id=? AND org_id=? LIMIT 1`,
    [userId, org_id]
  );
  return rows?.[0] || null;
}

export async function getRolePermissionKeys(roleId) {
  const [rows] = await pool.execute(
    `SELECT p.perm_key
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = ?
     ORDER BY p.perm_key ASC`,
    [roleId]
  );
  return rows.map((r) => r.perm_key);
}

export async function createRole(org_id, input) {
  const [res] = await pool.execute(
    `INSERT INTO roles (org_id, name, role_key, description, is_system, is_active)
     VALUES (?, ?, ?, ?, 0, ?)`,
    [org_id, input.name, input.role_key, input.description || null, input.active ?? 1]
  );
  const [rows] = await pool.execute(
    `SELECT id, name, role_key, description, is_system, is_active AS active, created_at
     FROM roles WHERE id=? AND org_id=? LIMIT 1`,
    [res.insertId, org_id]
  );
  return rows[0];
}

export async function updateRole(org_id, roleId, patch) {
  const [curRows] = await pool.execute(
    `SELECT id, org_id, is_system FROM roles WHERE id=? AND org_id=? LIMIT 1`,
    [roleId, org_id]
  );
  const current = curRows?.[0];
  if (!current) {
    const err = new Error("Role not found");
    err.status = 404;
    throw err;
  }

  const fields = [];
  const vals = [];
  if (patch.name !== undefined) { fields.push("name=?"); vals.push(patch.name); }
  if (patch.role_key !== undefined) { fields.push("role_key=?"); vals.push(patch.role_key); }
  if (patch.description !== undefined) { fields.push("description=?"); vals.push(patch.description); }
  if (patch.active !== undefined) { fields.push("is_active=?"); vals.push(patch.active); }
  if (fields.length === 0) {
    const [outRows] = await pool.execute(
      `SELECT id, name, role_key, description, is_system, is_active AS active, created_at
       FROM roles WHERE id=? AND org_id=? LIMIT 1`,
      [roleId, org_id]
    );
    return outRows[0];
  }

  vals.push(roleId, org_id);
  await pool.execute(
    `UPDATE roles SET ${fields.join(", ")} WHERE id=? AND org_id=?`,
    vals
  );

  if (patch.active !== undefined) {
    await withTx(async (conn) => {
      await invalidateUsersByRole(conn, org_id, roleId);
    });
  }

  const [rows] = await pool.execute(
    `SELECT id, name, role_key, description, is_system, is_active AS active, created_at
     FROM roles WHERE id=? AND org_id=? LIMIT 1`,
    [roleId, org_id]
  );
  return rows[0];
}

export async function deleteRole(org_id, roleId) {
  const [curRows] = await pool.execute(
    `SELECT id, is_system FROM roles WHERE id=? AND org_id=? LIMIT 1`,
    [roleId, org_id]
  );
  const current = curRows?.[0];
  if (!current) {
    const err = new Error("Role not found");
    err.status = 404;
    throw err;
  }
  if (Number(current.is_system) === 1) {
    const err = new Error("System roles cannot be deleted");
    err.status = 400;
    throw err;
  }

  const [userRows] = await pool.execute(
    `SELECT COUNT(*) AS cnt FROM users WHERE org_id=? AND role_id=?`,
    [org_id, roleId]
  );
  if (Number(userRows?.[0]?.cnt || 0) > 0) {
    const err = new Error("Role is assigned to users and cannot be deleted");
    err.status = 400;
    throw err;
  }

  await pool.execute(`DELETE FROM roles WHERE id=? AND org_id=?`, [roleId, org_id]);
  return { ok: true };
}

export async function getRolePermissions(org_id, roleId) {
  const [roleRows] = await pool.execute(
    `SELECT id, name, role_key, description, is_system, is_active AS active
     FROM roles WHERE id=? AND org_id=? LIMIT 1`,
    [roleId, org_id]
  );
  const role = roleRows?.[0];
  if (!role) {
    const err = new Error("Role not found");
    err.status = 404;
    throw err;
  }
  const [permRows] = await pool.execute(
    `SELECT p.id, p.perm_key, p.name
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = ?
     ORDER BY p.perm_key ASC`,
    [roleId]
  );
  return { role, permissions: permRows };
}

export async function replaceRolePermissions(org_id, roleId, permKeys = []) {
  const uniquePermKeys = [...new Set(permKeys)];
  return withTx(async (conn) => {
    const [roleRows] = await conn.execute(
      `SELECT id FROM roles WHERE id=? AND org_id=? LIMIT 1`,
      [roleId, org_id]
    );
    if (!roleRows?.[0]) {
      const err = new Error("Role not found");
      err.status = 404;
      throw err;
    }

    const permissionIds = [];
    if (uniquePermKeys.length > 0) {
      const placeholders = uniquePermKeys.map(() => "?").join(", ");
      const [rows] = await conn.execute(
        `SELECT id, perm_key FROM permissions WHERE perm_key IN (${placeholders})`,
        uniquePermKeys
      );
      const found = new Set(rows.map((r) => r.perm_key));
      const missing = uniquePermKeys.filter((k) => !found.has(k));
      if (missing.length > 0) {
        const err = new Error(`Unknown permission keys: ${missing.join(", ")}`);
        err.status = 400;
        throw err;
      }
      rows.forEach((r) => permissionIds.push(r.id));
    }

    await conn.execute(`DELETE FROM role_permissions WHERE role_id=?`, [roleId]);
    if (permissionIds.length > 0) {
      const valuesSql = permissionIds.map(() => "(?, ?)").join(", ");
      const params = [];
      for (const pid of permissionIds) {
        params.push(roleId, pid);
      }
      await conn.execute(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ${valuesSql}`,
        params
      );
    }

    await invalidateUsersByRole(conn, org_id, roleId);

    const [outRows] = await conn.execute(
      `SELECT p.id, p.perm_key, p.name
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = ?
       ORDER BY p.perm_key ASC`,
      [roleId]
    );
    return { role_id: roleId, permissions: outRows };
  });
}

export async function listUsers(org_id) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.email, u.phone, u.is_active, u.created_at,
            u.branch_id, b.name AS branch_name, u.role_id, r.name AS role_name, r.role_key
     FROM users u
     JOIN branches b ON b.id = u.branch_id
     JOIN roles r ON r.id = u.role_id
     WHERE u.org_id = ?
     ORDER BY u.id DESC`,
    [org_id]
  );
  return rows;
}

export async function createUser(org_id, input) {
  const password_hash = await bcrypt.hash(input.password, 10);
  const [res] = await pool.execute(
    `INSERT INTO users (org_id, branch_id, role_id, name, email, phone, password_hash, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [org_id, input.branch_id, input.role_id, input.name, input.email, input.phone || null, password_hash]
  );
  const id = res.insertId;
  const [rows] = await pool.execute(
    `SELECT id, name, email, phone, branch_id, role_id, is_active, created_at FROM users WHERE id=?`,
    [id]
  );
  return rows[0];
}

export async function updateUser(org_id, userId, patch) {
  // Fetch current
  const [rows] = await pool.execute(
    `SELECT * FROM users WHERE id=? AND org_id=? LIMIT 1`,
    [userId, org_id]
  );
  const current = rows?.[0];
  if (!current) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  const fields = [];
  const vals = [];

  if (patch.name !== undefined) { fields.push("name=?"); vals.push(patch.name); }
  if (patch.phone !== undefined) { fields.push("phone=?"); vals.push(patch.phone); }
  if (patch.branch_id !== undefined) { fields.push("branch_id=?"); vals.push(patch.branch_id); }
  if (patch.role_id !== undefined) { fields.push("role_id=?"); vals.push(patch.role_id); }
  if (patch.is_active !== undefined) { fields.push("is_active=?"); vals.push(patch.is_active); }
  if (patch.password !== undefined) {
    const password_hash = await bcrypt.hash(patch.password, 10);
    fields.push("password_hash=?"); vals.push(password_hash);
  }
  if (
    patch.role_id !== undefined ||
    patch.is_active !== undefined ||
    patch.password !== undefined
  ) {
    fields.push("token_version = token_version + 1");
  }

  if (fields.length === 0) return { ok: true };

  vals.push(userId, org_id);
  await pool.execute(
    `UPDATE users SET ${fields.join(", ")} WHERE id=? AND org_id=?`,
    vals
  );
  if (
    patch.role_id !== undefined ||
    patch.is_active !== undefined ||
    patch.password !== undefined
  ) {
    await pool.execute(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id=? AND revoked_at IS NULL`,
      [userId]
    );
  }

  const [out] = await pool.execute(
    `SELECT id, name, email, phone, branch_id, role_id, is_active, created_at FROM users WHERE id=?`,
    [userId]
  );
  return out[0];
}

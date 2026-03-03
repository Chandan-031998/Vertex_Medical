import { asyncHandler } from "../../utils/asyncHandler.js";
import { auditLog } from "../../utils/audit.js";
import {
  branchCreateSchema,
  roleCreateSchema,
  rolePermissionsReplaceSchema,
  roleUpdateSchema,
  userCreateSchema,
  userUpdateSchema,
} from "./admin.schema.js";
import * as svc from "./admin.service.js";

export const listBranches = asyncHandler(async (req, res) => {
  const rows = await svc.listBranches(req.user.org_id);
  res.json(rows);
});

export const createBranch = asyncHandler(async (req, res) => {
  const input = branchCreateSchema.parse(req.body);
  const created = await svc.createBranch(req.user.org_id, input);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "CREATE", entity: "branch", entity_id: created.id, after: created, req });
  res.status(201).json(created);
});

export const listRoles = asyncHandler(async (req, res) => {
  const rows = await svc.listRoles(req.user.org_id);
  res.json(rows);
});

export const listPermissions = asyncHandler(async (req, res) => {
  const rows = await svc.listPermissions();
  res.json(rows);
});

export const createRole = asyncHandler(async (req, res) => {
  const input = roleCreateSchema.parse(req.body);
  const created = await svc.createRole(req.user.org_id, input);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "CREATE", entity: "role", entity_id: created.id, after: created, req });
  res.status(201).json(created);
});

export const updateRole = asyncHandler(async (req, res) => {
  const input = roleUpdateSchema.parse(req.body);
  const roleId = Number(req.params.id);
  const before = await svc.getRoleById(req.user.org_id, roleId);
  const updated = await svc.updateRole(req.user.org_id, roleId, input);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "UPDATE", entity: "role", entity_id: roleId, before, after: updated, req });
  res.json(updated);
});

export const deleteRole = asyncHandler(async (req, res) => {
  const roleId = Number(req.params.id);
  const before = await svc.getRoleById(req.user.org_id, roleId);
  const out = await svc.deleteRole(req.user.org_id, roleId);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "DELETE", entity: "role", entity_id: roleId, before, after: out, req });
  res.json(out);
});

export const getRolePermissions = asyncHandler(async (req, res) => {
  const out = await svc.getRolePermissions(req.user.org_id, Number(req.params.id));
  res.json(out);
});

export const replaceRolePermissions = asyncHandler(async (req, res) => {
  const input = rolePermissionsReplaceSchema.parse(req.body);
  const roleId = Number(req.params.id);
  const before = await svc.getRolePermissionKeys(roleId);
  const out = await svc.replaceRolePermissions(req.user.org_id, roleId, input.perm_keys);
  await auditLog({
    org_id: req.user.org_id,
    branch_id: req.user.branch_id,
    user_id: req.user.user_id,
    action: "REPLACE_PERMISSIONS",
    entity: "role",
    entity_id: roleId,
    before: { perm_keys: before },
    after: { perm_keys: out.permissions.map((p) => p.perm_key) },
    req,
  });
  res.json(out);
});

export const listUsers = asyncHandler(async (req, res) => {
  const rows = await svc.listUsers(req.user.org_id);
  res.json(rows);
});

export const createUser = asyncHandler(async (req, res) => {
  const input = userCreateSchema.parse(req.body);
  const created = await svc.createUser(req.user.org_id, input);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "CREATE", entity: "user", entity_id: created.id, after: created, req });
  res.status(201).json(created);
});

export const updateUser = asyncHandler(async (req, res) => {
  const input = userUpdateSchema.parse(req.body);
  const userId = Number(req.params.id);
  const before = await svc.getUserById(req.user.org_id, userId);
  const updated = await svc.updateUser(req.user.org_id, userId, input);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "UPDATE", entity: "user", entity_id: userId, before, after: updated, req });
  res.json(updated);
});

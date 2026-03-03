import { asyncHandler } from "../../utils/asyncHandler.js";
import { auditLog } from "../../utils/audit.js";
import { stockListSchema, nearExpirySchema, transferSchema, adjustSchema, adjustmentsListSchema } from "./inventory.schema.js";
import * as svc from "./inventory.service.js";

export const stock = asyncHandler(async (req, res) => {
  const input = stockListSchema.parse(req.query);
  const rows = await svc.listStock(req.user.org_id, req.user.branch_id, input);
  res.json(rows);
});

export const lowStock = asyncHandler(async (req, res) => {
  const rows = await svc.lowStock(req.user.org_id, req.user.branch_id);
  res.json(rows);
});

export const nearExpiry = asyncHandler(async (req, res) => {
  const input = nearExpirySchema.parse(req.query);
  const rows = await svc.nearExpiry(req.user.org_id, req.user.branch_id, input.days);
  res.json(rows);
});

export const adjust = asyncHandler(async (req, res) => {
  const input = adjustSchema.parse(req.body);
  const out = await svc.adjustStock({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id }, input);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "ADJUST", entity: "stock", entity_id: input.batch_id, after: out, req });
  res.json(out);
});

export const transfer = asyncHandler(async (req, res) => {
  const input = transferSchema.parse(req.body);
  const out = await svc.transferStock({ org_id: req.user.org_id, from_branch_id: req.user.branch_id, user_id: req.user.user_id }, input);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "TRANSFER", entity: "stock_transfer", entity_id: null, after: input, req });
  res.json(out);
});

export const adjustments = asyncHandler(async (req, res) => {
  const input = adjustmentsListSchema.parse(req.query);
  const rows = await svc.listAdjustments(req.user.org_id, req.user.branch_id, input);
  res.json(rows);
});

export const deleteAdjustment = asyncHandler(async (req, res) => {
  const movementId = Number(req.params.id);
  const out = await svc.deleteAdjustment(req.user.org_id, req.user.branch_id, movementId);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "DELETE", entity: "stock_adjustment", entity_id: movementId, after: out, req });
  res.json(out);
});

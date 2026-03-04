import { asyncHandler } from "../../utils/asyncHandler.js";
import { auditLog } from "../../utils/audit.js";
import {
  stockListSchema,
  nearExpirySchema,
  transferSchema,
  transferListSchema,
  transferBatchListSchema,
  markDeadStockSchema,
  blockBatchSchema,
  adjustSchema,
  adjustmentsListSchema,
} from "./inventory.schema.js";
import * as svc from "./inventory.service.js";

export const stock = asyncHandler(async (req, res) => {
  const input = stockListSchema.parse(req.query);
  const rows = await svc.listStock(req.user.org_id, req.user.branch_id, input);
  res.json(rows);
});

export const branches = asyncHandler(async (req, res) => {
  const rows = await svc.listBranches(req.user.org_id);
  res.json(rows);
});

export const transferBatches = asyncHandler(async (req, res) => {
  const input = transferBatchListSchema.parse(req.query);
  const from_branch_id = input.from_branch_id || req.user.branch_id;
  const rows = await svc.listTransferBatches(req.user.org_id, from_branch_id);
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
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "TRANSFER", entity: "stock_transfer", entity_id: out?.transfer_id || null, after: input, req });
  res.json(out);
});

export const transfers = asyncHandler(async (req, res) => {
  const input = transferListSchema.parse(req.query);
  const rows = await svc.listTransfers(req.user.org_id, req.user.branch_id, input);
  res.json(rows);
});

export const transferOne = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const out = await svc.getTransfer(req.user.org_id, req.user.branch_id, id);
  if (!out) return res.status(404).json({ message: "Transfer not found" });
  res.json(out);
});

export const markDeadStock = asyncHandler(async (req, res) => {
  const input = markDeadStockSchema.parse(req.body);
  const out = await svc.markDeadStock({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id }, input);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "DEAD_STOCK", entity: "batch", entity_id: input.batch_id, after: out, req });
  res.json(out);
});

export const blockBatch = asyncHandler(async (req, res) => {
  const input = blockBatchSchema.parse(req.body);
  const out = await svc.blockBatch(req.user.org_id, input.batch_id, input.blocked);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "BLOCK_BATCH", entity: "batch", entity_id: input.batch_id, after: out, req });
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

import { asyncHandler } from "../../utils/asyncHandler.js";
import { auditLog } from "../../utils/audit.js";
import { purchaseCreateSchema, purchaseListSchema, purchaseReturnCreateSchema } from "./purchases.schema.js";
import * as svc from "./purchases.service.js";

export const create = asyncHandler(async (req, res) => {
  const input = purchaseCreateSchema.parse(req.body);
  const out = await svc.createPurchase({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id }, input);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "CREATE", entity: "purchase_invoice", entity_id: out.id, after: out, req });
  res.status(201).json(out);
});

export const list = asyncHandler(async (req, res) => {
  const input = purchaseListSchema.parse(req.query);
  const rows = await svc.listPurchases(req.user.org_id, req.user.branch_id, input);
  res.json(rows);
});

export const getOne = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const out = await svc.getPurchase(req.user.org_id, req.user.branch_id, id);
  if (!out) return res.status(404).json({ message: "Purchase not found" });
  res.json(out);
});

export const createReturn = asyncHandler(async (req, res) => {
  const purchaseId = Number(req.params.id);
  const input = purchaseReturnCreateSchema.parse(req.body);
  const out = await svc.createPurchaseReturn(
    { org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id },
    purchaseId,
    input
  );
  await auditLog({
    org_id: req.user.org_id,
    branch_id: req.user.branch_id,
    user_id: req.user.user_id,
    action: "CREATE",
    entity: "purchase_return",
    entity_id: out.id,
    after: out,
    req,
  });
  res.status(201).json(out);
});

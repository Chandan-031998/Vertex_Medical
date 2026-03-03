import { asyncHandler } from "../../utils/asyncHandler.js";
import { auditLog } from "../../utils/audit.js";
import { purchaseCreateSchema, purchaseListSchema } from "./purchases.schema.js";
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

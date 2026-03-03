import { asyncHandler } from "../../utils/asyncHandler.js";
import { auditLog } from "../../utils/audit.js";
import { invoiceCreateSchema, invoiceListSchema } from "./billing.schema.js";
import * as svc from "./billing.service.js";

export const create = asyncHandler(async (req, res) => {
  const input = invoiceCreateSchema.parse(req.body);
  const out = await svc.createInvoice({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id }, input);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "CREATE", entity: "invoice", entity_id: out.id, after: out, req });
  res.status(201).json(out);
});

export const list = asyncHandler(async (req, res) => {
  const input = invoiceListSchema.parse(req.query);
  const rows = await svc.listInvoices(req.user.org_id, req.user.branch_id, input);
  res.json(rows);
});

export const getOne = asyncHandler(async (req, res) => {
  const out = await svc.getInvoice(req.user.org_id, Number(req.params.id));
  if (!out) return res.status(404).json({ message: "Invoice not found" });
  res.json(out);
});

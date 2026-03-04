import { asyncHandler } from "../../utils/asyncHandler.js";
import { auditLog } from "../../utils/audit.js";
import {
  supplierCreateSchema,
  supplierUpdateSchema,
  supplierListSchema,
  supplierPaymentCreateSchema,
  supplierPaymentsListSchema,
} from "./suppliers.schema.js";
import * as svc from "./suppliers.service.js";

export const list = asyncHandler(async (req, res) => {
  const input = supplierListSchema.parse(req.query);
  const rows = await svc.list(req.user.org_id, input);
  res.json(rows);
});

export const create = asyncHandler(async (req, res) => {
  const input = supplierCreateSchema.parse(req.body);
  const created = await svc.create(req.user.org_id, input);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "CREATE", entity: "supplier", entity_id: created.id, after: created, req });
  res.status(201).json(created);
});

export const update = asyncHandler(async (req, res) => {
  const patch = supplierUpdateSchema.parse(req.body);
  const before = await svc.getById(req.user.org_id, Number(req.params.id));
  const updated = await svc.update(req.user.org_id, Number(req.params.id), patch);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "UPDATE", entity: "supplier", entity_id: Number(req.params.id), before, after: updated, req });
  res.json(updated);
});

export const remove = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const before = await svc.getById(req.user.org_id, id);
  const out = await svc.remove(req.user.org_id, id);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "DELETE", entity: "supplier", entity_id: id, before, after: out, req });
  res.json(out);
});

export const listPayments = asyncHandler(async (req, res) => {
  const supplierId = Number(req.params.id);
  const input = supplierPaymentsListSchema.parse(req.query);
  const rows = await svc.listPayments(req.user.org_id, supplierId, input);
  res.json(rows);
});

export const addPayment = asyncHandler(async (req, res) => {
  const supplierId = Number(req.params.id);
  const input = supplierPaymentCreateSchema.parse(req.body);
  const out = await svc.addPayment(
    { org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id },
    supplierId,
    input
  );
  await auditLog({
    org_id: req.user.org_id,
    branch_id: req.user.branch_id,
    user_id: req.user.user_id,
    action: "CREATE",
    entity: "supplier_payment",
    entity_id: out.id,
    after: out,
    req,
  });
  res.status(201).json(out);
});

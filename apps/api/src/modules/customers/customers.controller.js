import { asyncHandler } from "../../utils/asyncHandler.js";
import { auditLog } from "../../utils/audit.js";
import { customerCreateSchema, customerPaymentCreateSchema, customerUpdateSchema, customerListSchema, customerLedgerListSchema } from "./customers.schema.js";
import * as svc from "./customers.service.js";

export const list = asyncHandler(async (req, res) => {
  const input = customerListSchema.parse(req.query);
  const rows = await svc.list(req.user.org_id, input);
  res.json(rows);
});

export const create = asyncHandler(async (req, res) => {
  const input = customerCreateSchema.parse(req.body);
  const created = await svc.create(req.user.org_id, input);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "CREATE", entity: "customer", entity_id: created.id, after: created, req });
  res.status(201).json(created);
});

export const update = asyncHandler(async (req, res) => {
  const patch = customerUpdateSchema.parse(req.body);
  const before = await svc.getById(req.user.org_id, Number(req.params.id));
  const updated = await svc.update(req.user.org_id, Number(req.params.id), patch);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "UPDATE", entity: "customer", entity_id: Number(req.params.id), before, after: updated, req });
  res.json(updated);
});

export const remove = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const before = await svc.getById(req.user.org_id, id);
  const out = await svc.remove(req.user.org_id, id);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "DELETE", entity: "customer", entity_id: id, before, after: out, req });
  res.json(out);
});

export const ledger = asyncHandler(async (req, res) => {
  const customer_id = Number(req.params.id);
  const input = customerLedgerListSchema.parse(req.query);
  const customer = await svc.getById(req.user.org_id, customer_id);
  if (!customer) return res.status(404).json({ message: "Customer not found" });
  const rows = await svc.listLedger(req.user.org_id, customer_id, input);
  res.json({ customer, rows });
});

export const addPayment = asyncHandler(async (req, res) => {
  const customer_id = Number(req.params.id);
  const input = customerPaymentCreateSchema.parse(req.body);
  const out = await svc.addPayment(
    { org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id },
    customer_id,
    input
  );
  await auditLog({
    org_id: req.user.org_id,
    branch_id: req.user.branch_id,
    user_id: req.user.user_id,
    action: "CREATE",
    entity: "customer_payment",
    entity_id: out.payment_id,
    after: { customer_id, ...input, balance: out.balance },
    req,
  });
  res.status(201).json(out);
});

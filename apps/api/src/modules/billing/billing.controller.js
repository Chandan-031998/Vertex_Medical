import { asyncHandler } from "../../utils/asyncHandler.js";
import { auditLog } from "../../utils/audit.js";
import { invoiceCreateSchema, invoiceListSchema, returnCreateSchema } from "./billing.schema.js";
import { renderInvoicePdf } from "./invoice-pdf.js";
import * as svc from "./billing.service.js";

export const create = asyncHandler(async (req, res) => {
  const input = invoiceCreateSchema.parse(req.body);
  const out = await svc.createInvoice({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id }, input);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "CREATE", entity: "invoice", entity_id: out.id, after: out, req });
  res.status(201).json(out);
});

export const list = asyncHandler(async (req, res) => {
  const input = invoiceListSchema.parse(req.query);
  const out = await svc.listInvoices(req.user.org_id, req.user.branch_id, input);
  res.json(out);
});

export const getOne = asyncHandler(async (req, res) => {
  const out = await svc.getInvoice(req.user.org_id, Number(req.params.id));
  if (!out) return res.status(404).json({ message: "Invoice not found" });
  res.json(out);
});

export const pdf = asyncHandler(async (req, res) => {
  const out = await svc.getInvoice(req.user.org_id, Number(req.params.id));
  if (!out) return res.status(404).json({ message: "Invoice not found" });

  const pdfBuffer = await renderInvoicePdf(out);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "EXPORT", entity: "invoice_pdf", entity_id: out.invoice.id, after: { invoice_no: out.invoice.invoice_no }, req });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${out.invoice.invoice_no || "invoice"}.pdf"`);
  res.send(pdfBuffer);
});

export const share = asyncHandler(async (req, res) => {
  const out = await svc.getInvoice(req.user.org_id, Number(req.params.id));
  if (!out) return res.status(404).json({ message: "Invoice not found" });

  const payload = svc.buildSharePayload(out);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "SHARE", entity: "invoice", entity_id: out.invoice.id, after: payload, req });

  res.json(payload);
});

export const createReturn = asyncHandler(async (req, res) => {
  const input = returnCreateSchema.parse(req.body);
  const hasRefunds = (input.refunds || []).length > 0;
  if (hasRefunds && !(req.user?.perms || []).includes("BILLING_REFUND")) {
    return res.status(403).json({ message: "Missing permission: BILLING_REFUND" });
  }

  const out = await svc.createReturn(
    { org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id },
    input
  );
  await auditLog({
    org_id: req.user.org_id,
    branch_id: req.user.branch_id,
    user_id: req.user.user_id,
    action: "CREATE",
    entity: "return",
    entity_id: out?.return?.id,
    after: out,
    req,
  });
  res.status(201).json(out);
});

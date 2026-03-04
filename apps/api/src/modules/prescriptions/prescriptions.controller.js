import fs from "fs";
import path from "path";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { auditLog } from "../../utils/audit.js";
import { prescriptionCreateSchema, prescriptionLinkSchema } from "./prescriptions.schema.js";
import * as svc from "./prescriptions.service.js";
import { env } from "../../config/env.js";

export const list = asyncHandler(async (req, res) => {
  const rows = await svc.list(req.user.org_id, req.user.branch_id);
  res.json(rows);
});

export const getOne = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const out = await svc.getById(req.user.org_id, req.user.branch_id, id);
  if (!out) return res.status(404).json({ message: "Prescription not found" });
  res.json(out);
});

function toFileMeta(req) {
  if (!req.file) return null;
  const full = req.file.path;
  const dir = path.resolve(env.UPLOAD_DIR, "prescriptions");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  return {
    file_path: full.replace(path.resolve(env.UPLOAD_DIR), "").replace(/\\/g, "/"),
    original_name: req.file.originalname,
    mime_type: req.file.mimetype,
    size_bytes: req.file.size,
  };
}

export const create = asyncHandler(async (req, res) => {
  const input = prescriptionCreateSchema.parse(req.body);
  const fileMeta = toFileMeta(req);

  const out = await svc.create({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id }, input, fileMeta);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "CREATE", entity: "prescription", entity_id: out.id, after: out, req });
  res.status(201).json(out);
});

export const upload = asyncHandler(async (req, res) => {
  const input = prescriptionCreateSchema.parse(req.body);
  const fileMeta = toFileMeta(req);

  const out = await svc.create({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id }, input, fileMeta);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "UPLOAD", entity: "prescription", entity_id: out.id, after: out, req });
  res.status(201).json(out);
});

export const link = asyncHandler(async (req, res) => {
  const input = prescriptionLinkSchema.parse(req.body);
  const out = await svc.linkToInvoice(req.user.org_id, input);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "LINK", entity: "invoice_prescription", entity_id: input.invoice_id, after: out, req });
  res.status(201).json(out);
});

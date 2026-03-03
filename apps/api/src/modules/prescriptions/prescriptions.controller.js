import fs from "fs";
import path from "path";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { auditLog } from "../../utils/audit.js";
import { prescriptionCreateSchema } from "./prescriptions.schema.js";
import * as svc from "./prescriptions.service.js";
import { env } from "../../config/env.js";

export const list = asyncHandler(async (req, res) => {
  const rows = await svc.list(req.user.org_id, req.user.branch_id);
  res.json(rows);
});

export const create = asyncHandler(async (req, res) => {
  const input = prescriptionCreateSchema.parse(req.body);

  let fileMeta = null;
  if (req.file) {
    const full = req.file.path;
    // Ensure nested folder exists
    const dir = path.resolve(env.UPLOAD_DIR, "prescriptions");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fileMeta = {
      file_path: full.replace(path.resolve(env.UPLOAD_DIR), "").replace(/\\/g, "/"),
      original_name: req.file.originalname,
      mime_type: req.file.mimetype,
      size_bytes: req.file.size,
    };
  }

  const out = await svc.create({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id }, input, fileMeta);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "CREATE", entity: "prescription", entity_id: out.id, after: out, req });
  res.status(201).json(out);
});

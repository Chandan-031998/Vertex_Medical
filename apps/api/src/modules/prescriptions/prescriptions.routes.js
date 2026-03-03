import { Router } from "express";
import multer from "multer";
import path from "path";
import { env } from "../../config/env.js";
import { authRequired } from "../../middleware/auth.middleware.js";
import { requirePerms } from "../../middleware/rbac.middleware.js";
import { requireModule } from "../../middleware/module.middleware.js";
import * as ctrl from "./prescriptions.controller.js";

const r = Router();
r.use(authRequired);
r.use(requireModule("BILLING_POS"));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.resolve(env.UPLOAD_DIR, "prescriptions")),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  }
});

const upload = multer({ storage });

r.get("/", requirePerms(["BILLING_READ"]), ctrl.list);
r.post("/", requirePerms(["BILLING_CREATE"]), upload.single("file"), ctrl.create);

export default r;

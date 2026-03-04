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
  },
});

const upload = multer({ storage });

r.get("/", requirePerms(["PRESCRIPTION_READ"]), ctrl.list);
r.get("/:id", requirePerms(["PRESCRIPTION_READ"]), ctrl.getOne);
r.post("/", requirePerms(["PRESCRIPTION_WRITE"]), upload.single("file"), ctrl.create);
r.post("/upload", requirePerms(["PRESCRIPTION_WRITE"]), upload.single("file"), ctrl.upload);
r.post("/link", requirePerms(["PRESCRIPTION_WRITE"]), ctrl.link);

export default r;

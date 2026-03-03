import { Router } from "express";
import { authRequired } from "../../middleware/auth.middleware.js";
import { requirePerms } from "../../middleware/rbac.middleware.js";
import { requireModule } from "../../middleware/module.middleware.js";
import * as ctrl from "./purchases.controller.js";

const r = Router();
r.use(authRequired);
r.use(requireModule("PURCHASES"));

r.get("/invoices", requirePerms(["PURCHASE_READ"]), ctrl.list);
r.post("/invoices", requirePerms(["PURCHASE_CREATE"]), ctrl.create);

export default r;

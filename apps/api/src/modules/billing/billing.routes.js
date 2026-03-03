import { Router } from "express";
import { authRequired } from "../../middleware/auth.middleware.js";
import { requirePerms } from "../../middleware/rbac.middleware.js";
import { requireModule } from "../../middleware/module.middleware.js";
import * as ctrl from "./billing.controller.js";

const r = Router();
r.use(authRequired);
r.use(requireModule("BILLING_POS"));

r.get("/invoices", requirePerms(["BILLING_READ"]), ctrl.list);
r.get("/invoices/:id", requirePerms(["BILLING_READ"]), ctrl.getOne);
r.post("/invoices", requirePerms(["BILLING_CREATE"]), ctrl.create);

export default r;

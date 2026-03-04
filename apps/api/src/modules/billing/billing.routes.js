import { Router } from "express";
import { authRequired } from "../../middleware/auth.middleware.js";
import { requireAnyPerms, requirePerms } from "../../middleware/rbac.middleware.js";
import { requireModule } from "../../middleware/module.middleware.js";
import * as ctrl from "./billing.controller.js";

const r = Router();
r.use(authRequired);
r.use(requireModule("BILLING_POS"));

r.get("/invoices", requirePerms(["BILLING_READ"]), ctrl.list);
r.get("/invoices/:id", requirePerms(["BILLING_READ"]), ctrl.getOne);
r.get("/invoices/:id/pdf", requireAnyPerms(["BILLING_EXPORT", "BILLING_PRINT"]), ctrl.pdf);
r.post("/invoices/:id/share", requireAnyPerms(["BILLING_EXPORT", "BILLING_PRINT"]), ctrl.share);
r.post("/returns", requirePerms(["BILLING_RETURN"]), ctrl.createReturn);
r.post("/invoices", requirePerms(["BILLING_CREATE"]), ctrl.create);

export default r;

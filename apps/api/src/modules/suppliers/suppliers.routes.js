import { Router } from "express";
import { authRequired } from "../../middleware/auth.middleware.js";
import { requirePerms, requireRoles } from "../../middleware/rbac.middleware.js";
import { requireModule } from "../../middleware/module.middleware.js";
import * as ctrl from "./suppliers.controller.js";

const r = Router();
r.use(authRequired);
r.use(requireModule("PURCHASES"));

r.get("/", requirePerms(["SUPPLIER_READ"]), ctrl.list);
r.get("/:id/payments", requirePerms(["SUPPLIER_READ"]), ctrl.listPayments);
r.post("/", requirePerms(["SUPPLIER_WRITE"]), ctrl.create);
r.put("/:id", requirePerms(["SUPPLIER_WRITE"]), ctrl.update);
r.patch("/:id", requirePerms(["SUPPLIER_WRITE"]), ctrl.update);
r.delete("/:id", requireRoles(["ADMIN"]), ctrl.remove);
r.post("/:id/payments", requirePerms(["SUPPLIER_PAYMENT_WRITE"]), ctrl.addPayment);

export default r;

import { Router } from "express";
import { authRequired } from "../../middleware/auth.middleware.js";
import { requirePerms, requireRoles } from "../../middleware/rbac.middleware.js";
import { requireModule } from "../../middleware/module.middleware.js";
import * as ctrl from "./medicines.controller.js";

const r = Router();
r.use(authRequired);
r.use(requireModule("INVENTORY"));

r.get("/", requirePerms(["MEDICINE_READ"]), ctrl.list);
r.get("/search", requirePerms(["MEDICINE_READ"]), ctrl.search);
r.post("/", requirePerms(["MEDICINE_WRITE"]), ctrl.create);
r.put("/:id", requirePerms(["MEDICINE_WRITE"]), ctrl.update);
r.patch("/:id", requirePerms(["MEDICINE_WRITE"]), ctrl.update);
r.delete("/:id", requireRoles(["ADMIN"]), ctrl.remove);

export default r;

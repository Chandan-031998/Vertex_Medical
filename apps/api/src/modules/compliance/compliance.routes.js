import { Router } from "express";
import { authRequired } from "../../middleware/auth.middleware.js";
import { requireAnyPerms } from "../../middleware/rbac.middleware.js";
import { requireModule } from "../../middleware/module.middleware.js";
import * as ctrl from "./compliance.controller.js";

const r = Router();
r.use(authRequired);
r.use(requireModule("COMPLIANCE"));

r.get("/schedule-h1", requireAnyPerms(["COMPLIANCE_VIEW", "SCHEDULE_H1_VIEW"]), ctrl.scheduleH1);

export default r;

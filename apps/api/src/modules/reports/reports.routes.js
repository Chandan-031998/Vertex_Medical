import { Router } from "express";
import { authRequired } from "../../middleware/auth.middleware.js";
import { requirePerms } from "../../middleware/rbac.middleware.js";
import { requireModule } from "../../middleware/module.middleware.js";
import * as ctrl from "./reports.controller.js";

const r = Router();
r.use(authRequired);
r.use(requireModule("REPORTS"));

r.get("/dashboard", requirePerms(["DASHBOARD_VIEW"]), ctrl.dashboard);
r.get("/sales-summary", requirePerms(["REPORTS_VIEW"]), ctrl.salesSummary);
r.get("/top-selling", requirePerms(["REPORTS_VIEW"]), ctrl.topSelling);
r.get("/stock-valuation", requirePerms(["REPORTS_VIEW"]), ctrl.stockValuation);

export default r;

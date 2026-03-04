import { Router } from "express";
import { authRequired } from "../../middleware/auth.middleware.js";
import { requireAnyPerms, requirePerms } from "../../middleware/rbac.middleware.js";
import { requireModule } from "../../middleware/module.middleware.js";
import * as ctrl from "./reports.controller.js";

const r = Router();
r.use(authRequired);
r.use(requireModule("REPORTS"));

r.get("/dashboard", requirePerms(["DASHBOARD_VIEW"]), ctrl.dashboard);
r.get("/sales-summary", requirePerms(["REPORTS_VIEW"]), ctrl.salesSummary);
r.get("/top-selling", requirePerms(["REPORTS_VIEW"]), ctrl.topSelling);
r.get("/sales-details", requirePerms(["REPORTS_VIEW"]), ctrl.salesDetails);
r.get("/customer-dues", requirePerms(["REPORTS_VIEW"]), ctrl.customerDues);
r.get("/supplier-dues", requirePerms(["REPORTS_VIEW"]), ctrl.supplierDues);
r.get("/gst-sales", requireAnyPerms(["GST_EXPORT", "REPORTS_EXPORT"]), ctrl.gstSales);
r.get("/gst-purchase", requireAnyPerms(["GST_EXPORT", "REPORTS_EXPORT"]), ctrl.gstPurchase);
r.get("/gst-summary", requireAnyPerms(["GST_EXPORT", "REPORTS_EXPORT"]), ctrl.gstSummary);
r.get("/gstr1.csv", requireAnyPerms(["GST_EXPORT", "REPORTS_EXPORT"]), ctrl.gstr1Csv);
r.get("/gstr3b-summary", requireAnyPerms(["GST_EXPORT", "REPORTS_EXPORT"]), ctrl.gstr3bSummary);
r.get("/dead-stock", requireAnyPerms(["REPORTS_VIEW", "DEAD_STOCK_VIEW"]), ctrl.deadStock);
r.get("/stock-valuation", requirePerms(["REPORTS_VIEW"]), ctrl.stockValuation);

export default r;

import { Router } from "express";
import { authRequired } from "../../middleware/auth.middleware.js";
import { requireAnyPerms } from "../../middleware/rbac.middleware.js";
import * as ctrl from "./settings.controller.js";

const r = Router();
r.use(authRequired);

r.get("/org", requireAnyPerms(["SETTINGS_READ", "USER_ADMIN"]), ctrl.getOrgSettings);
r.put("/org", requireAnyPerms(["SETTINGS_WRITE", "USER_ADMIN"]), ctrl.putOrgSettings);

r.get("/branding", requireAnyPerms(["SETTINGS_READ", "USER_ADMIN"]), ctrl.getBranding);
r.put("/branding", requireAnyPerms(["SETTINGS_WRITE", "USER_ADMIN"]), ctrl.putBranding);

r.get("/modules", requireAnyPerms(["SETTINGS_READ", "USER_ADMIN"]), ctrl.getModules);
r.put("/modules", requireAnyPerms(["SETTINGS_WRITE", "USER_ADMIN"]), ctrl.putModules);

r.get("/number-series", requireAnyPerms(["SETTINGS_READ", "USER_ADMIN"]), ctrl.getNumberSeries);
r.put("/number-series", requireAnyPerms(["SETTINGS_WRITE", "USER_ADMIN"]), ctrl.putNumberSeries);

export default r;

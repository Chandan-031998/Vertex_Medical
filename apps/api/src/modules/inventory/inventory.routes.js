import { Router } from "express";
import { authRequired } from "../../middleware/auth.middleware.js";
import { requireAnyPerms, requireRoles } from "../../middleware/rbac.middleware.js";
import { requireModule } from "../../middleware/module.middleware.js";
import * as ctrl from "./inventory.controller.js";

const r = Router();
r.use(authRequired);
r.use(requireModule("INVENTORY"));

r.get("/stock", requireAnyPerms(["INVENTORY_READ"]), ctrl.stock);
r.get("/low-stock", requireAnyPerms(["INVENTORY_READ", "DEAD_STOCK_VIEW"]), ctrl.lowStock);
r.get("/near-expiry", requireAnyPerms(["INVENTORY_READ", "NEAR_EXPIRY_VIEW"]), ctrl.nearExpiry);
r.get("/adjustments", requireAnyPerms(["INVENTORY_READ", "STOCK_ADJUST_CREATE"]), ctrl.adjustments);

r.post("/adjust", requireAnyPerms(["INVENTORY_WRITE", "STOCK_ADJUST_CREATE"]), ctrl.adjust);
r.post("/transfer", requireAnyPerms(["INVENTORY_WRITE", "STOCK_TRANSFER_CREATE"]), ctrl.transfer);
r.delete("/adjustments/:id", requireRoles(["ADMIN"]), ctrl.deleteAdjustment);

export default r;

import { Router } from "express";
import { authRequired } from "../../middleware/auth.middleware.js";
import { requireAnyPerms, requireRoles } from "../../middleware/rbac.middleware.js";
import { requireModule } from "../../middleware/module.middleware.js";
import * as ctrl from "./inventory.controller.js";

const r = Router();
r.use(authRequired);
r.use(requireModule("INVENTORY"));

r.get("/branches", requireAnyPerms(["STOCK_TRANSFER_CREATE", "INVENTORY_READ"]), ctrl.branches);
r.get("/transfer-batches", requireAnyPerms(["STOCK_TRANSFER_CREATE", "INVENTORY_READ"]), ctrl.transferBatches);
r.get("/stock", requireAnyPerms(["INVENTORY_READ"]), ctrl.stock);
r.get("/low-stock", requireAnyPerms(["INVENTORY_READ", "DEAD_STOCK_VIEW"]), ctrl.lowStock);
r.get("/near-expiry", requireAnyPerms(["INVENTORY_READ", "NEAR_EXPIRY_VIEW"]), ctrl.nearExpiry);
r.get("/transfers", requireAnyPerms(["INVENTORY_READ", "STOCK_TRANSFER_CREATE"]), ctrl.transfers);
r.get("/transfer", requireAnyPerms(["INVENTORY_READ", "STOCK_TRANSFER_CREATE"]), ctrl.transfers);
r.get("/transfers/:id", requireAnyPerms(["INVENTORY_READ", "STOCK_TRANSFER_CREATE"]), ctrl.transferOne);
r.get("/transfer/:id", requireAnyPerms(["INVENTORY_READ", "STOCK_TRANSFER_CREATE"]), ctrl.transferOne);
r.get("/adjustments", requireAnyPerms(["INVENTORY_READ", "STOCK_ADJUST_CREATE"]), ctrl.adjustments);

r.post("/adjust", requireAnyPerms(["INVENTORY_WRITE", "STOCK_ADJUST_CREATE"]), ctrl.adjust);
r.post("/transfer", requireAnyPerms(["INVENTORY_WRITE", "STOCK_TRANSFER_CREATE"]), ctrl.transfer);
r.post("/mark-dead-stock", requireAnyPerms(["INVENTORY_WRITE", "STOCK_ADJUST_CREATE", "DEAD_STOCK_VIEW"]), ctrl.markDeadStock);
r.post("/block-batch", requireAnyPerms(["INVENTORY_WRITE", "NEAR_EXPIRY_VIEW"]), ctrl.blockBatch);
r.delete("/adjustments/:id", requireRoles(["ADMIN"]), ctrl.deleteAdjustment);

export default r;

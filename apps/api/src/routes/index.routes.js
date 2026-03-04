import { Router } from "express";

import authRoutes from "../modules/auth/auth.routes.js";
import adminRoutes from "../modules/admin/admin.routes.js";
import medicinesRoutes from "../modules/medicines/medicines.routes.js";
import batchesRoutes from "../modules/batches/batches.routes.js";
import inventoryRoutes from "../modules/inventory/inventory.routes.js";
import billingRoutes from "../modules/billing/billing.routes.js";
import purchasesRoutes from "../modules/purchases/purchases.routes.js";
import customersRoutes from "../modules/customers/customers.routes.js";
import suppliersRoutes from "../modules/suppliers/suppliers.routes.js";
import reportsRoutes from "../modules/reports/reports.routes.js";
import prescriptionsRoutes from "../modules/prescriptions/prescriptions.routes.js";
import complianceRoutes from "../modules/compliance/compliance.routes.js";
import settingsRoutes from "../modules/settings/settings.routes.js";
import branchesRoutes from "../modules/branches/branches.routes.js";

const router = Router();

router.get("/health", (req, res) => res.json({ ok: true }));

router.use("/api/auth", authRoutes);
router.use("/api/admin", adminRoutes);
router.use("/api/medicines", medicinesRoutes);
router.use("/api/batches", batchesRoutes);
router.use("/api/inventory", inventoryRoutes);
router.use("/api/billing", billingRoutes);
router.use("/api/purchases", purchasesRoutes);
router.use("/api/customers", customersRoutes);
router.use("/api/suppliers", suppliersRoutes);
router.use("/api/reports", reportsRoutes);
router.use("/api/prescriptions", prescriptionsRoutes);
router.use("/api/compliance", complianceRoutes);
router.use("/api/settings", settingsRoutes);
router.use("/api/branches", branchesRoutes);

export default router;

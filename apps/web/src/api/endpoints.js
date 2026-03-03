export const endpoints = {
  authMe: "/api/auth/me",
  dashboard: "/api/reports/dashboard",

  medicines: "/api/medicines",
  medicineSearch: "/api/medicines/search",

  batches: "/api/batches",

  stock: "/api/inventory/stock",
  lowStock: "/api/inventory/low-stock",
  nearExpiry: "/api/inventory/near-expiry",
  adjustStock: "/api/inventory/adjust",
  inventoryAdjustments: "/api/inventory/adjustments",
  inventoryAdjustmentById: (id) => `/api/inventory/adjustments/${id}`,
  transferStock: "/api/inventory/transfer",

  invoices: "/api/billing/invoices",

  purchaseInvoices: "/api/purchases/invoices",

  customers: "/api/customers",
  suppliers: "/api/suppliers",

  scheduleH1: "/api/compliance/schedule-h1",

  adminBranches: "/api/admin/branches",
  adminUsers: "/api/admin/users",
  adminPermissions: "/api/admin/permissions",
  adminRoles: "/api/admin/roles",
  adminRolePermissions: (id) => `/api/admin/roles/${id}/permissions`,

  settingsOrg: "/api/settings/org",
  settingsBranding: "/api/settings/branding",
  settingsModules: "/api/settings/modules",
  settingsNumberSeries: "/api/settings/number-series",

  prescriptions: "/api/prescriptions",
};

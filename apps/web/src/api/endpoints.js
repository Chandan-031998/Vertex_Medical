export const endpoints = {
  authMe: "/api/auth/me",
  dashboard: "/api/reports/dashboard",

  medicines: "/api/medicines",
  medicineSearch: "/api/medicines/search",

  batches: "/api/batches",

  stock: "/api/inventory/stock",
  inventoryBranches: "/api/inventory/branches",
  branches: "/api/branches",
  lowStock: "/api/inventory/low-stock",
  nearExpiry: "/api/inventory/near-expiry",
  adjustStock: "/api/inventory/adjust",
  inventoryAdjustments: "/api/inventory/adjustments",
  inventoryAdjustmentById: (id) => `/api/inventory/adjustments/${id}`,
  transferStock: "/api/inventory/transfer",
  inventoryTransfers: "/api/inventory/transfers",
  inventoryTransferById: (id) => `/api/inventory/transfers/${id}`,
  inventoryTransferBatches: "/api/inventory/transfer-batches",
  markDeadStock: "/api/inventory/mark-dead-stock",
  blockBatch: "/api/inventory/block-batch",

  invoices: "/api/billing/invoices",
  invoiceById: (id) => `/api/billing/invoices/${id}`,
  invoicePdf: (id) => `/api/billing/invoices/${id}/pdf`,
  invoiceShare: (id) => `/api/billing/invoices/${id}/share`,
  billingReturns: "/api/billing/returns",

  purchaseInvoices: "/api/purchases/invoices",
  purchaseInvoiceById: (id) => `/api/purchases/invoices/${id}`,
  purchaseReturn: (id) => `/api/purchases/${id}/returns`,

  customers: "/api/customers",
  customerLedger: (id) => `/api/customers/${id}/ledger`,
  customerPayments: (id) => `/api/customers/${id}/payments`,
  suppliers: "/api/suppliers",
  supplierPayments: (id) => `/api/suppliers/${id}/payments`,

  scheduleH1: "/api/compliance/schedule-h1",

  reportsCustomerDues: "/api/reports/customer-dues",
  reportsGstSales: "/api/reports/gst-sales",
  reportsGstPurchase: "/api/reports/gst-purchase",
  reportsGstSummary: "/api/reports/gst-summary",
  reportsGstr1Csv: "/api/reports/gstr1.csv",
  reportsGstr3bSummary: "/api/reports/gstr3b-summary",
  reportsSupplierDues: "/api/reports/supplier-dues",
  reportsDeadStock: "/api/reports/dead-stock",

  adminBranches: "/api/admin/branches",
  adminBranchById: (id) => `/api/admin/branches/${id}`,
  adminUsers: "/api/admin/users",
  adminPermissions: "/api/admin/permissions",
  adminRoles: "/api/admin/roles",
  adminRolePermissions: (id) => `/api/admin/roles/${id}/permissions`,

  settingsOrg: "/api/settings/org",
  settingsBranding: "/api/settings/branding",
  settingsModules: "/api/settings/modules",
  settingsNumberSeries: "/api/settings/number-series",

  prescriptions: "/api/prescriptions",
  prescriptionById: (id) => `/api/prescriptions/${id}`,
  prescriptionUpload: "/api/prescriptions/upload",
  prescriptionLink: "/api/prescriptions/link",
};

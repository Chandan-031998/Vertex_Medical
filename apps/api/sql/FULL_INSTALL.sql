-- Vertex Medical Manager: Full fresh install
-- Select your target DB first in phpMyAdmin, then import this file.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS medicine_barcodes;
DROP TABLE IF EXISTS inventory_transfer_items;
DROP TABLE IF EXISTS dead_stock_records;
DROP TABLE IF EXISTS stock_movements;
DROP TABLE IF EXISTS stock;
DROP TABLE IF EXISTS invoice_prescriptions;
DROP TABLE IF EXISTS prescription_files;
DROP TABLE IF EXISTS schedule_h1_register;
DROP TABLE IF EXISTS return_refunds;
DROP TABLE IF EXISTS return_items;
DROP TABLE IF EXISTS `returns`;
DROP TABLE IF EXISTS purchase_return_items;
DROP TABLE IF EXISTS purchase_returns;
DROP TABLE IF EXISTS purchase_items;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS supplier_payments;
DROP TABLE IF EXISTS customer_payments;
DROP TABLE IF EXISTS customer_ledger;
DROP TABLE IF EXISTS inventory_transfers;
DROP TABLE IF EXISTS purchase_invoices;
DROP TABLE IF EXISTS prescriptions;
DROP TABLE IF EXISTS batches;
DROP TABLE IF EXISTS medicines;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS ui_menu;
DROP TABLE IF EXISTS approvals;
DROP TABLE IF EXISTS approval_rules;
DROP TABLE IF EXISTS notification_templates;
DROP TABLE IF EXISTS integrations;
DROP TABLE IF EXISTS custom_field_values;
DROP TABLE IF EXISTS custom_fields;
DROP TABLE IF EXISTS invoice_templates;
DROP TABLE IF EXISTS number_series;
DROP TABLE IF EXISTS org_modules;
DROP TABLE IF EXISTS modules;
DROP TABLE IF EXISTS org_branding;
DROP TABLE IF EXISTS org_settings;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS branches;
DROP TABLE IF EXISTS orgs;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------
-- TENANCY
-- ---------------------------
CREATE TABLE orgs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_org_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE branches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(30) NOT NULL,
  address TEXT NULL,
  phone VARCHAR(30) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_branch_org_code (org_id, code),
  KEY idx_branch_org (org_id),
  CONSTRAINT fk_branch_org FOREIGN KEY (org_id) REFERENCES orgs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------
-- RBAC / AUTH
-- ---------------------------
CREATE TABLE roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  role_key VARCHAR(60) NOT NULL,
  description VARCHAR(255) NULL,
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_roles_org_key (org_id, role_key),
  KEY idx_roles_org (org_id),
  CONSTRAINT fk_roles_org FOREIGN KEY (org_id) REFERENCES orgs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  perm_key VARCHAR(80) NOT NULL,
  name VARCHAR(180) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_perm_key (perm_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(30) NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  token_version INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email),
  KEY idx_users_org (org_id),
  KEY idx_users_branch (branch_id),
  KEY idx_users_role (role_id),
  CONSTRAINT fk_users_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE refresh_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_refresh_token_hash (token_hash),
  KEY idx_rt_user (user_id),
  KEY idx_rt_expiry (expires_at),
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------
-- CATALOG
-- ---------------------------
CREATE TABLE medicines (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  salt VARCHAR(255) NULL,
  manufacturer VARCHAR(255) NULL,
  schedule_type ENUM('OTC','H','H1','NARCOTIC') NOT NULL DEFAULT 'OTC',
  gst_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  reorder_level INT NOT NULL DEFAULT 0,
  barcode_primary VARCHAR(100) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_med_org (org_id),
  KEY idx_med_name (name),
  KEY idx_med_barcode_primary (barcode_primary),
  CONSTRAINT fk_med_org FOREIGN KEY (org_id) REFERENCES orgs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE medicine_barcodes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  medicine_id BIGINT UNSIGNED NOT NULL,
  barcode VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_mb_barcode (barcode),
  KEY idx_mb_med (medicine_id),
  CONSTRAINT fk_mb_med FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE batches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  medicine_id BIGINT UNSIGNED NOT NULL,
  batch_no VARCHAR(80) NOT NULL,
  expiry_date DATE NOT NULL,
  mrp DECIMAL(10,2) NOT NULL,
  purchase_rate DECIMAL(10,2) NOT NULL,
  selling_rate DECIMAL(10,2) NOT NULL,
  gst_rate DECIMAL(5,2) NOT NULL,
  is_blocked TINYINT(1) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_batch_org_med_no (org_id, medicine_id, batch_no),
  KEY idx_batch_org (org_id),
  KEY idx_batch_med (medicine_id),
  KEY idx_batch_expiry (expiry_date),
  CONSTRAINT fk_batch_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_batch_med FOREIGN KEY (medicine_id) REFERENCES medicines(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------
-- INVENTORY
-- ---------------------------
CREATE TABLE stock (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  batch_id BIGINT UNSIGNED NOT NULL,
  qty INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_stock_org_branch_batch (org_id, branch_id, batch_id),
  KEY idx_stock_branch (branch_id),
  KEY idx_stock_batch (batch_id),
  CONSTRAINT fk_stock_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_stock_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_stock_batch FOREIGN KEY (batch_id) REFERENCES batches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE stock_movements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  batch_id BIGINT UNSIGNED NOT NULL,
  move_type ENUM('PURCHASE','SALE','TRANSFER_OUT','TRANSFER_IN','RETURN_IN','RETURN_OUT','ADJUST','PURCHASE_RETURN') NOT NULL,
  qty_delta INT NOT NULL,
  ref_table VARCHAR(60) NULL,
  ref_id BIGINT UNSIGNED NULL,
  reason VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NULL,
  deleted_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sm_org_branch_created (org_id, branch_id, created_at),
  KEY idx_sm_batch (batch_id),
  KEY idx_sm_ref (ref_table, ref_id),
  CONSTRAINT fk_sm_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_sm_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_sm_batch FOREIGN KEY (batch_id) REFERENCES batches(id),
  CONSTRAINT fk_sm_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE inventory_transfers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  from_branch_id BIGINT UNSIGNED NOT NULL,
  to_branch_id BIGINT UNSIGNED NOT NULL,
  transfer_no VARCHAR(60) NOT NULL,
  note VARCHAR(255) NULL,
  status ENUM('DRAFT','POSTED','VOID') NOT NULL DEFAULT 'POSTED',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_transfer_org_no (org_id, transfer_no),
  KEY idx_transfer_org (org_id),
  KEY idx_transfer_branches (from_branch_id, to_branch_id),
  CONSTRAINT fk_transfer_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_transfer_from_branch FOREIGN KEY (from_branch_id) REFERENCES branches(id),
  CONSTRAINT fk_transfer_to_branch FOREIGN KEY (to_branch_id) REFERENCES branches(id),
  CONSTRAINT fk_transfer_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE inventory_transfer_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  transfer_id BIGINT UNSIGNED NOT NULL,
  batch_id BIGINT UNSIGNED NOT NULL,
  qty INT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_ti_transfer (transfer_id),
  KEY idx_ti_batch (batch_id),
  CONSTRAINT fk_ti_transfer FOREIGN KEY (transfer_id) REFERENCES inventory_transfers(id) ON DELETE CASCADE,
  CONSTRAINT fk_ti_batch FOREIGN KEY (batch_id) REFERENCES batches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE dead_stock_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  batch_id BIGINT UNSIGNED NOT NULL,
  qty INT NOT NULL,
  reason VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dsr_org_branch (org_id, branch_id),
  KEY idx_dsr_batch (batch_id),
  CONSTRAINT fk_dsr_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_dsr_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_dsr_batch FOREIGN KEY (batch_id) REFERENCES batches(id),
  CONSTRAINT fk_dsr_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------
-- CRM / PARTIES
-- ---------------------------
CREATE TABLE customers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NULL,
  email VARCHAR(190) NULL,
  address TEXT NULL,
  loyalty_points INT NOT NULL DEFAULT 0,
  credit_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cust_org (org_id),
  KEY idx_cust_phone (phone),
  CONSTRAINT fk_cust_org FOREIGN KEY (org_id) REFERENCES orgs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE customer_ledger (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  ref_type VARCHAR(60) NOT NULL,
  ref_id BIGINT UNSIGNED NULL,
  debit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  credit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  notes VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cl_org_customer_created (org_id, customer_id, created_at),
  KEY idx_cl_branch (branch_id),
  CONSTRAINT fk_cl_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_cl_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_cl_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_cl_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE customer_payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  mode ENUM('CASH','UPI','CARD','BANK') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  ref_no VARCHAR(80) NULL,
  notes VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cp_org_customer_created (org_id, customer_id, created_at),
  CONSTRAINT fk_cp_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_cp_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_cp_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_cp_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE suppliers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  gstin VARCHAR(20) NULL,
  phone VARCHAR(30) NULL,
  email VARCHAR(190) NULL,
  address TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sup_org (org_id),
  CONSTRAINT fk_sup_org FOREIGN KEY (org_id) REFERENCES orgs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------
-- PURCHASE
-- ---------------------------
CREATE TABLE purchase_invoices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  supplier_id BIGINT UNSIGNED NOT NULL,
  invoice_no VARCHAR(60) NOT NULL,
  invoice_date DATE NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tax_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status ENUM('DRAFT','POSTED','CANCELLED') NOT NULL DEFAULT 'POSTED',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_pi_org_no (org_id, invoice_no),
  KEY idx_pi_org_branch_date (org_id, branch_id, invoice_date),
  KEY idx_pi_supplier (supplier_id),
  CONSTRAINT fk_pi_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_pi_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_pi_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  CONSTRAINT fk_pi_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE purchase_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  purchase_invoice_id BIGINT UNSIGNED NOT NULL,
  medicine_id BIGINT UNSIGNED NOT NULL,
  batch_id BIGINT UNSIGNED NOT NULL,
  qty INT NOT NULL,
  purchase_rate DECIMAL(10,2) NOT NULL,
  mrp DECIMAL(10,2) NOT NULL,
  selling_rate DECIMAL(10,2) NOT NULL,
  gst_rate DECIMAL(5,2) NOT NULL,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  line_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (id),
  KEY idx_pit_pi (purchase_invoice_id),
  KEY idx_pit_batch (batch_id),
  CONSTRAINT fk_pit_pi FOREIGN KEY (purchase_invoice_id) REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_pit_med FOREIGN KEY (medicine_id) REFERENCES medicines(id),
  CONSTRAINT fk_pit_batch FOREIGN KEY (batch_id) REFERENCES batches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE purchase_returns (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  purchase_id BIGINT UNSIGNED NOT NULL,
  return_no VARCHAR(60) NOT NULL,
  reason VARCHAR(255) NULL,
  status ENUM('POSTED','VOID') NOT NULL DEFAULT 'POSTED',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_pr_org_no (org_id, return_no),
  KEY idx_pr_purchase (purchase_id),
  CONSTRAINT fk_pr_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_pr_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_pr_purchase FOREIGN KEY (purchase_id) REFERENCES purchase_invoices(id),
  CONSTRAINT fk_pr_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE purchase_return_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  purchase_return_id BIGINT UNSIGNED NOT NULL,
  purchase_item_id BIGINT UNSIGNED NULL,
  batch_id BIGINT UNSIGNED NOT NULL,
  qty INT NOT NULL,
  rate DECIMAL(10,2) NOT NULL,
  gst_rate DECIMAL(5,2) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_pri_return (purchase_return_id),
  KEY idx_pri_item (purchase_item_id),
  KEY idx_pri_batch (batch_id),
  CONSTRAINT fk_pri_return FOREIGN KEY (purchase_return_id) REFERENCES purchase_returns(id) ON DELETE CASCADE,
  CONSTRAINT fk_pri_item FOREIGN KEY (purchase_item_id) REFERENCES purchase_items(id),
  CONSTRAINT fk_pri_batch FOREIGN KEY (batch_id) REFERENCES batches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE supplier_payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  supplier_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  method ENUM('CASH','UPI','CARD','BANK') NOT NULL,
  ref_no VARCHAR(80) NULL,
  paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sp_org_supplier_paid (org_id, supplier_id, paid_at),
  CONSTRAINT fk_sp_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_sp_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_sp_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  CONSTRAINT fk_sp_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------
-- SALES / BILLING
-- ---------------------------
CREATE TABLE invoices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NULL,
  invoice_no VARCHAR(60) NOT NULL,
  invoice_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tax_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  amount_due DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status ENUM('PAID','PARTIAL','DUE','VOID') NOT NULL DEFAULT 'PAID',
  void_reason VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_inv_org_no (org_id, invoice_no),
  KEY idx_inv_org_branch_date (org_id, branch_id, invoice_date),
  KEY idx_inv_customer (customer_id),
  CONSTRAINT fk_inv_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_inv_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_inv_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_inv_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE invoice_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_id BIGINT UNSIGNED NOT NULL,
  medicine_id BIGINT UNSIGNED NOT NULL,
  batch_id BIGINT UNSIGNED NOT NULL,
  qty INT NOT NULL,
  selling_rate DECIMAL(10,2) NOT NULL,
  mrp DECIMAL(10,2) NOT NULL,
  gst_rate DECIMAL(5,2) NOT NULL,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  line_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (id),
  KEY idx_it_inv (invoice_id),
  KEY idx_it_batch (batch_id),
  CONSTRAINT fk_it_inv FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_it_med FOREIGN KEY (medicine_id) REFERENCES medicines(id),
  CONSTRAINT fk_it_batch FOREIGN KEY (batch_id) REFERENCES batches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_id BIGINT UNSIGNED NOT NULL,
  mode ENUM('CASH','UPI','CARD','BANK') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  ref_no VARCHAR(80) NULL,
  paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pay_inv (invoice_id),
  CONSTRAINT fk_pay_inv FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `returns` (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  invoice_id BIGINT UNSIGNED NOT NULL,
  return_no VARCHAR(60) NOT NULL,
  reason VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('POSTED','VOID') NOT NULL DEFAULT 'POSTED',
  PRIMARY KEY (id),
  UNIQUE KEY uk_returns_org_no (org_id, return_no),
  KEY idx_returns_invoice (invoice_id),
  CONSTRAINT fk_returns_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_returns_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_returns_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  CONSTRAINT fk_returns_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE return_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  return_id BIGINT UNSIGNED NOT NULL,
  invoice_item_id BIGINT UNSIGNED NOT NULL,
  batch_id BIGINT UNSIGNED NOT NULL,
  qty INT NOT NULL,
  rate DECIMAL(10,2) NOT NULL,
  gst_rate DECIMAL(5,2) NOT NULL,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  amount DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_ri_return (return_id),
  KEY idx_ri_batch (batch_id),
  CONSTRAINT fk_ri_return FOREIGN KEY (return_id) REFERENCES `returns`(id) ON DELETE CASCADE,
  CONSTRAINT fk_ri_invoice_item FOREIGN KEY (invoice_item_id) REFERENCES invoice_items(id),
  CONSTRAINT fk_ri_batch FOREIGN KEY (batch_id) REFERENCES batches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE return_refunds (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  return_id BIGINT UNSIGNED NOT NULL,
  mode ENUM('CASH','UPI','CARD','BANK') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  ref_no VARCHAR(80) NULL,
  paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rr_return (return_id),
  CONSTRAINT fk_rr_return FOREIGN KEY (return_id) REFERENCES `returns`(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------
-- PRESCRIPTIONS / COMPLIANCE
-- ---------------------------
CREATE TABLE prescriptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NULL,
  doctor_name VARCHAR(255) NULL,
  doctor_reg_no VARCHAR(80) NULL,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pr_org_branch (org_id, branch_id),
  CONSTRAINT fk_pres_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_pres_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_pres_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_pres_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE prescription_files (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  prescription_id BIGINT UNSIGNED NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pf_pr (prescription_id),
  CONSTRAINT fk_pf_pr FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE invoice_prescriptions (
  invoice_id BIGINT UNSIGNED NOT NULL,
  prescription_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (invoice_id, prescription_id),
  CONSTRAINT fk_ip_inv FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_ip_pr FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE schedule_h1_register (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  invoice_id BIGINT UNSIGNED NOT NULL,
  invoice_item_id BIGINT UNSIGNED NOT NULL,
  medicine_id BIGINT UNSIGNED NOT NULL,
  batch_id BIGINT UNSIGNED NOT NULL,
  customer_name VARCHAR(255) NULL,
  customer_phone VARCHAR(30) NULL,
  doctor_name VARCHAR(255) NULL,
  qty INT NOT NULL,
  sold_at DATETIME NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_h1_org_branch_sold (org_id, branch_id, sold_at),
  CONSTRAINT fk_h1_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_h1_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_h1_inv FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  CONSTRAINT fk_h1_item FOREIGN KEY (invoice_item_id) REFERENCES invoice_items(id),
  CONSTRAINT fk_h1_med FOREIGN KEY (medicine_id) REFERENCES medicines(id),
  CONSTRAINT fk_h1_batch FOREIGN KEY (batch_id) REFERENCES batches(id),
  CONSTRAINT fk_h1_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------
-- SETTINGS / WHITE LABEL
-- ---------------------------
CREATE TABLE org_settings (
  org_id BIGINT UNSIGNED NOT NULL,
  setting_key VARCHAR(120) NOT NULL,
  setting_value_json JSON NOT NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (org_id, setting_key),
  KEY idx_org_settings_updated_by (updated_by),
  CONSTRAINT fk_org_settings_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT fk_org_settings_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE org_branding (
  org_id BIGINT UNSIGNED NOT NULL,
  app_name VARCHAR(255) NOT NULL,
  logo_url VARCHAR(500) NULL,
  primary_color VARCHAR(32) NULL,
  secondary_color VARCHAR(32) NULL,
  login_bg_url VARCHAR(500) NULL,
  support_phone VARCHAR(40) NULL,
  terms_url VARCHAR(500) NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (org_id),
  CONSTRAINT fk_org_branding_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT fk_org_branding_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE modules (
  module_key VARCHAR(60) NOT NULL,
  name VARCHAR(120) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_core TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (module_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE org_modules (
  org_id BIGINT UNSIGNED NOT NULL,
  module_key VARCHAR(60) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (org_id, module_key),
  CONSTRAINT fk_org_modules_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT fk_org_modules_module FOREIGN KEY (module_key) REFERENCES modules(module_key) ON DELETE CASCADE,
  CONSTRAINT fk_org_modules_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE ui_menu (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  menu_json JSON NOT NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ui_menu_org_role (org_id, role_id),
  CONSTRAINT fk_ui_menu_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT fk_ui_menu_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_ui_menu_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE number_series (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  series_key VARCHAR(40) NOT NULL,
  prefix VARCHAR(40) NOT NULL,
  next_no BIGINT UNSIGNED NOT NULL DEFAULT 1,
  padding INT UNSIGNED NOT NULL DEFAULT 6,
  reset_rule ENUM('NEVER','DAILY','MONTHLY','YEARLY') NOT NULL DEFAULT 'YEARLY',
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_number_series_org_key (org_id, series_key),
  CONSTRAINT fk_number_series_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT fk_number_series_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE invoice_templates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  template_key VARCHAR(40) NOT NULL,
  template_json JSON NOT NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_invoice_templates_org_key (org_id, template_key),
  CONSTRAINT fk_invoice_templates_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT fk_invoice_templates_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE approval_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  rule_key VARCHAR(80) NOT NULL,
  conditions_json JSON NOT NULL,
  approver_role_id BIGINT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_approval_rules_org_key (org_id, rule_key),
  CONSTRAINT fk_approval_rules_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT fk_approval_rules_role FOREIGN KEY (approver_role_id) REFERENCES roles(id),
  CONSTRAINT fk_approval_rules_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE approvals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  request_type VARCHAR(80) NOT NULL,
  request_id BIGINT UNSIGNED NOT NULL,
  status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  requested_by BIGINT UNSIGNED NOT NULL,
  approved_by BIGINT UNSIGNED NULL,
  reason VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at DATETIME NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_approvals_org_status (org_id, status),
  KEY idx_approvals_request (request_type, request_id),
  CONSTRAINT fk_approvals_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT fk_approvals_requested_by FOREIGN KEY (requested_by) REFERENCES users(id),
  CONSTRAINT fk_approvals_approved_by FOREIGN KEY (approved_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE custom_fields (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  entity VARCHAR(80) NOT NULL,
  field_key VARCHAR(80) NOT NULL,
  label VARCHAR(120) NOT NULL,
  type ENUM('TEXT','NUMBER','DATE','DATETIME','BOOLEAN','SELECT','MULTISELECT','JSON') NOT NULL DEFAULT 'TEXT',
  required TINYINT(1) NOT NULL DEFAULT 0,
  options_json JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_custom_fields_org_entity_key (org_id, entity, field_key),
  CONSTRAINT fk_custom_fields_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT fk_custom_fields_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE custom_field_values (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  entity VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED NOT NULL,
  field_key VARCHAR(80) NOT NULL,
  value_json JSON NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_custom_values_org_entity_row (org_id, entity, entity_id, field_key),
  KEY idx_custom_values_entity (org_id, entity, entity_id),
  CONSTRAINT fk_custom_values_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT fk_custom_values_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE integrations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  provider_key VARCHAR(80) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  config_json JSON NOT NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_integrations_org_provider (org_id, provider_key),
  CONSTRAINT fk_integrations_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT fk_integrations_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE notification_templates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  channel ENUM('SMS','WHATSAPP','EMAIL','PUSH') NOT NULL,
  event_key VARCHAR(80) NOT NULL,
  template TEXT NOT NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_notification_templates_org_event (org_id, channel, event_key),
  CONSTRAINT fk_notification_templates_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_templates_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------
-- AUDIT
-- ---------------------------
CREATE TABLE audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(60) NOT NULL,
  entity VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  before_json JSON NULL,
  after_json JSON NULL,
  ip VARCHAR(80) NULL,
  ua VARCHAR(512) NULL,
  user_agent VARCHAR(512) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_org (org_id),
  KEY idx_audit_entity (entity, entity_id),
  KEY idx_audit_created (created_at),
  CONSTRAINT fk_audit_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_audit_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------
-- SEED DATA
-- ---------------------------
INSERT INTO orgs (id, name, slug) VALUES
(1, 'Vertex Demo Pharmacy', 'vertex-demo');

INSERT INTO branches (id, org_id, name, code, address, phone, is_active) VALUES
(1, 1, 'Main Branch', 'MAIN', 'Mysuru, Karnataka', '9999999999', 1);

INSERT INTO permissions (perm_key, name) VALUES
('USER_ADMIN','Admin access'),
('BRANCH_READ','View branches'),
('BRANCH_WRITE','Create/update branches'),
('ROLE_READ','View roles'),
('ROLE_WRITE','Create/update roles'),
('PERMISSION_READ','View permissions'),
('SETTINGS_READ','View organization settings'),
('SETTINGS_WRITE','Update organization settings'),
('DASHBOARD_VIEW','View dashboard'),
('MEDICINE_READ','Read medicines'),
('MEDICINE_WRITE','Create/update medicines'),
('BATCH_READ','Read batches'),
('BATCH_WRITE','Create/update batches'),
('INVENTORY_READ','Read inventory'),
('INVENTORY_WRITE','Update inventory'),
('STOCK_ADJUST_CREATE','Create stock adjustments'),
('STOCK_ADJUST_APPROVE','Approve stock adjustments'),
('STOCK_TRANSFER_CREATE','Create stock transfers'),
('STOCK_TRANSFER_APPROVE','Approve stock transfers'),
('NEAR_EXPIRY_VIEW','View near expiry stock'),
('DEAD_STOCK_VIEW','View dead stock'),
('BILLING_CREATE','Create bills'),
('BILLING_READ','Read bills'),
('BILLING_PRINT','Print/share bills'),
('BILLING_RETURN','Create billing returns'),
('BILLING_REFUND','Process refunds'),
('BILLING_DISCOUNT_OVERRIDE','Override discount'),
('BILLING_PRICE_OVERRIDE','Override item price'),
('BILLING_EXPORT','Export billing data'),
('PURCHASE_CREATE','Create purchases'),
('PURCHASE_READ','Read purchases'),
('PURCHASE_RETURN','Create purchase returns'),
('SUPPLIER_PAYMENT_WRITE','Create supplier payments'),
('CUSTOMER_READ','Read customers'),
('CUSTOMER_WRITE','Create/update customers'),
('CUSTOMER_LEDGER_WRITE','Write customer ledger'),
('SUPPLIER_READ','Read suppliers'),
('SUPPLIER_WRITE','Create/update suppliers'),
('REPORTS_VIEW','View reports'),
('REPORTS_EXPORT','Export reports'),
('GST_EXPORT','Export GST reports'),
('TALLY_EXPORT','Export Tally reports'),
('COMPLIANCE_VIEW','View compliance'),
('SCHEDULE_H1_VIEW','View schedule H1'),
('SCHEDULE_H1_WRITE','Write schedule H1'),
('AUDIT_LOG_VIEW','View audit logs'),
('PRESCRIPTION_READ','Read prescriptions'),
('PRESCRIPTION_WRITE','Create/link prescriptions');

INSERT INTO roles (id, org_id, name, role_key, description, is_system, is_active) VALUES
(1,1,'Admin','ADMIN','Full access',1,1),
(2,1,'Owner','OWNER','Business owner',1,1),
(3,1,'Store Manager','STORE_MANAGER','Inventory & purchases',1,1),
(4,1,'Pharmacist','PHARMACIST','Dispensing and billing',1,1),
(5,1,'Cashier','CASHIER','Billing counter',1,1);

-- Admin: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, p.id FROM permissions p;

-- Owner
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, p.id FROM permissions p
WHERE p.perm_key IN (
  'DASHBOARD_VIEW','BILLING_READ','BILLING_EXPORT','BILLING_RETURN','BILLING_REFUND',
  'PURCHASE_READ','PURCHASE_RETURN','INVENTORY_READ','REPORTS_VIEW','REPORTS_EXPORT',
  'GST_EXPORT','TALLY_EXPORT','COMPLIANCE_VIEW','SCHEDULE_H1_VIEW','AUDIT_LOG_VIEW',
  'STOCK_TRANSFER_APPROVE','STOCK_ADJUST_APPROVE','SETTINGS_READ'
);

-- Store Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, p.id FROM permissions p
WHERE p.perm_key IN (
  'DASHBOARD_VIEW','MEDICINE_READ','MEDICINE_WRITE','BATCH_READ','BATCH_WRITE',
  'INVENTORY_READ','INVENTORY_WRITE','STOCK_ADJUST_CREATE','STOCK_TRANSFER_CREATE',
  'PURCHASE_CREATE','PURCHASE_READ','PURCHASE_RETURN','SUPPLIER_READ','SUPPLIER_WRITE',
  'SUPPLIER_PAYMENT_WRITE','REPORTS_VIEW','NEAR_EXPIRY_VIEW','DEAD_STOCK_VIEW'
);

-- Pharmacist
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, p.id FROM permissions p
WHERE p.perm_key IN (
  'DASHBOARD_VIEW','MEDICINE_READ','BATCH_READ','INVENTORY_READ',
  'BILLING_CREATE','BILLING_READ','BILLING_RETURN',
  'CUSTOMER_READ','CUSTOMER_WRITE','CUSTOMER_LEDGER_WRITE',
  'PRESCRIPTION_READ','PRESCRIPTION_WRITE',
  'COMPLIANCE_VIEW','SCHEDULE_H1_VIEW','SCHEDULE_H1_WRITE'
);

-- Cashier
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, p.id FROM permissions p
WHERE p.perm_key IN (
  'DASHBOARD_VIEW','BILLING_CREATE','BILLING_READ','CUSTOMER_READ','PRESCRIPTION_READ'
);

INSERT INTO modules (module_key, name, sort_order, is_core) VALUES
('INVENTORY','Inventory',10,1),
('BILLING_POS','Billing POS',20,1),
('PURCHASES','Purchases',30,0),
('CUSTOMERS','Customers',40,1),
('REPORTS','Reports',50,0),
('COMPLIANCE','Compliance',60,0),
('ACCOUNTING','Accounting',70,0),
('INTEGRATIONS','Integrations',80,0);

INSERT INTO users (id, org_id, branch_id, role_id, name, email, phone, password_hash, is_active, token_version)
VALUES (1,1,1,1,'Vertex Admin','admin@vertex.com','9999999999','$2a$10$iy9uD91xYQzRkd9BOxYcWuSJOHulvoYxq6jXnHnPJv04EmSUJGjN2',1,0);

INSERT INTO org_modules (org_id, module_key, enabled, updated_by) VALUES
(1,'INVENTORY',1,1),
(1,'BILLING_POS',1,1),
(1,'PURCHASES',1,1),
(1,'CUSTOMERS',1,1),
(1,'REPORTS',1,1),
(1,'COMPLIANCE',1,1),
(1,'ACCOUNTING',1,1),
(1,'INTEGRATIONS',1,1);

INSERT INTO org_branding (org_id, app_name, logo_url, primary_color, secondary_color, login_bg_url, support_phone, terms_url, updated_by)
VALUES (1, 'Vertex Medical Manager', NULL, '#4F46E5', '#06B6D4', NULL, '9999999999', NULL, 1);

INSERT INTO number_series (org_id, series_key, prefix, next_no, padding, reset_rule, updated_by) VALUES
(1,'INV','INV-MAIN-',1,6,'YEARLY',1),
(1,'PUR','PUR-MAIN-',1,6,'YEARLY',1),
(1,'RET','RET-MAIN-',1,6,'YEARLY',1),
(1,'STOCKTR','TR-MAIN-',1,6,'YEARLY',1);

INSERT INTO invoice_templates (org_id, template_key, template_json, updated_by)
VALUES
(1,'DEFAULT', JSON_OBJECT('paper','A4','show_qr',true,'footer','Thank you for your business'), 1);

INSERT INTO org_settings (org_id, setting_key, setting_value_json, updated_by) VALUES
(1,'require_prescription_for_h1', JSON_EXTRACT('{"value": true}', '$.value'), 1),
(1,'billing', JSON_OBJECT('allow_price_override', false, 'allow_discount_override', false), 1),
(1,'alerts', JSON_OBJECT('near_expiry_days', 60), 1),
(1,'payments', JSON_OBJECT('upi_enabled', true, 'split_payment_enabled', true), 1);

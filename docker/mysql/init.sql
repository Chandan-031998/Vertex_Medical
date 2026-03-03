-- Vertex Medical Manager (Pharmacy ERP) - MySQL 8 schema + seed
-- This file is executed automatically by the MySQL Docker image on first start.

CREATE DATABASE IF NOT EXISTS pixelfla_vertex_medical_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pixelfla_vertex_medical_manager;

SET sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ---------------------------
-- TENANT / ORG / BRANCH
-- ---------------------------
CREATE TABLE IF NOT EXISTS orgs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_org_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS branches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(30) NOT NULL,
  address TEXT NULL,
  phone VARCHAR(30) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_branch_code_org (org_id, code),
  KEY idx_branch_org (org_id),
  CONSTRAINT fk_branch_org FOREIGN KEY (org_id) REFERENCES orgs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------
-- RBAC
-- ---------------------------
CREATE TABLE IF NOT EXISTS roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  role_key VARCHAR(60) NOT NULL,
  description VARCHAR(255) NULL,
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_role_org_key (org_id, role_key),
  KEY idx_role_org (org_id),
  CONSTRAINT fk_role_org FOREIGN KEY (org_id) REFERENCES orgs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  perm_key VARCHAR(80) NOT NULL,
  name VARCHAR(150) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_perm_key (perm_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(30) NULL,
  password_hash VARCHAR(255) NOT NULL,
  token_version INT UNSIGNED NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_email_org (org_id, email),
  KEY idx_user_org (org_id),
  KEY idx_user_branch (branch_id),
  KEY idx_user_role (role_id),
  CONSTRAINT fk_user_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_user_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- MySQL compatibility: avoid `ADD COLUMN IF NOT EXISTS` for older versions.
SET @db_name := DATABASE();

SET @roles_is_active_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'is_active'
);
SET @sql := IF(
  @roles_is_active_exists = 0,
  'ALTER TABLE roles ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1',
  'SELECT "roles.is_active exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @roles_description_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'description'
);
SET @sql := IF(
  @roles_description_exists = 0,
  'ALTER TABLE roles ADD COLUMN description VARCHAR(255) NULL',
  'SELECT "roles.description exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @users_token_version_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'users' AND COLUMN_NAME = 'token_version'
);
SET @sql := IF(
  @users_token_version_exists = 0,
  'ALTER TABLE users ADD COLUMN token_version INT UNSIGNED NOT NULL DEFAULT 1',
  'SELECT "users.token_version exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @med_updated_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='medicines' AND COLUMN_NAME='updated_at'
);
SET @med_table_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='medicines'
);
SET @sql := IF(@med_table_exists=1 AND @med_updated_exists=0, 'ALTER TABLE medicines ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT "medicines.updated_at exists or table missing"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @med_deleted_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='medicines' AND COLUMN_NAME='deleted_at'
);
SET @sql := IF(@med_table_exists=1 AND @med_deleted_exists=0, 'ALTER TABLE medicines ADD COLUMN deleted_at DATETIME NULL', 'SELECT "medicines.deleted_at exists or table missing"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @batch_updated_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='batches' AND COLUMN_NAME='updated_at'
);
SET @batch_table_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='batches'
);
SET @sql := IF(@batch_table_exists=1 AND @batch_updated_exists=0, 'ALTER TABLE batches ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT "batches.updated_at exists or table missing"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @batch_deleted_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='batches' AND COLUMN_NAME='deleted_at'
);
SET @sql := IF(@batch_table_exists=1 AND @batch_deleted_exists=0, 'ALTER TABLE batches ADD COLUMN deleted_at DATETIME NULL', 'SELECT "batches.deleted_at exists or table missing"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cust_updated_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='customers' AND COLUMN_NAME='updated_at'
);
SET @cust_table_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='customers'
);
SET @sql := IF(@cust_table_exists=1 AND @cust_updated_exists=0, 'ALTER TABLE customers ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT "customers.updated_at exists or table missing"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @cust_deleted_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='customers' AND COLUMN_NAME='deleted_at'
);
SET @sql := IF(@cust_table_exists=1 AND @cust_deleted_exists=0, 'ALTER TABLE customers ADD COLUMN deleted_at DATETIME NULL', 'SELECT "customers.deleted_at exists or table missing"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sup_updated_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='suppliers' AND COLUMN_NAME='updated_at'
);
SET @sup_table_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='suppliers'
);
SET @sql := IF(@sup_table_exists=1 AND @sup_updated_exists=0, 'ALTER TABLE suppliers ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT "suppliers.updated_at exists or table missing"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sup_deleted_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='suppliers' AND COLUMN_NAME='deleted_at'
);
SET @sql := IF(@sup_table_exists=1 AND @sup_deleted_exists=0, 'ALTER TABLE suppliers ADD COLUMN deleted_at DATETIME NULL', 'SELECT "suppliers.deleted_at exists or table missing"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sm_deleted_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='stock_movements' AND COLUMN_NAME='deleted_at'
);
SET @sm_table_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='stock_movements'
);
SET @sql := IF(@sm_table_exists=1 AND @sm_deleted_exists=0, 'ALTER TABLE stock_movements ADD COLUMN deleted_at DATETIME NULL', 'SELECT "stock_movements.deleted_at exists or table missing"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_rt_user (user_id),
  UNIQUE KEY uk_rt_hash (token_hash),
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------
-- MASTER DATA: MEDICINES / BATCHES
-- ---------------------------
CREATE TABLE IF NOT EXISTS medicines (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  salt VARCHAR(255) NULL,
  manufacturer VARCHAR(255) NULL,
  schedule_type ENUM('OTC','H','H1','X','NARCOTIC') NOT NULL DEFAULT 'OTC',
  gst_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  reorder_level INT NOT NULL DEFAULT 0,
  barcode_primary VARCHAR(80) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_med_org (org_id),
  FULLTEXT KEY ft_med_search (name, salt, manufacturer),
  CONSTRAINT fk_med_org FOREIGN KEY (org_id) REFERENCES orgs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS medicine_barcodes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  medicine_id BIGINT UNSIGNED NOT NULL,
  barcode VARCHAR(80) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_barcode (barcode),
  KEY idx_mb_med (medicine_id),
  CONSTRAINT fk_mb_med FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS batches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  medicine_id BIGINT UNSIGNED NOT NULL,
  batch_no VARCHAR(60) NOT NULL,
  expiry_date DATE NOT NULL,
  mrp DECIMAL(10,2) NOT NULL,
  purchase_rate DECIMAL(10,2) NOT NULL,
  selling_rate DECIMAL(10,2) NOT NULL,
  gst_rate DECIMAL(5,2) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_batch_med (medicine_id, batch_no),
  KEY idx_batch_org (org_id),
  KEY idx_batch_exp (expiry_date),
  CONSTRAINT fk_batch_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_batch_med FOREIGN KEY (medicine_id) REFERENCES medicines(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------
-- INVENTORY (ledger + current stock)
-- ---------------------------
CREATE TABLE IF NOT EXISTS stock (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  batch_id BIGINT UNSIGNED NOT NULL,
  qty INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_stock_branch_batch (branch_id, batch_id),
  KEY idx_stock_org (org_id),
  KEY idx_stock_batch (batch_id),
  CONSTRAINT fk_stock_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_stock_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_stock_batch FOREIGN KEY (batch_id) REFERENCES batches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stock_movements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  batch_id BIGINT UNSIGNED NOT NULL,
  move_type ENUM('PURCHASE','SALE','TRANSFER_OUT','TRANSFER_IN','RETURN_IN','RETURN_OUT','ADJUST') NOT NULL,
  qty_delta INT NOT NULL,
  ref_table VARCHAR(60) NULL,
  ref_id BIGINT UNSIGNED NULL,
  reason VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NULL,
  deleted_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sm_org (org_id),
  KEY idx_sm_branch (branch_id),
  KEY idx_sm_batch (batch_id),
  KEY idx_sm_created_at (created_at),
  CONSTRAINT fk_sm_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_sm_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_sm_batch FOREIGN KEY (batch_id) REFERENCES batches(id),
  CONSTRAINT fk_sm_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------
-- CUSTOMERS / SUPPLIERS
-- ---------------------------
CREATE TABLE IF NOT EXISTS customers (
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

CREATE TABLE IF NOT EXISTS suppliers (
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
-- PURCHASES
-- ---------------------------
CREATE TABLE IF NOT EXISTS purchase_invoices (
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
  KEY idx_pi_org (org_id),
  KEY idx_pi_branch (branch_id),
  KEY idx_pi_supplier (supplier_id),
  CONSTRAINT fk_pi_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_pi_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_pi_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  CONSTRAINT fk_pi_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS purchase_items (
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
  CONSTRAINT fk_pit_pi FOREIGN KEY (purchase_invoice_id) REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_pit_med FOREIGN KEY (medicine_id) REFERENCES medicines(id),
  CONSTRAINT fk_pit_batch FOREIGN KEY (batch_id) REFERENCES batches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------
-- BILLING / POS
-- ---------------------------
CREATE TABLE IF NOT EXISTS invoices (
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
  KEY idx_inv_org (org_id),
  KEY idx_inv_branch (branch_id),
  KEY idx_inv_date (invoice_date),
  CONSTRAINT fk_inv_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_inv_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_inv_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_inv_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS invoice_items (
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
  CONSTRAINT fk_it_inv FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_it_med FOREIGN KEY (medicine_id) REFERENCES medicines(id),
  CONSTRAINT fk_it_batch FOREIGN KEY (batch_id) REFERENCES batches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_id BIGINT UNSIGNED NOT NULL,
  mode ENUM('CASH','UPI','CARD') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  ref_no VARCHAR(80) NULL,
  paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pay_inv (invoice_id),
  CONSTRAINT fk_pay_inv FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------
-- PRESCRIPTIONS & COMPLIANCE
-- ---------------------------
CREATE TABLE IF NOT EXISTS prescriptions (
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
  KEY idx_pr_org (org_id),
  KEY idx_pr_branch (branch_id),
  CONSTRAINT fk_pr_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_pr_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_pr_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_pr_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS prescription_files (
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

CREATE TABLE IF NOT EXISTS invoice_prescriptions (
  invoice_id BIGINT UNSIGNED NOT NULL,
  prescription_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (invoice_id, prescription_id),
  CONSTRAINT fk_ip_inv FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_ip_pr FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS schedule_h1_register (
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
  KEY idx_h1_org (org_id),
  KEY idx_h1_branch (branch_id),
  KEY idx_h1_sold (sold_at),
  CONSTRAINT fk_h1_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_h1_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_h1_inv FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  CONSTRAINT fk_h1_item FOREIGN KEY (invoice_item_id) REFERENCES invoice_items(id),
  CONSTRAINT fk_h1_med FOREIGN KEY (medicine_id) REFERENCES medicines(id),
  CONSTRAINT fk_h1_batch FOREIGN KEY (batch_id) REFERENCES batches(id),
  CONSTRAINT fk_h1_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------
-- AUDIT
-- ---------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
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
  user_agent VARCHAR(255) NULL,
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
-- CONFIGURATION / WHITE LABEL
-- ---------------------------
CREATE TABLE IF NOT EXISTS org_settings (
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

CREATE TABLE IF NOT EXISTS org_branding (
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
  KEY idx_org_branding_updated_by (updated_by),
  CONSTRAINT fk_org_branding_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT fk_org_branding_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS modules (
  module_key VARCHAR(60) NOT NULL,
  name VARCHAR(120) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_core TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (module_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS org_modules (
  org_id BIGINT UNSIGNED NOT NULL,
  module_key VARCHAR(60) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (org_id, module_key),
  KEY idx_org_modules_updated_by (updated_by),
  CONSTRAINT fk_org_modules_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT fk_org_modules_module FOREIGN KEY (module_key) REFERENCES modules(module_key) ON DELETE CASCADE,
  CONSTRAINT fk_org_modules_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ui_menu (
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

CREATE TABLE IF NOT EXISTS number_series (
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

CREATE TABLE IF NOT EXISTS invoice_templates (
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

CREATE TABLE IF NOT EXISTS approval_rules (
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

CREATE TABLE IF NOT EXISTS approvals (
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
  PRIMARY KEY (id),
  KEY idx_approvals_org_status (org_id, status),
  KEY idx_approvals_request (request_type, request_id),
  CONSTRAINT fk_approvals_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT fk_approvals_requested_by FOREIGN KEY (requested_by) REFERENCES users(id),
  CONSTRAINT fk_approvals_approved_by FOREIGN KEY (approved_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS custom_fields (
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

CREATE TABLE IF NOT EXISTS custom_field_values (
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

CREATE TABLE IF NOT EXISTS integrations (
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

CREATE TABLE IF NOT EXISTS notification_templates (
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
-- SEED DATA
-- ---------------------------
INSERT INTO orgs (id, name, slug) VALUES (1, 'Vertex Demo Pharmacy', 'vertex-demo')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO branches (id, org_id, name, code, address, phone) VALUES
(1, 1, 'Main Branch', 'MAIN', 'Mysuru, Karnataka', '0000000000')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Permissions (granular ERP set + backward compatibility)
INSERT INTO permissions (perm_key, name) VALUES
('DASHBOARD_VIEW','View dashboard'),
('MEDICINE_READ','Read medicines'),
('MEDICINE_WRITE','Create/Update medicines'),
('BATCH_READ','Read batches'),
('BATCH_WRITE','Create/Update batches'),
('INVENTORY_READ','View inventory'),
('INVENTORY_WRITE','Adjust/Transfer inventory'),
('BILLING_CREATE','Create bills'),
('BILLING_READ','View bills'),
('BILLING_VOID','Void bills'),
('BILLING_RETURN','Create billing returns'),
('BILLING_REFUND','Process billing refunds'),
('BILLING_DISCOUNT_OVERRIDE','Override billing discount'),
('BILLING_PRICE_OVERRIDE','Override billing price'),
('BILLING_EXPORT','Export billing data'),
('PURCHASE_CREATE','Create purchases'),
('PURCHASE_READ','View purchases'),
('CUSTOMER_READ','Read customers'),
('CUSTOMER_WRITE','Create/Update customers'),
('SUPPLIER_READ','Read suppliers'),
('SUPPLIER_WRITE','Create/Update suppliers'),
('REPORTS_VIEW','View reports'),
('REPORTS_EXPORT','Export reports'),
('GST_EXPORT','Export GST reports'),
('TALLY_EXPORT','Export Tally reports'),
('COMPLIANCE_VIEW','View compliance registers'),
('SCHEDULE_H1_VIEW','View schedule H1 register'),
('SCHEDULE_H1_WRITE','Write schedule H1 register'),
('AUDIT_LOG_VIEW','View audit logs'),
('BRANCH_READ','View branches'),
('BRANCH_WRITE','Create/update branches'),
('ROLE_READ','View roles'),
('ROLE_WRITE','Create/update roles and role permissions'),
('PERMISSION_READ','View permissions'),
('SETTINGS_READ','View org settings'),
('SETTINGS_WRITE','Update org settings'),
('STOCK_TRANSFER_CREATE','Create stock transfer'),
('STOCK_TRANSFER_APPROVE','Approve stock transfer'),
('STOCK_ADJUST_CREATE','Create stock adjustment'),
('STOCK_ADJUST_APPROVE','Approve stock adjustment'),
('DEAD_STOCK_VIEW','View dead stock'),
('NEAR_EXPIRY_VIEW','View near-expiry stock'),
('USER_ADMIN','Manage users/roles/branches')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Roles
INSERT INTO roles (id, org_id, name, role_key, is_system, is_active) VALUES
(1,1,'Admin','ADMIN',1,1),
(2,1,'Owner','OWNER',1,1),
(3,1,'Store Manager','STORE_MANAGER',1,1),
(4,1,'Pharmacist','PHARMACIST',1,1),
(5,1,'Cashier','CASHIER',1,1)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Admin gets all permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, p.id FROM permissions p;

-- Owner gets reports + compliance + dashboard
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 2, p.id FROM permissions p
WHERE p.perm_key IN (
  'DASHBOARD_VIEW','REPORTS_VIEW','REPORTS_EXPORT','GST_EXPORT','TALLY_EXPORT',
  'COMPLIANCE_VIEW','SCHEDULE_H1_VIEW','AUDIT_LOG_VIEW',
  'BILLING_READ','BILLING_EXPORT','PURCHASE_READ','INVENTORY_READ',
  'STOCK_TRANSFER_APPROVE','STOCK_ADJUST_APPROVE'
);

-- Store Manager gets inventory + purchase + medicine/batch
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 3, p.id FROM permissions p
WHERE p.perm_key IN (
  'DASHBOARD_VIEW','MEDICINE_READ','MEDICINE_WRITE','BATCH_READ','BATCH_WRITE',
  'INVENTORY_READ','INVENTORY_WRITE','PURCHASE_CREATE','PURCHASE_READ','REPORTS_VIEW',
  'STOCK_TRANSFER_CREATE','STOCK_ADJUST_CREATE','DEAD_STOCK_VIEW','NEAR_EXPIRY_VIEW'
);

-- Pharmacist gets billing + prescription + medicine read
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 4, p.id FROM permissions p
WHERE p.perm_key IN (
  'DASHBOARD_VIEW','MEDICINE_READ','BATCH_READ','INVENTORY_READ',
  'BILLING_CREATE','BILLING_READ','BILLING_RETURN',
  'CUSTOMER_READ','CUSTOMER_WRITE','COMPLIANCE_VIEW','SCHEDULE_H1_VIEW','SCHEDULE_H1_WRITE'
);

-- Cashier limited billing
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 5, p.id FROM permissions p
WHERE p.perm_key IN (
  'DASHBOARD_VIEW','MEDICINE_READ','BATCH_READ','INVENTORY_READ',
  'BILLING_CREATE','BILLING_READ','CUSTOMER_READ'
);

INSERT INTO modules (module_key, name, sort_order, is_core) VALUES
('INVENTORY','Inventory',10,1),
('BILLING_POS','Billing POS',20,1),
('PURCHASES','Purchases',30,0),
('CUSTOMERS','Customers',40,1),
('REPORTS','Reports',50,0),
('COMPLIANCE','Compliance',60,0),
('ACCOUNTING','Accounting',70,0),
('INTEGRATIONS','Integrations',80,0)
ON DUPLICATE KEY UPDATE
  name=VALUES(name),
  sort_order=VALUES(sort_order),
  is_core=VALUES(is_core);

INSERT INTO org_modules (org_id, module_key, enabled, updated_by) VALUES
(1,'INVENTORY',1,NULL),
(1,'BILLING_POS',1,NULL),
(1,'PURCHASES',1,NULL),
(1,'CUSTOMERS',1,NULL),
(1,'REPORTS',1,NULL),
(1,'COMPLIANCE',1,NULL),
(1,'ACCOUNTING',1,NULL),
(1,'INTEGRATIONS',0,NULL)
ON DUPLICATE KEY UPDATE enabled=VALUES(enabled), updated_by=VALUES(updated_by);

-- Default admin user (email/password below in README)
INSERT INTO users (id, org_id, branch_id, role_id, name, email, phone, password_hash, is_active)
VALUES (1,1,1,1,'Vertex Admin','admin@vertex.com','9999999999','$2b$10$P2hk1pEV2w2V89fM5lcxsOdFNoS4VGCpGrkw5QgdjzkRc5FQVL51K',1)
ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), role_id=VALUES(role_id), is_active=VALUES(is_active);

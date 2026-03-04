-- Milestone 2: Returns/Refunds + Credit Billing + Customer Ledger
-- Safe for existing DB (idempotent)

SET @db_name := DATABASE();

CREATE TABLE IF NOT EXISTS customer_ledger (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  ref_type VARCHAR(40) NOT NULL,
  ref_id BIGINT UNSIGNED NULL,
  debit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  credit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  notes VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cl_org_customer (org_id, customer_id, created_at),
  KEY idx_cl_branch (branch_id),
  CONSTRAINT fk_cl_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_cl_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_cl_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_cl_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS customer_payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  mode ENUM('CASH','UPI','CARD') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  ref_no VARCHAR(80) NULL,
  notes VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cp_org_customer (org_id, customer_id, created_at),
  CONSTRAINT fk_cp_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_cp_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_cp_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_cp_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `returns` (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  invoice_id BIGINT UNSIGNED NOT NULL,
  return_no VARCHAR(60) NOT NULL,
  reason VARCHAR(255) NULL,
  status ENUM('POSTED','VOID') NOT NULL DEFAULT 'POSTED',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_returns_org_no (org_id, return_no),
  KEY idx_returns_invoice (invoice_id),
  CONSTRAINT fk_returns_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_returns_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_returns_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  CONSTRAINT fk_returns_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS return_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  return_id BIGINT UNSIGNED NOT NULL,
  invoice_item_id BIGINT UNSIGNED NULL,
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

CREATE TABLE IF NOT EXISTS return_refunds (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  return_id BIGINT UNSIGNED NOT NULL,
  mode ENUM('CASH','UPI','CARD') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  ref_no VARCHAR(80) NULL,
  paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rr_return (return_id),
  CONSTRAINT fk_rr_return FOREIGN KEY (return_id) REFERENCES `returns`(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Optional permission seed for customer ledger write
INSERT INTO permissions (perm_key, name)
VALUES ('CUSTOMER_LEDGER_WRITE', 'Write customer ledger and dues settlements')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.perm_key='CUSTOMER_LEDGER_WRITE'
WHERE r.role_key IN ('ADMIN', 'OWNER');
-- Milestone 2: Returns/Refunds + Credit Billing + Customer Ledger
-- Safe for existing DB (idempotent)

SET @db_name := DATABASE();

CREATE TABLE IF NOT EXISTS customer_ledger (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  ref_type VARCHAR(40) NOT NULL,
  ref_id BIGINT UNSIGNED NULL,
  debit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  credit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  notes VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cl_org_customer (org_id, customer_id, created_at),
  KEY idx_cl_branch (branch_id),
  CONSTRAINT fk_cl_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_cl_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_cl_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_cl_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS customer_payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  mode ENUM('CASH','UPI','CARD') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  ref_no VARCHAR(80) NULL,
  notes VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cp_org_customer (org_id, customer_id, created_at),
  CONSTRAINT fk_cp_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_cp_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_cp_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_cp_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `returns` (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  invoice_id BIGINT UNSIGNED NOT NULL,
  return_no VARCHAR(60) NOT NULL,
  reason VARCHAR(255) NULL,
  status ENUM('POSTED','VOID') NOT NULL DEFAULT 'POSTED',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_returns_org_no (org_id, return_no),
  KEY idx_returns_invoice (invoice_id),
  CONSTRAINT fk_returns_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_returns_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_returns_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  CONSTRAINT fk_returns_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS return_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  return_id BIGINT UNSIGNED NOT NULL,
  invoice_item_id BIGINT UNSIGNED NULL,
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

CREATE TABLE IF NOT EXISTS return_refunds (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  return_id BIGINT UNSIGNED NOT NULL,
  mode ENUM('CASH','UPI','CARD') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  ref_no VARCHAR(80) NULL,
  paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rr_return (return_id),
  CONSTRAINT fk_rr_return FOREIGN KEY (return_id) REFERENCES `returns`(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Optional permission seed for customer ledger write
INSERT INTO permissions (perm_key, name)
VALUES ('CUSTOMER_LEDGER_WRITE', 'Write customer ledger and dues settlements')
ON DUPLICATE KEY UPDATE name=VALUES(name);

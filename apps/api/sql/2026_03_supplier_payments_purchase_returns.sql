-- Milestone 5: Supplier payments + purchase returns
-- Idempotent migration

CREATE TABLE IF NOT EXISTS supplier_payments (
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
  KEY idx_sp_org_supplier (org_id, supplier_id, paid_at),
  CONSTRAINT fk_sp_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_sp_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_sp_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  CONSTRAINT fk_sp_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS purchase_returns (
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
  CONSTRAINT fk_pr_org_m5 FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_pr_branch_m5 FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_pr_purchase_m5 FOREIGN KEY (purchase_id) REFERENCES purchase_invoices(id),
  CONSTRAINT fk_pr_user_m5 FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS purchase_return_items (
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
  KEY idx_pri_batch (batch_id),
  CONSTRAINT fk_pri_return FOREIGN KEY (purchase_return_id) REFERENCES purchase_returns(id) ON DELETE CASCADE,
  CONSTRAINT fk_pri_item FOREIGN KEY (purchase_item_id) REFERENCES purchase_items(id),
  CONSTRAINT fk_pri_batch FOREIGN KEY (batch_id) REFERENCES batches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Ensure stock movement enum supports PURCHASE_RETURN
SET @db_name := DATABASE();
SET @sm_table_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='stock_movements'
);
SET @sql := IF(
  @sm_table_exists = 1,
  "ALTER TABLE stock_movements MODIFY COLUMN move_type ENUM('PURCHASE','SALE','TRANSFER_OUT','TRANSFER_IN','RETURN_IN','RETURN_OUT','ADJUST','PURCHASE_RETURN') NOT NULL",
  'SELECT "stock_movements missing"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO permissions (perm_key, name) VALUES
('PURCHASE_RETURN', 'Create purchase returns'),
('SUPPLIER_PAYMENT_WRITE', 'Create supplier payments')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.perm_key IN ('PURCHASE_RETURN','SUPPLIER_PAYMENT_WRITE')
WHERE r.role_key IN ('ADMIN', 'OWNER', 'STORE_MANAGER');

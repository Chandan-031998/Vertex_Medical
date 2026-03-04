-- Milestone 3: Store Manager workflows (transfers, dead stock, blocked batches)
-- Idempotent migration

SET @db_name := DATABASE();

-- batches.is_blocked (MySQL-safe conditional alter)
SET @batches_block_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='batches' AND COLUMN_NAME='is_blocked'
);
SET @sql := IF(
  @batches_block_exists = 0,
  'ALTER TABLE batches ADD COLUMN is_blocked TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT "batches.is_blocked exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS inventory_transfers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  from_branch_id BIGINT UNSIGNED NOT NULL,
  to_branch_id BIGINT UNSIGNED NOT NULL,
  transfer_no VARCHAR(60) NOT NULL,
  note VARCHAR(255) NULL,
  status ENUM('POSTED','VOID') NOT NULL DEFAULT 'POSTED',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_it_org_no (org_id, transfer_no),
  KEY idx_it_org_created (org_id, created_at),
  CONSTRAINT fk_it_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_it_from_branch FOREIGN KEY (from_branch_id) REFERENCES branches(id),
  CONSTRAINT fk_it_to_branch FOREIGN KEY (to_branch_id) REFERENCES branches(id),
  CONSTRAINT fk_it_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS inventory_transfer_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  transfer_id BIGINT UNSIGNED NOT NULL,
  batch_id BIGINT UNSIGNED NOT NULL,
  qty INT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_iti_transfer (transfer_id),
  KEY idx_iti_batch (batch_id),
  CONSTRAINT fk_iti_transfer FOREIGN KEY (transfer_id) REFERENCES inventory_transfers(id) ON DELETE CASCADE,
  CONSTRAINT fk_iti_batch FOREIGN KEY (batch_id) REFERENCES batches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS dead_stock_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  branch_id BIGINT UNSIGNED NOT NULL,
  batch_id BIGINT UNSIGNED NOT NULL,
  qty INT NOT NULL,
  reason VARCHAR(255) NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dsr_org_created (org_id, created_at),
  CONSTRAINT fk_dsr_org FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_dsr_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_dsr_batch FOREIGN KEY (batch_id) REFERENCES batches(id),
  CONSTRAINT fk_dsr_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

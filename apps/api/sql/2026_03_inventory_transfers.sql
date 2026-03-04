-- Inventory transfers storage (idempotent)

CREATE TABLE IF NOT EXISTS inventory_transfers (
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
  UNIQUE KEY uk_it_org_no (org_id, transfer_no),
  KEY idx_it_org_created (org_id, created_at),
  KEY idx_it_from_branch (from_branch_id),
  KEY idx_it_to_branch (to_branch_id),
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

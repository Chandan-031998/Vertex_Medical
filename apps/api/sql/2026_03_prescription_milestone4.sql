-- Milestone 4: Prescription management + link to invoice
-- Idempotent migration

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
  KEY idx_pr_org_branch (org_id, branch_id),
  CONSTRAINT fk_pr_org_m4 FOREIGN KEY (org_id) REFERENCES orgs(id),
  CONSTRAINT fk_pr_branch_m4 FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_pr_customer_m4 FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_pr_user_m4 FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS prescription_files (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  prescription_id BIGINT UNSIGNED NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT UNSIGNED NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pf_pr (prescription_id),
  CONSTRAINT fk_pf_pr_m4 FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS invoice_prescriptions (
  invoice_id BIGINT UNSIGNED NOT NULL,
  prescription_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (invoice_id, prescription_id),
  CONSTRAINT fk_ip_inv_m4 FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_ip_pr_m4 FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO permissions (perm_key, name) VALUES
('PRESCRIPTION_READ', 'View prescriptions'),
('PRESCRIPTION_WRITE', 'Upload/link prescriptions')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.perm_key IN ('PRESCRIPTION_READ', 'PRESCRIPTION_WRITE')
WHERE r.role_key IN ('ADMIN', 'OWNER', 'PHARMACIST');

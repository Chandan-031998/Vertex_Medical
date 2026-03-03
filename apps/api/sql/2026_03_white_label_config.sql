-- 2026-03 White Label + Dynamic ERP Configuration + Granular RBAC migration
-- Safe for existing databases: no DROP statements.
-- Import in phpMyAdmin after selecting the target database.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------
-- RBAC hardening
-- --------------------------------------------------

-- Ensure permissions table exists and perm_key is unique.
CREATE TABLE IF NOT EXISTS permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  perm_key VARCHAR(80) NOT NULL,
  name VARCHAR(150) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_perm_key (perm_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- De-duplicate perm_key rows before adding unique index (for legacy databases).
DELETE p1
FROM permissions p1
JOIN permissions p2
  ON p1.perm_key = p2.perm_key
 AND p1.id > p2.id;

CREATE UNIQUE INDEX IF NOT EXISTS uk_perm_key ON permissions (perm_key);

-- Keep role_permissions consistent with existing schema (role_id + permission_id mapping).
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  KEY idx_rp_permission_id (permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- JWT invalidation support.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0;

-- Role metadata improvements.
ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS description VARCHAR(255) NULL;

-- If token_version exists with a different default, normalize to 0.
ALTER TABLE users
  ALTER COLUMN token_version SET DEFAULT 0;

-- --------------------------------------------------
-- Configuration / white-label / dynamic ERP tables
-- --------------------------------------------------

CREATE TABLE IF NOT EXISTS org_settings (
  org_id BIGINT UNSIGNED NOT NULL,
  setting_key VARCHAR(120) NOT NULL,
  setting_value_json JSON NOT NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (org_id, setting_key),
  KEY idx_org_settings_updated_by (updated_by)
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
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (org_id)
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
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (org_id, module_key),
  KEY idx_org_modules_module (module_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS number_series (
  org_id BIGINT UNSIGNED NOT NULL,
  series_key VARCHAR(40) NOT NULL,
  prefix VARCHAR(40) NOT NULL,
  next_no BIGINT UNSIGNED NOT NULL DEFAULT 1,
  padding INT UNSIGNED NOT NULL DEFAULT 6,
  reset_rule ENUM('NEVER','DAILY','MONTHLY','YEARLY') NOT NULL DEFAULT 'YEARLY',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (org_id, series_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS invoice_templates (
  org_id BIGINT UNSIGNED NOT NULL,
  template_key VARCHAR(40) NOT NULL,
  template_json JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (org_id, template_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS approval_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  rule_key VARCHAR(80) NOT NULL,
  conditions_json JSON NOT NULL,
  approver_role_id BIGINT UNSIGNED NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_approval_rules_org_key (org_id, rule_key),
  KEY idx_approval_rules_approver_role (approver_role_id)
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
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_approvals_org_status (org_id, status),
  KEY idx_approvals_request (request_type, request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS custom_fields (
  org_id BIGINT UNSIGNED NOT NULL,
  entity VARCHAR(80) NOT NULL,
  field_key VARCHAR(80) NOT NULL,
  label VARCHAR(120) NOT NULL,
  type ENUM('TEXT','NUMBER','DATE','DATETIME','BOOLEAN','SELECT','MULTISELECT','JSON') NOT NULL DEFAULT 'TEXT',
  required TINYINT(1) NOT NULL DEFAULT 0,
  options_json JSON NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (org_id, entity, field_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS custom_field_values (
  org_id BIGINT UNSIGNED NOT NULL,
  entity VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED NOT NULL,
  field_key VARCHAR(80) NOT NULL,
  value_json JSON NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (org_id, entity, entity_id, field_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS integrations (
  org_id BIGINT UNSIGNED NOT NULL,
  provider_key VARCHAR(80) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  config_json JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (org_id, provider_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notification_templates (
  org_id BIGINT UNSIGNED NOT NULL,
  channel ENUM('SMS','WHATSAPP','EMAIL','PUSH') NOT NULL,
  event_key VARCHAR(80) NOT NULL,
  template TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (org_id, channel, event_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- audit_logs table required for compliance/enterprise audit trails
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(80) NOT NULL,
  entity VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  before_json JSON NULL,
  after_json JSON NULL,
  ip VARCHAR(80) NULL,
  ua VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_org_created (org_id, created_at),
  KEY idx_audit_entity (entity, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- For databases that already have audit_logs but use user_agent instead of ua.
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS ua VARCHAR(255) NULL;

-- --------------------------------------------------
-- Foreign keys (add only when parent tables exist)
-- --------------------------------------------------

-- NOTE: If your DB already has these foreign keys under different names, skip this section.
-- Some MySQL versions do not support IF NOT EXISTS for ADD CONSTRAINT.

-- --------------------------------------------------
-- Seeds: modules
-- --------------------------------------------------

INSERT INTO modules (module_key, name, sort_order, is_core) VALUES
('INVENTORY',   'Inventory',    10, 1),
('BILLING_POS', 'Billing POS',  20, 1),
('PURCHASES',   'Purchases',    30, 0),
('CUSTOMERS',   'Customers',    40, 1),
('REPORTS',     'Reports',      50, 0),
('COMPLIANCE',  'Compliance',   60, 0),
('ACCOUNTING',  'Accounting',   70, 0),
('INTEGRATIONS','Integrations', 80, 0)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  sort_order = VALUES(sort_order),
  is_core = VALUES(is_core);

-- --------------------------------------------------
-- Seeds: granular pharmacy ERP permissions
-- --------------------------------------------------

INSERT INTO permissions (perm_key, name) VALUES
('BRANCH_READ', 'View branches'),
('BRANCH_WRITE', 'Create/update branches'),
('ROLE_READ', 'View roles'),
('ROLE_WRITE', 'Create/update roles and role permissions'),
('PERMISSION_READ', 'View permissions'),

('BILLING_RETURN', 'Create billing returns'),
('BILLING_REFUND', 'Process billing refunds'),
('BILLING_DISCOUNT_OVERRIDE', 'Override billing discount'),
('BILLING_PRICE_OVERRIDE', 'Override billing price'),
('BILLING_EXPORT', 'Export billing data'),

('STOCK_TRANSFER_CREATE', 'Create stock transfer'),
('STOCK_TRANSFER_APPROVE', 'Approve stock transfer'),
('STOCK_ADJUST_CREATE', 'Create stock adjustment'),
('STOCK_ADJUST_APPROVE', 'Approve stock adjustment'),
('NEAR_EXPIRY_VIEW', 'View near-expiry stock'),
('DEAD_STOCK_VIEW', 'View dead stock'),

('REPORTS_EXPORT', 'Export reports'),
('GST_EXPORT', 'Export GST reports'),
('TALLY_EXPORT', 'Export Tally reports'),

('SCHEDULE_H1_VIEW', 'View schedule H1 register'),
('SCHEDULE_H1_WRITE', 'Write schedule H1 register'),
('AUDIT_LOG_VIEW', 'View audit logs'),

('SETTINGS_READ', 'View org settings'),
('SETTINGS_WRITE', 'Update org settings')
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

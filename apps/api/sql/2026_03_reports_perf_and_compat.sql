-- Vertex Medical Manager
-- Reports performance + compatibility migration (idempotent)
-- Safe to run multiple times in phpMyAdmin

SET NAMES utf8mb4;

-- invoices
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'invoices'
        AND index_name = 'idx_invoices_org_branch_date_status'
    ),
    'SELECT 1',
    'CREATE INDEX idx_invoices_org_branch_date_status ON invoices (org_id, branch_id, invoice_date, status, id)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'invoices'
        AND index_name = 'idx_invoices_org_branch_created'
    ),
    'SELECT 1',
    'CREATE INDEX idx_invoices_org_branch_created ON invoices (org_id, branch_id, created_at, id)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'invoices'
        AND index_name = 'idx_invoices_invoice_no'
    ),
    'SELECT 1',
    'CREATE INDEX idx_invoices_invoice_no ON invoices (invoice_no)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- invoice_items
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'invoice_items'
        AND index_name = 'idx_invoice_items_invoice'
    ),
    'SELECT 1',
    'CREATE INDEX idx_invoice_items_invoice ON invoice_items (invoice_id)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'invoice_items'
        AND index_name = 'idx_invoice_items_invoice_medicine_gst'
    ),
    'SELECT 1',
    'CREATE INDEX idx_invoice_items_invoice_medicine_gst ON invoice_items (invoice_id, medicine_id, gst_rate)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'invoice_items'
        AND index_name = 'idx_invoice_items_medicine'
    ),
    'SELECT 1',
    'CREATE INDEX idx_invoice_items_medicine ON invoice_items (medicine_id)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- payments
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'payments'
        AND index_name = 'idx_payments_invoice_paidat'
    ),
    'SELECT 1',
    'CREATE INDEX idx_payments_invoice_paidat ON payments (invoice_id, paid_at)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'payments'
        AND index_name = 'idx_payments_invoice_mode'
    ),
    'SELECT 1',
    'CREATE INDEX idx_payments_invoice_mode ON payments (invoice_id, mode)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- stock / batches / medicines
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'stock'
        AND index_name = 'idx_stock_org_branch_batch_qty'
    ),
    'SELECT 1',
    'CREATE INDEX idx_stock_org_branch_batch_qty ON stock (org_id, branch_id, batch_id, qty)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'batches'
        AND index_name = 'idx_batches_org_medicine_expiry'
    ),
    'SELECT 1',
    'CREATE INDEX idx_batches_org_medicine_expiry ON batches (org_id, medicine_id, expiry_date)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'medicines'
        AND index_name = 'idx_medicines_org_name'
    ),
    'SELECT 1',
    'CREATE INDEX idx_medicines_org_name ON medicines (org_id, name)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- purchase reporting (for gst purchase / summary)
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'purchase_invoices'
        AND index_name = 'idx_purchase_invoices_org_branch_date_status'
    ),
    'SELECT 1',
    'CREATE INDEX idx_purchase_invoices_org_branch_date_status ON purchase_invoices (org_id, branch_id, invoice_date, status, id)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'purchase_items'
        AND index_name = 'idx_purchase_items_invoice_gst'
    ),
    'SELECT 1',
    'CREATE INDEX idx_purchase_items_invoice_gst ON purchase_items (purchase_invoice_id, gst_rate)'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* ═══════════════════════════════════════════════════════════════════
   019_customers_soft_delete.sql

   Adds deleted_at to the customers table so the admin cleanup tool
   can soft-delete customer records (and everything linked to them)
   without permanent data loss.

   Also adds deleted_at to handoffs, which also lacked it.
   ═══════════════════════════════════════════════════════════════════ */

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE handoffs
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_customers_deleted
  ON customers(deleted_at) WHERE deleted_at IS NULL;

INSERT INTO audit_log (action, entity_type, detail)
VALUES (
  'system.migration_applied',
  'schema',
  jsonb_build_object(
    'migration', '019_customers_soft_delete',
    'note',      'deleted_at added to customers and handoffs',
    'applied_at', NOW()
  )
);

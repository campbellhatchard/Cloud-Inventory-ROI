/* v6.9.2: explicit active/inactive customer lifecycle for Solution Fit discovery. */
ALTER TABLE customers ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_status_check;
ALTER TABLE customers ADD CONSTRAINT customers_status_check CHECK(status IN ('active','inactive'));
CREATE INDEX IF NOT EXISTS idx_customers_active_solution_fit ON customers(LOWER(name)) WHERE deleted_at IS NULL AND status='active';

INSERT INTO audit_log(action,entity_type,detail)
VALUES('system.migration_applied','schema',jsonb_build_object('migration','036_solution_fit_cross_account','note','Adds explicit active customer lifecycle for isolated Solution Fit discovery','applied_at',NOW()));

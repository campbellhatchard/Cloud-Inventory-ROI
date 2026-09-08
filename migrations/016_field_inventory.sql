/* ═══════════════════════════════════════════════════════════════════
   016_field_inventory.sql

   Adds a has_field_inventory flag to the customers table.
   Default FALSE — field inventory is opt-in, not shown by default.

   Also adds it to discovery_sessions so the prospect link knows
   whether to show the field inventory question section without
   requiring a live JOIN back to the customer record at every page load.
   The flag is stamped onto the session when the link is created.

   Telecom, construction, and contractor-heavy industries are the
   primary use cases (fiber on contractor sites, job-site storage,
   van/truck stock). The rep sets this once per customer.
   ═══════════════════════════════════════════════════════════════════ */

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS has_field_inventory BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE discovery_sessions
  ADD COLUMN IF NOT EXISTS has_field_inventory BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN customers.has_field_inventory IS
  'True when this customer holds inventory outside a fixed warehouse '
  '(trucks, vans, contractor sites, job-site storage, network nodes). '
  'Controls whether field inventory ROI levers appear in the calculator '
  'and whether the field inventory question section appears in the '
  'prospect discovery link.';

COMMENT ON COLUMN discovery_sessions.has_field_inventory IS
  'Stamped from customers.has_field_inventory at link-creation time. '
  'Immutable for the life of the link so the prospect page does not '
  'need a live DB join.';

INSERT INTO audit_log (action, entity_type, detail)
VALUES (
  'system.migration_applied',
  'schema',
  jsonb_build_object(
    'migration', '016_field_inventory',
    'note', 'has_field_inventory flag on customers + discovery_sessions',
    'applied_at', NOW()
  )
);

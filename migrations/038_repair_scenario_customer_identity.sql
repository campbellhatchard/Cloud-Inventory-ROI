-- v6.9.25 — repair scenario/customer ownership identity.
-- A historical admin-on-behalf save could preserve the scenario owner while
-- linking the new version to a same-named customer owned by the admin. Create
-- the canonical owner/name customer when needed and relink affected scenarios.

INSERT INTO customers (name, owner_id, created_at, updated_at)
SELECT DISTINCT TRIM(s.company), s.owner_id, NOW(), NOW()
  FROM scenarios s
 WHERE s.deleted_at IS NULL
   AND s.owner_id IS NOT NULL
   AND NULLIF(TRIM(s.company), '') IS NOT NULL
ON CONFLICT (owner_id, LOWER(name)) DO NOTHING;

UPDATE scenarios s
   SET customer_id = canonical.id
  FROM customers canonical
 WHERE s.deleted_at IS NULL
   AND canonical.owner_id = s.owner_id
   AND LOWER(canonical.name) = LOWER(TRIM(s.company))
   AND s.customer_id IS DISTINCT FROM canonical.id;

COMMENT ON COLUMN scenarios.customer_id IS
  'Stable first-class customer identity; the customer owner must match the scenario owner.';

/* v6.9.35 — transactional Customer ownership reassignment.
   The Customer and selected operational owner copies move together. Historical
   actors, immutable evidence, publication ownership and audit rows do not. */

CREATE TABLE IF NOT EXISTS customer_ownership_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  old_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  old_owner_name TEXT NOT NULL,
  new_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  new_owner_name TEXT NOT NULL,
  admin_actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (BTRIM(reason) <> ''),
  affected_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (old_owner_id <> new_owner_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_ownership_transfers_customer
  ON customer_ownership_transfers(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_ownership_transfers_owners
  ON customer_ownership_transfers(old_owner_id, new_owner_id, created_at DESC);

CREATE OR REPLACE FUNCTION reject_customer_ownership_transfer_change()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'customer ownership transfer history is immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS immutable_customer_ownership_transfers
  ON customer_ownership_transfers;
CREATE TRIGGER immutable_customer_ownership_transfers
  BEFORE UPDATE OR DELETE ON customer_ownership_transfers
  FOR EACH ROW EXECUTE FUNCTION reject_customer_ownership_transfer_change();

/* owner_id is operational scope on these legacy tables. Reassignment must not
   make historical business content appear newly edited, so an owner-only update
   retains the prior updated_at timestamp. All content changes still advance it. */
CREATE OR REPLACE FUNCTION set_updated_at_unless_owner_only()
RETURNS trigger AS $$
BEGIN
  IF (to_jsonb(NEW) - 'owner_id' - 'updated_at')
       IS NOT DISTINCT FROM
     (to_jsonb(OLD) - 'owner_id' - 'updated_at') THEN
    NEW.updated_at = OLD.updated_at;
  ELSE
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scenarios_updated_at ON scenarios;
CREATE TRIGGER trg_scenarios_updated_at
  BEFORE UPDATE ON scenarios FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_unless_owner_only();

DROP TRIGGER IF EXISTS trg_discovery_sessions_updated_at ON discovery_sessions;
CREATE TRIGGER trg_discovery_sessions_updated_at
  BEFORE UPDATE ON discovery_sessions FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_unless_owner_only();

DROP TRIGGER IF EXISTS trg_maps_updated ON mutual_action_plans;
CREATE TRIGGER trg_maps_updated
  BEFORE UPDATE ON mutual_action_plans FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_unless_owner_only();

DROP TRIGGER IF EXISTS trg_stake_updated ON stakeholders;
CREATE TRIGGER trg_stake_updated
  BEFORE UPDATE ON stakeholders FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_unless_owner_only();

INSERT INTO audit_log(action, entity_type, detail)
VALUES(
  'system.migration_applied',
  'schema',
  jsonb_build_object(
    'migration', '043_customer_ownership_transfer',
    'note', 'Immutable transactional Customer ownership transfer history',
    'applied_at', NOW()
  )
);

-- Preserve scenario content timestamps during administrative ownership
-- reassignment and current-version pointer maintenance. Those operations
-- change access or version metadata, not the historical business-case content
-- represented by scenarios.updated_at.
--
-- The setting is transaction-local and is enabled only around the governed
-- governed non-content updates. All normal row updates retain the original
-- automatic updated_at behavior.
CREATE OR REPLACE FUNCTION set_updated_at_unless_owner_only()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(current_setting('cloud_inventory.preserve_updated_at', TRUE), 'off') = 'on'
     OR (to_jsonb(NEW) - 'owner_id' - 'updated_at')
          IS NOT DISTINCT FROM
        (to_jsonb(OLD) - 'owner_id' - 'updated_at') THEN
    NEW.updated_at = OLD.updated_at;
  ELSE
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


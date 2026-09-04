-- Frozen customer-safe publications. Legacy rows intentionally remain unpublished.
ALTER TABLE business_case_shares ADD COLUMN IF NOT EXISTS published_payload JSONB;
ALTER TABLE business_case_shares ADD COLUMN IF NOT EXISTS scenario_version INTEGER;
ALTER TABLE business_case_shares ADD COLUMN IF NOT EXISTS story_revision TEXT;
ALTER TABLE business_case_shares ADD COLUMN IF NOT EXISTS model_version INTEGER;
ALTER TABLE business_case_shares ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE business_case_shares ADD COLUMN IF NOT EXISTS output_readiness TEXT;
ALTER TABLE business_case_shares ADD COLUMN IF NOT EXISTS review_acknowledged BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE business_case_shares ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
CREATE OR REPLACE FUNCTION protect_published_business_case() RETURNS trigger AS $$
BEGIN
 IF OLD.published_payload IS NOT NULL AND ROW(NEW.published_payload,NEW.scenario_id,NEW.scenario_base_id,NEW.scenario_version,NEW.story_revision,NEW.model_version,NEW.currency,NEW.output_readiness,NEW.owner_id,NEW.published_at,NEW.review_acknowledged,NEW.token) IS DISTINCT FROM ROW(OLD.published_payload,OLD.scenario_id,OLD.scenario_base_id,OLD.scenario_version,OLD.story_revision,OLD.model_version,OLD.currency,OLD.output_readiness,OLD.owner_id,OLD.published_at,OLD.review_acknowledged,OLD.token) THEN
  RAISE EXCEPTION 'Published business case content is immutable';
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS immutable_business_case_publication ON business_case_shares;
CREATE TRIGGER immutable_business_case_publication BEFORE UPDATE ON business_case_shares FOR EACH ROW EXECUTE FUNCTION protect_published_business_case();

/* v6.6.2 — persistent, governed Competitive Intelligence. ROI Model remains v2.8. */
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS competitive_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  website_domain TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','retired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competitive_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES competitive_companies(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  subject_type TEXT NOT NULL DEFAULT 'competitive_product' CHECK(subject_type IN ('competitive_product','status_quo','category')),
  category TEXT NOT NULL DEFAULT 'Other',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','retired')),
  primary_website TEXT,
  relevant_ci_products TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_researched_at TIMESTAMPTZ, last_verified_at TIMESTAMPTZ,
  merged_into_id UUID REFERENCES competitive_products(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS competitive_product_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID NOT NULL REFERENCES competitive_products(id) ON DELETE CASCADE,
  alias_name TEXT NOT NULL, normalized_alias TEXT NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS competitive_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID REFERENCES competitive_products(id) ON DELETE CASCADE,
  ci_product_key TEXT, source_type TEXT NOT NULL CHECK(source_type IN ('official_website','official_documentation','datasheet','analyst','uploaded_document','other')),
  source_name TEXT NOT NULL, source_url TEXT, website_domain TEXT, content_text TEXT,
  source_status TEXT NOT NULL DEFAULT 'proposed' CHECK(source_status IN ('proposed','approved','rejected','retired')),
  is_canonical BOOLEAN NOT NULL DEFAULT FALSE, retrieved_at TIMESTAMPTZ, last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CHECK ((product_id IS NOT NULL) <> (ci_product_key IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS competitive_research_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID NOT NULL REFERENCES competitive_products(id) ON DELETE RESTRICT,
  ci_product_key TEXT NOT NULL, opportunity_base_id UUID, requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  version INTEGER NOT NULL, started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ,
  research_model TEXT, source_ids UUID[] NOT NULL DEFAULT '{}', research_status TEXT NOT NULL DEFAULT 'running' CHECK(research_status IN ('running','completed','failed','insufficient_source')),
  result_json JSONB NOT NULL DEFAULT '{}', change_summary JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id,ci_product_key,version)
);

CREATE TABLE IF NOT EXISTS competitive_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID NOT NULL REFERENCES competitive_products(id) ON DELETE RESTRICT,
  research_run_id UUID NOT NULL REFERENCES competitive_research_runs(id) ON DELETE RESTRICT,
  category TEXT NOT NULL CHECK(category IN ('Deployment','Architecture','Mobile','Offline','ERP Compatibility','Integration','Inventory Execution','Warehouse','Field Inventory','Low-Code / Configuration','Security','Pricing','Implementation','Services','Support')),
  claim TEXT NOT NULL, confidence TEXT NOT NULL CHECK(confidence IN ('high','medium','inferred')),
  source_id UUID REFERENCES competitive_sources(id) ON DELETE SET NULL, source_locator TEXT, support_type TEXT NOT NULL DEFAULT 'direct' CHECK(support_type IN ('direct','inferred','conflicting')),
  change_type TEXT NOT NULL DEFAULT 'new' CHECK(change_type IN ('new','changed','unchanged','no_longer_found','conflicting')),
  status TEXT NOT NULL DEFAULT 'researched' CHECK(status IN ('researched','proposed','approved','rejected','retired')),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL, approved_at TIMESTAMPTZ, last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competitive_battlecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID NOT NULL REFERENCES competitive_products(id) ON DELETE RESTRICT,
  ci_product_key TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','current','refresh_recommended','retired')),
  current_revision_id UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id,ci_product_key)
);

CREATE TABLE IF NOT EXISTS competitive_battlecard_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), battlecard_id UUID NOT NULL REFERENCES competitive_battlecards(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL, finding_ids UUID[] NOT NULL DEFAULT '{}', content_json JSONB NOT NULL DEFAULT '{}',
  published_by UUID REFERENCES users(id) ON DELETE SET NULL, published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(battlecard_id,version)
);
DO $$ BEGIN ALTER TABLE competitive_battlecards ADD CONSTRAINT competitive_battlecards_current_revision_fk FOREIGN KEY(current_revision_id) REFERENCES competitive_battlecard_revisions(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS competitive_opportunity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), opportunity_base_id UUID NOT NULL, product_id UUID NOT NULL REFERENCES competitive_products(id) ON DELETE RESTRICT,
  ci_product_key TEXT NOT NULL, first_added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by UUID REFERENCES users(id) ON DELETE SET NULL, status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','removed')),
  UNIQUE(opportunity_base_id,product_id,ci_product_key)
);

CREATE TABLE IF NOT EXISTS competitive_recent_products (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, product_id UUID NOT NULL REFERENCES competitive_products(id) ON DELETE CASCADE,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id,product_id)
);

CREATE TABLE IF NOT EXISTS competitive_legacy_claim_review (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), legacy_key TEXT NOT NULL, legacy_subject TEXT NOT NULL, claim_json JSONB NOT NULL,
  review_reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'requires_attribution', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ci_product_sources ADD COLUMN IF NOT EXISTS ci_product_key TEXT NOT NULL DEFAULT 'cip';
ALTER TABLE competitive_research_cache ADD COLUMN IF NOT EXISTS competitive_product_id UUID REFERENCES competitive_products(id) ON DELETE SET NULL;
ALTER TABLE competitive_research_cache ADD COLUMN IF NOT EXISTS research_run_id UUID REFERENCES competitive_research_runs(id) ON DELETE SET NULL;
/* Link only unambiguous exact historical identities. Combined/category keys remain in the attribution queue. */
UPDATE competitive_research_cache c SET competitive_product_id=p.id
FROM competitive_products p
WHERE c.competitive_product_id IS NULL AND p.normalized_name=lower(regexp_replace(trim(COALESCE(c.competitor_name,'')),'[^a-zA-Z0-9]+',' ','g'));
CREATE UNIQUE INDEX IF NOT EXISTS idx_comp_product_name ON competitive_products(normalized_name);
CREATE INDEX IF NOT EXISTS idx_comp_runs_product ON competitive_research_runs(product_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comp_findings_review ON competitive_findings(status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comp_links_opportunity ON competitive_opportunity_links(opportunity_base_id,last_used_at DESC);

INSERT INTO competitive_companies(company_name,normalized_name,website_domain) VALUES
 ('RFgen Software','rfgen software','rfgen.com'),('RF-SMART','rf-smart','rfsmart.com'),('Microsoft','microsoft','microsoft.com'),
 ('Mendix','mendix','mendix.com'),('Appian','appian','appian.com'),('Deposco','deposco','deposco.com'),
 ('Infios','infios','infios.com'),('Fishbowl','fishbowl','fishbowlinventory.com'),('Cin7','cin7','cin7.com')
ON CONFLICT(normalized_name) DO NOTHING;

INSERT INTO competitive_products(company_id,product_name,normalized_name,category,status,primary_website,relevant_ci_products) SELECT id,'RFgen','rfgen','ERP Mobility','active','https://www.rfgen.com/',ARRAY['mep'] FROM competitive_companies WHERE normalized_name='rfgen software' ON CONFLICT(normalized_name) DO NOTHING;
INSERT INTO competitive_products(company_id,product_name,normalized_name,category,status,primary_website,relevant_ci_products) SELECT id,'RF-SMART','rf-smart','ERP Mobility','active','https://www.rfsmart.com/',ARRAY['mep'] FROM competitive_companies WHERE normalized_name='rf-smart' ON CONFLICT(normalized_name) DO NOTHING;
INSERT INTO competitive_products(company_id,product_name,normalized_name,category,status,primary_website,relevant_ci_products) SELECT id,'Microsoft Power Apps','microsoft power apps','Low-Code / Configuration','active','https://www.microsoft.com/power-platform/products/power-apps',ARRAY['mep'] FROM competitive_companies WHERE normalized_name='microsoft' ON CONFLICT(normalized_name) DO NOTHING;
INSERT INTO competitive_products(company_id,product_name,normalized_name,category,status,primary_website,relevant_ci_products) SELECT id,'Mendix','mendix','Low-Code / Configuration','active','https://www.mendix.com/',ARRAY['mep'] FROM competitive_companies WHERE normalized_name='mendix' ON CONFLICT(normalized_name) DO NOTHING;
INSERT INTO competitive_products(company_id,product_name,normalized_name,category,status,primary_website,relevant_ci_products) SELECT id,'Appian','appian','Low-Code / Configuration','active','https://appian.com/',ARRAY['mep'] FROM competitive_companies WHERE normalized_name='appian' ON CONFLICT(normalized_name) DO NOTHING;
INSERT INTO competitive_products(company_id,product_name,normalized_name,category,status,primary_website,relevant_ci_products) SELECT id,'Deposco','deposco','Warehouse','active','https://deposco.com/',ARRAY['cip'] FROM competitive_companies WHERE normalized_name='deposco' ON CONFLICT(normalized_name) DO NOTHING;
INSERT INTO competitive_products(company_id,product_name,normalized_name,category,status,primary_website,relevant_ci_products) SELECT id,'Infios','infios','Warehouse','active','https://www.infios.com/',ARRAY['cip'] FROM competitive_companies WHERE normalized_name='infios' ON CONFLICT(normalized_name) DO NOTHING;
INSERT INTO competitive_products(company_id,product_name,normalized_name,category,status,primary_website,relevant_ci_products) SELECT id,'Fishbowl Inventory','fishbowl inventory','Warehouse','active','https://www.fishbowlinventory.com/',ARRAY['cip'] FROM competitive_companies WHERE normalized_name='fishbowl' ON CONFLICT(normalized_name) DO NOTHING;
INSERT INTO competitive_products(company_id,product_name,normalized_name,category,status,primary_website,relevant_ci_products) SELECT id,'Cin7','cin7','Warehouse','active','https://www.cin7.com/',ARRAY['cip'] FROM competitive_companies WHERE normalized_name='cin7' ON CONFLICT(normalized_name) DO NOTHING;

INSERT INTO competitive_products(product_name,normalized_name,subject_type,category,status,relevant_ci_products) VALUES
 ('Spreadsheets / Manual','spreadsheets manual','status_quo','Status Quo','active',ARRAY['cip','mep','epp']),
 ('Legacy RF / Paper-based','legacy rf paper based','status_quo','Status Quo','active',ARRAY['cip','mep']),
 ('ERP-Native Module','erp native module','status_quo','Status Quo','active',ARRAY['cip','mep']),
 ('Other WMS','other wms','category','Category','active',ARRAY['cip'])
ON CONFLICT(normalized_name) DO NOTHING;

INSERT INTO competitive_product_aliases(product_id,alias_name,normalized_alias) SELECT id,'RF Gen','rf gen' FROM competitive_products WHERE normalized_name='rfgen' ON CONFLICT(normalized_alias) DO NOTHING;
INSERT INTO competitive_legacy_claim_review(legacy_key,legacy_subject,claim_json,review_reason)
SELECT 'mep_rfgen','Legacy combined mobility record',jsonb_build_object('source','public/industry-data.js','classification','Legacy curated content'),'Legacy combined claim — requires product attribution'
WHERE NOT EXISTS(SELECT 1 FROM competitive_legacy_claim_review WHERE legacy_key='mep_rfgen');

INSERT INTO audit_log(action,entity_type,detail) VALUES('system.migration_applied','schema',jsonb_build_object('migration','032_competitive_intelligence','note','v6.6.2 governed Competitive Intelligence model; distinct products, immutable research, approval, revisions and opportunity memory','applied_at',NOW()));

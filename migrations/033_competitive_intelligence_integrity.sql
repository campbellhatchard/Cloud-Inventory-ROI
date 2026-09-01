/* v6.6.3 — Competitive Intelligence security and migration integrity. */
CREATE TABLE IF NOT EXISTS competitive_legacy_key_map (
  legacy_key TEXT PRIMARY KEY,
  product_id UUID REFERENCES competitive_products(id) ON DELETE RESTRICT,
  resolution_status TEXT NOT NULL CHECK(resolution_status IN ('resolved','ambiguous','retired')),
  display_label TEXT NOT NULL,
  resolution_options JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE competitive_battlecard_revisions ADD COLUMN IF NOT EXISTS origin_product_id UUID REFERENCES competitive_products(id) ON DELETE SET NULL;
ALTER TABLE competitive_battlecard_revisions ADD COLUMN IF NOT EXISTS origin_battlecard_id UUID;
ALTER TABLE competitive_battlecard_revisions ADD COLUMN IF NOT EXISTS origin_revision_version INTEGER;
ALTER TABLE competitive_battlecard_revisions ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;

ALTER TABLE competitive_research_runs ADD CONSTRAINT competitive_runs_ci_key CHECK(ci_product_key IN ('cip','mep','epp'));
ALTER TABLE competitive_battlecards ADD CONSTRAINT competitive_battlecards_ci_key CHECK(ci_product_key IN ('cip','mep','epp'));
ALTER TABLE competitive_opportunity_links ADD CONSTRAINT competitive_links_ci_key CHECK(ci_product_key IN ('cip','mep','epp'));
ALTER TABLE ci_product_sources ADD CONSTRAINT ci_sources_product_key CHECK(ci_product_key IN ('cip','mep','epp'));
CREATE UNIQUE INDEX IF NOT EXISTS idx_comp_one_canonical_source ON competitive_sources(product_id) WHERE is_canonical=TRUE AND source_status NOT IN ('rejected','retired');

INSERT INTO competitive_companies(company_name,normalized_name,website_domain) VALUES
 ('SAP','sap','sap.com'),('Oracle','oracle','oracle.com')
ON CONFLICT(normalized_name) DO NOTHING;

INSERT INTO competitive_products(company_id,product_name,normalized_name,category,status,primary_website,relevant_ci_products)
SELECT id,'SAP WM / Extended Warehouse Management','sap wm extended warehouse management','Warehouse','active','https://www.sap.com/products/scm/extended-warehouse-management.html',ARRAY['cip'] FROM competitive_companies WHERE normalized_name='sap'
ON CONFLICT(normalized_name) DO UPDATE SET status='active',relevant_ci_products=ARRAY['cip'];
INSERT INTO competitive_products(company_id,product_name,normalized_name,category,status,primary_website,relevant_ci_products)
SELECT id,'Oracle Warehouse Management','oracle warehouse management','Warehouse','active','https://www.oracle.com/scm/logistics/warehouse-management/',ARRAY['cip'] FROM competitive_companies WHERE normalized_name='oracle'
ON CONFLICT(normalized_name) DO UPDATE SET status='active',relevant_ci_products=ARRAY['cip'];

INSERT INTO competitive_product_aliases(product_id,alias_name,normalized_alias)
SELECT id,'SAP WM / EWM','sap wm ewm' FROM competitive_products WHERE normalized_name='sap wm extended warehouse management' ON CONFLICT(normalized_alias) DO NOTHING;
INSERT INTO competitive_product_aliases(product_id,alias_name,normalized_alias)
SELECT id,'Oracle WMS','oracle wms' FROM competitive_products WHERE normalized_name='oracle warehouse management' ON CONFLICT(normalized_alias) DO NOTHING;

INSERT INTO competitive_legacy_key_map(legacy_key,product_id,resolution_status,display_label,notes)
SELECT x.legacy_key,p.id,'resolved',x.label,'Compatibility projection; historical scenario JSON remains unchanged.'
FROM (VALUES
 ('sap','sap wm extended warehouse management','SAP WM / Extended Warehouse Management'),
 ('oracle','oracle warehouse management','Oracle Warehouse Management'),
 ('excel','spreadsheets manual','Spreadsheets / Manual'),
 ('rf','legacy rf paper based','Legacy RF / Paper-based'),
 ('erp','erp native module','ERP-Native Module'),
 ('mep_lowcode','microsoft power apps','Microsoft Power Apps'),
 ('mep_mendix','mendix','Mendix'),
 ('mep_appian','appian','Appian'),
 ('mep_rfsmart','rf-smart','RF-SMART'),
 ('other','other wms','Other WMS')
) x(legacy_key,normalized_name,label) JOIN competitive_products p USING(normalized_name)
ON CONFLICT(legacy_key) DO UPDATE SET product_id=EXCLUDED.product_id,resolution_status=EXCLUDED.resolution_status,display_label=EXCLUDED.display_label,notes=EXCLUDED.notes;

INSERT INTO competitive_legacy_key_map(legacy_key,product_id,resolution_status,display_label,resolution_options,notes)
VALUES('mep_rfgen',NULL,'ambiguous','Legacy RFgen / RF-SMART combined selection',
  jsonb_build_array(jsonb_build_object('normalizedName','rfgen','label','RFgen'),jsonb_build_object('normalizedName','rf-smart','label','RF-SMART')),
  'Product attribution required. Never auto-associate or copy combined claims.')
ON CONFLICT(legacy_key) DO UPDATE SET product_id=NULL,resolution_status='ambiguous',display_label=EXCLUDED.display_label,resolution_options=EXCLUDED.resolution_options,notes=EXCLUDED.notes;

INSERT INTO competitive_legacy_claim_review(legacy_key,legacy_subject,claim_json,review_reason)
SELECT x.k,x.label,jsonb_build_object('classification','Legacy curated content — provenance requires review','source','LEGACY_CURATED_COMPETITIVE_CONTENT'),x.reason
FROM (VALUES
 ('sap','SAP WM / Extended Warehouse Management','Legacy curated claims require individual sourcing and approval.'),
 ('oracle','Oracle Warehouse Management','Legacy curated claims require individual sourcing and approval.')
) x(k,label,reason)
WHERE NOT EXISTS(SELECT 1 FROM competitive_legacy_claim_review r WHERE r.legacy_key=x.k);

INSERT INTO audit_log(action,entity_type,detail) VALUES('system.migration_applied','schema',jsonb_build_object('migration','033_competitive_intelligence_integrity','note','v6.6.3 security, compatibility, canonical-source and merge provenance model','applied_at',NOW()));

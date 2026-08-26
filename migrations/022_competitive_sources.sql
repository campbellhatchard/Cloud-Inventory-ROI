/* ═══════════════════════════════════════════════════════════════════
   022_competitive_sources.sql
   Stores canonical Cloud Inventory product source (admin-managed)
   and per-session research results cache.

   SCHEMA COMPATIBILITY NOTES:
   - users.id is UUID (set in 001_initial_schema.sql)
   - scenarios.id is UUID, customers.id is UUID
   - ci_product_sources.id uses SERIAL (INTEGER) — new table, no FK conflict
   - competitive_research_cache.ci_source_id references ci_product_sources(id)
     which is SERIAL/INTEGER — correct type match
   - uploaded_by and created_by reference users(id) — must be UUID
   ═══════════════════════════════════════════════════════════════════ */

/* Enable UUID extension (idempotent) */
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS ci_product_sources (
  id           SERIAL PRIMARY KEY,
  source_type  VARCHAR(10) NOT NULL CHECK (source_type IN ('url','file')),
  source_name  TEXT NOT NULL,
  source_url   TEXT,
  content_text TEXT,
  file_size    INTEGER,
  uploaded_by  UUID REFERENCES users(id) ON DELETE SET NULL,   /* UUID — matches users.id */
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  is_active    BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS competitive_research_cache (
  id              SERIAL PRIMARY KEY,
  ci_source_id    INTEGER REFERENCES ci_product_sources(id) ON DELETE SET NULL,  /* INTEGER — matches ci_product_sources.id SERIAL */
  competitor_key  VARCHAR(50),
  competitor_url  TEXT,
  competitor_name TEXT,
  result_json     JSONB,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,  /* UUID — matches users.id */
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ci_sources_active  ON ci_product_sources(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comp_cache_key     ON competitive_research_cache(competitor_key, created_at DESC);

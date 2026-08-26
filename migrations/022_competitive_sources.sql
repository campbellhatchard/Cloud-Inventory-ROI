/* ═══════════════════════════════════════════════════════════════════
   022_competitive_sources.sql
   Stores canonical Cloud Inventory product source (admin-managed)
   and per-session research results cache.
   ═══════════════════════════════════════════════════════════════════ */

CREATE TABLE IF NOT EXISTS ci_product_sources (
  id           SERIAL PRIMARY KEY,
  source_type  VARCHAR(10) NOT NULL CHECK (source_type IN ('url','file')),
  source_name  TEXT NOT NULL,           /* filename or URL */
  source_url   TEXT,                    /* set when type=url */
  content_text TEXT,                    /* extracted text content */
  file_size    INTEGER,
  uploaded_by  INTEGER REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  is_active    BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS competitive_research_cache (
  id              SERIAL PRIMARY KEY,
  ci_source_id    INTEGER REFERENCES ci_product_sources(id),
  competitor_key  VARCHAR(50),
  competitor_url  TEXT,
  competitor_name TEXT,
  result_json     JSONB,
  created_by      INTEGER REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ci_sources_active ON ci_product_sources(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comp_cache_key ON competitive_research_cache(competitor_key, created_at DESC);

/* ═══════════════════════════════════════════════════════════════════
   006_add_solution.sql — Product/Solution dimension on scenarios
   Records which Cloud Inventory solution a business case is for.
   Nullable; existing rows default to NULL (treated as 'all' in app).
   ═══════════════════════════════════════════════════════════════════ */
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS solution VARCHAR(30);
CREATE INDEX IF NOT EXISTS idx_scenarios_solution ON scenarios(solution);

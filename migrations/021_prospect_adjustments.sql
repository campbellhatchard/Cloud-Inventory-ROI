/* ═══════════════════════════════════════════════════════════════════
   021_prospect_adjustments.sql

   Allows prospects to stress-test assumptions on the shared business
   case link. The rep is notified of what the CFO changed.
   ═══════════════════════════════════════════════════════════════════ */

ALTER TABLE business_case_shares
  ADD COLUMN IF NOT EXISTS prospect_adjustments JSONB,
  ADD COLUMN IF NOT EXISTS prospect_adjusted_at TIMESTAMPTZ;

/* ═══════════════════════════════════════════════════════════════════
   013_se_role.sql — introduce the Solution Engineer (SE) role
   ───────────────────────────────────────────────────────────────────
   Adds 'se' to the allowed user roles. SEs support multiple AEs and need
   cross-customer read/write on Solution Fit handoffs (enforced in app
   logic, not SQL). AEs keep the 'rep' role and stay owner-scoped.

   Additive and idempotent: drops and re-adds the CHECK constraint to
   include 'se'. No data changes — existing users keep their role.
   ═══════════════════════════════════════════════════════════════════ */

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'rep', 'se'));

COMMENT ON TABLE users IS 'Application users — admin, rep (AE), and se (Solution Engineer). Prospects are anonymous.';

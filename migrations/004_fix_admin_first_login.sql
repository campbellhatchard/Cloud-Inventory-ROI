/* ═══════════════════════════════════════════════════════════════════
   004_fix_admin_first_login.sql

   Migration 003 incorrectly set first_login = TRUE on the admin
   account, causing a redirect loop where every admin login was
   immediately sent to /change-password.html before the Admin tab
   could be accessed.

   This migration sets first_login = FALSE for the admin account so
   the Admin tab and Help tab are accessible immediately after login.
   The admin can still change their password voluntarily via the
   Profile page at any time.
   ═══════════════════════════════════════════════════════════════════ */

UPDATE users
SET first_login = FALSE,
    updated_at  = NOW()
WHERE LOWER(username) = 'admin'
  AND first_login = TRUE;

INSERT INTO audit_log (action, entity_type, detail)
VALUES (
  'system.migration_applied',
  'user',
  jsonb_build_object(
    'migration',  '004_fix_admin_first_login',
    'fix',        'Set first_login = FALSE for admin account to prevent redirect loop',
    'applied_at', NOW()
  )
);

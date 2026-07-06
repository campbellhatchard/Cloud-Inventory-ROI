/* One-time repair of the initial administrator account. */
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

/* Create the account only when neither the username nor bootstrap email exists. */
INSERT INTO users (
  email, username, password_hash, role, first_login, is_active,
  failed_login_count, locked_until
)
SELECT
  'admin@cloudinventory.com',
  'admin',
  crypt('CloudInventory2026!', gen_salt('bf', 12)),
  'admin', FALSE, TRUE, 0, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE LOWER(username) = 'admin'
)
AND NOT EXISTS (
  SELECT 1 FROM users WHERE LOWER(email) = 'admin@cloudinventory.com'
);

/* If the bootstrap email already exists under another username, make it admin. */
UPDATE users
SET username = 'admin',
    updated_at = NOW()
WHERE LOWER(email) = 'admin@cloudinventory.com'
  AND NOT EXISTS (
    SELECT 1 FROM users WHERE LOWER(username) = 'admin'
  );

/* Deterministically repair credentials, permissions and lockout state.
   first_login = FALSE — admin credentials are now documented and the
   admin can change their password voluntarily via the Profile page.
   Setting TRUE was trapping every admin login in a redirect loop.    */
UPDATE users
SET password_hash      = crypt('CloudInventory2026!', gen_salt('bf', 12)),
    role               = 'admin',
    first_login        = FALSE,
    is_active          = TRUE,
    failed_login_count = 0,
    locked_until       = NULL,
    updated_at         = NOW()
WHERE LOWER(username) = 'admin';

/* Revoke any sessions issued before this one-time credential repair. */
DELETE FROM sessions
WHERE user_id IN (
  SELECT id FROM users WHERE LOWER(username) = 'admin'
);

INSERT INTO audit_log (action, entity_type, detail)
VALUES (
  'system.bootstrap_admin_repaired',
  'user',
  jsonb_build_object(
    'username', 'admin',
    'password_change_required', FALSE,
    'migration', '003_repair_bootstrap_admin',
    'applied_at', NOW()
  )
);

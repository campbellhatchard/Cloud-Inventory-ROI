/* Align the seeded Getting Started guidance with the current bootstrap-admin behavior.
   The targeted REPLACE preserves any other Admin edits to the help page. */
UPDATE help_pages
SET content = REPLACE(
      content,
      'Use the credentials provided by your Administrator. You will be prompted to set a new password on first login.',
      'Use the credentials provided by your Administrator. Change the temporary password from My profile after signing in.'
    ),
    updated_at = NOW()
WHERE slug = 'getting-started'
  AND content LIKE '%You will be prompted to set a new password on first login.%';

INSERT INTO audit_log (action, entity_type, detail)
VALUES (
  'system.migration_applied',
  'help_page',
  jsonb_build_object(
    'migration', '006_help_first_login_consistency',
    'note', 'Aligned first-login help guidance with bootstrap administrator behavior',
    'applied_at', NOW()
  )
);

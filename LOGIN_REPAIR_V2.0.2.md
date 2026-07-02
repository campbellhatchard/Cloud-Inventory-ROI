# Login and first-password-change repair — v2.0.2

## Root cause
The first-login page omitted `currentPassword` from its request, but the backend requires both `currentPassword` and `newPassword`. The backend therefore rejected every mandatory first-login password change.

## Repair included
- A one-time migration resets the initial administrator to `admin` / `CloudInventory2026!`.
- Existing lockout state and stale sessions are cleared.
- The first-login page now asks for and sends the temporary password.
- Authentication HTML pages use no-cache headers.
- The negative logo is shown directly on the dark background.
- Authentication pages visibly identify build `v2.0.2`.

## Expected deployment log
```text
→ Applying: 003_repair_bootstrap_admin.sql
✓ Applied: 003_repair_bootstrap_admin.sql
```

## First login
1. Sign in with `admin` / `CloudInventory2026!`.
2. Enter `CloudInventory2026!` again in **Temporary or current password**.
3. Enter and confirm a new password that meets all requirements.
4. Submit and continue to the ROI Builder.

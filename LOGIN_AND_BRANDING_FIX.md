# Login and branding corrective patch

This patch addresses two deployment issues:

1. The sign-in form now uses the canonical `POST /api/auth/login` route. The duplicate cookie-only route was removed. Login failures, non-JSON server responses, and timeouts are shown visibly on the page.
2. The bootstrap administrator is synchronized with the configured username/password while `first_login` is still true. This also clears an accidental initial lockout. After the administrator changes the password, later deployments do not overwrite it.
3. The canonical login route now sets the secure HTTP-only authentication cookie and the canonical logout route clears it.
4. The correct `ci-logo-negative.png` wordmark is displayed directly on the dark background without a white container.

Configured initial credentials remain:

- Username: `admin`
- Password: `CloudInventory2026!`

After this commit is deployed, wait for Render to report a successful deploy before trying to sign in. The first successful login redirects to the mandatory password-change page.

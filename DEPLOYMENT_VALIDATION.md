# Deployment Validation Report — v2.4.2

## Result

The uploaded developer archive was intact, but it was **not deployment-ready as submitted**. The corrected v2.4.2 package preserves the developer's application changes, including the new discovery-question fallback, and restores the deployment hardening required for Render.

## Issues found in the uploaded build

1. `package-lock.json` was absent and the Blueprint used `npm install`, making builds non-deterministic.
2. The service used `npm start` rather than running Node directly.
3. The application had no complete HTTP-server shutdown handler. `src/db.js` independently handled `SIGTERM` by closing only PostgreSQL, which could leave the HTTP process alive during Render replacement.
4. `maxShutdownDelaySeconds` was absent from the Blueprint.
5. Database connection at startup had no bounded retry loop, despite the database and service being created together by the Blueprint.
6. Production could start without `DATABASE_URL`, and `/health` could return HTTP 200 with `database: not-configured`.
7. Optional `sync: false` variables could interrupt initial Blueprint provisioning even though the integrations are optional.
8. URL generation was inconsistent. One sharing route required `APP_URL`, while other files used Render-specific fallbacks directly.
9. Bootstrap-admin behavior was contradictory across migrations, help content, README text, and runtime synchronization.
10. A custom rate-limit key function bypassed the library's IPv6-safe default behavior.
11. The package contained obsolete troubleshooting and patch-history documents.
12. Login and password-change footers still displayed v2.0.3.

## Corrections applied

- Added a public-registry `package-lock.json` and `.npmrc`.
- Changed the build command to `npm ci --omit=dev --no-audit --no-fund`.
- Changed the start command to `node server.js`.
- Added `maxShutdownDelaySeconds: 15`.
- Added complete graceful shutdown for timers, cron tasks, HTTP connections, and PostgreSQL.
- Added a 10-second forced-exit safeguard.
- Added bounded PostgreSQL startup retries.
- Made database connectivity mandatory in production.
- Kept `/health` database-aware.
- Added centralized public-URL resolution through `src/config.js` using `APP_URL` or `RENDER_EXTERNAL_HOSTNAME`.
- Removed optional secret prompts from the core Blueprint.
- Aligned the bootstrap administrator to direct login without a forced first-password-change loop.
- Added migration `006_help_first_login_consistency.sql`.
- Restored the IPv6-safe rate-limit default key generator.
- Updated `node-cron` to 4.6.0 and `uuid` to 11.1.1.
- Removed stale patch documents and updated displayed version markers.

## Validation completed

- ZIP integrity check on the uploaded archive.
- YAML parsing and Blueprint structural assertions.
- Exact dependency installation from the lockfile.
- `npm ls --omit=dev --depth=0` dependency-tree validation.
- `npm audit --omit=dev`: zero known vulnerabilities at validation time.
- JavaScript syntax checks for all server and browser JavaScript files.
- Syntax checks for inline JavaScript in HTML files.
- Runtime module loading for all declared top-level dependencies.
- Verification that all 122 package tarball references use `https://registry.npmjs.org/`.
- Local `/health` and `/login.html` smoke tests.
- Production failure test when `DATABASE_URL` is absent.
- Clean `SIGTERM` test with process exit code 0.
- Local static-asset reference checks. The optional local `pptxgen.bundle.js` intentionally falls back to jsDelivr.
- Six ordered SQL migration files present.

## Environment limitation

A live migration against the user's existing Render PostgreSQL database and a live Blueprint sync cannot be executed from the validation environment. Confirm migration output and `/health` after deployment.

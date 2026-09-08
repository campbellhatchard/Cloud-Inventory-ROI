# Deployment validation — v6.9.1

No v6.9.1 deployment or production-system mutation has been performed by this release-validation workspace.

## Verified production baseline before release preparation

- GitHub `main`: `19c9d9b537f8eedf593110360c876817eb107297` (`Deploy Cloud Inventory ROI v6.9.0`).
- Production Git tree: `b050db4e2fdf89fb4d47361e0218a9d739da4b79`.
- Render production was independently observed live on that same v6.9.0 commit before the v6.9.1 candidate was prepared.

## Release deployment contract

The guarded PowerShell deployment must refuse to proceed unless `origin/main` remains the exact baseline commit above. Before commit/push it must require:

1. exact sealed ZIP SHA-256 and file count;
2. clean local repository and pre-release safety branch;
3. Render configuration unchanged (`npm ci --omit=dev --no-audit --no-fund`, Node 22.22.0, `/health`);
4. migrations exactly 001–035 with only migration 035 new relative to production;
5. fresh `npm ci`;
6. JavaScript syntax validation;
7. complete cumulative `npm test`;
8. `npm run test:production-locks`;
9. `npm run test:routes`;
10. explicit v6.9.1 frozen-publication and permanent financial/auth safety guards;
11. `git diff --check`;
12. canonical staged delta and exact `git write-tree` match;
13. zero unstaged changes.

Only after those gates pass may the script commit `Deploy Cloud Inventory ROI v6.9.1` and push `main`. Render autoDeploy is then allowed to deploy the new commit; no manual Render trigger should be used.

## Required post-push verification

- GitHub `main` equals the pushed v6.9.1 SHA and its tree equals the validated target tree.
- GitHub CI completes its Postgres-backed migration and cumulative tests.
- Render auto-deploys that exact SHA and reaches `live`.
- Startup/migration logs show migration 035 completed without rollback/error.
- `/health` responds successfully.
- Controlled smoke test verifies creation of Ready and acknowledged Review publications, rejection of Draft Only/unauthorized publication, logged-out frozen payload, later scenario changes not mutating an existing published link, legacy links unavailable, and approved-revision Battlecard export behavior.

## Rollback / retention caution

Legacy Business Case rows intentionally require republishing rather than silently following newer scenarios. Migration 035 is additive but installs an immutability trigger; rollback must not re-enable legacy publishing against rows created under the frozen-publication contract. Hard-delete retention behavior should be validated against existing foreign keys before destructive administrative operations.

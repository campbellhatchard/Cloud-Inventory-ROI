# v6.8.5 Validation Evidence

## Release scope

This validated candidate is rebuilt from the exact live v6.8.4 production baseline and retains only the intended v6.8.5 stabilization work: centralized customer ROI report data, authenticated server-side PDF and Word export, contract-value charting across Executive View and customer outputs, PowerPoint report-data alignment, customer-specific filenames, and deterministic retry/status behavior.

The candidate explicitly preserves the v6.8.4 production regression locks for authentication initialization, explicit zero ramps, Field Inventory result naming, Medical Devices / Life Sciences customer-input-only policy, contract-term server authority and boundaries, historical shared-business-case recompute, bounded Prospect AI context, authenticated Three Whys persistence, and cumulative CI coverage.

## Validation completed in release review

- JavaScript syntax: 161 source/test files clean before packaging.
- ROI engine: 37 passed, 0 failed.
- Version consistency: 6.8.5 across package, application shell, and version history.
- Version history: 159 well-formed records.
- Migration compatibility: 72 FK checks across unchanged migrations 001-034.
- Phase-1 regression: passed.
- Production regression locks: 14 passed, 0 failed.
- Customer ROI report + server PDF smoke test: valid report and `%PDF-1.4` output generated.
- Canonical Git delta: 22 modified, 9 added, 0 removed.
- `git diff --check`: clean.
- Dependency graph: unchanged from live v6.8.4.

## Environment-dependent final gates

The validation environment could not complete a clean npm registry installation. The guarded deployment script therefore requires all of the following to succeed before it can create a commit:

1. `npm ci --omit=dev --no-audit --no-fund`
2. complete `npm test`, including `v685-stabilization.test.js` and `production-regression-locks.test.js`
3. `npm run test:routes`
4. canonical staged Git tree comparison against the sealed release target

Post-deployment verification must still confirm live Render startup, PostgreSQL connectivity, authorized customer/scenario loading, and PDF/PPTX/DOCX generation with production data.

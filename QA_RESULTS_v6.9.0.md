# v6.9.0 Release Validation

## Production baseline

- Rebuilt against the exact live production v6.8.5 commit `54e8e59965b76808af83eb1aa3226218546aff78`.
- Production baseline Git tree: `b482036406077aa1bca863d56cf95308d6705893`.
- Render was independently confirmed live on the same v6.8.5 commit before validation.
- The supplied v6.9.0 ZIP was not accepted as a direct overlay because it contained stale copies of production-critical files. The v6.9.0 Solution Fit changes were layered onto the live v6.8.5 baseline instead.

## Accepted v6.9.0 scope

- Explicit Solution Fit creation and recoverable missing/removed/error states.
- Active-record filtering for removed Solution Fits across customer switching, manager/readiness, close snapshots and Christie context.
- Governed MEP Product → ERP → Applications setup.
- Governed August 2026 MEP Standard Applications catalog for JDE, EBS, Oracle Fusion, SAP ECC6 and SAP Hana.
- Standard/non-standard application assessment with Demo, Fit and Customer Validation status.
- MEP readiness gating, scope change history and Christie context projection.
- First-use onboarding and customer-switcher dialog recovery behavior.
- Application version update to 6.9.0; ROI Model 2.8, Brand System 1.0, Application Knowledge 1.0 and Christie Persona 1.0 remain locked.

## Regressions removed from the supplied ZIP

The supplied ZIP reintroduced stale v6.8.x behavior. The rebuilt candidate restores the production versions of these controls:

- explicit-zero ramp preservation (`normalizeRamp`, nullish ramp fallbacks);
- Field Inventory result property `fieldInvSav`;
- Medical Devices / Life Sciences customer-input-only defaults and provenance;
- authenticated Three Whys AI and `window.persistThreeWhys` persistence hook;
- server-authoritative contract-term ROI metrics;
- historical shared-business-case contract recomputation;
- role-normalized and bounded Prospect AI message history;
- cumulative CI and `production-regression-locks.test.js` coverage;
- correct migrations 001–034 and bootstrap-password documentation.

## Automated validation completed

- JavaScript syntax: 164 runtime/test JavaScript files syntax-clean.
- ROI engine: 37 passed, 0 failed.
- Version consistency: package, APP_VERSION and Version History all report 6.9.0; 160 history entries are well formed.
- Migration compatibility: 72/72 checks passed across unchanged migrations 001–034.
- Phase 1 regression suite: passed.
- Permanent production regression locks: 14/14 passed.
- v6.9.0 Solution Fit release locks: 10/10 passed.
- Generated Application Knowledge integrity: passed.
- MEP catalog ordered names/counts and SHA-256 locks: passed.
- `git diff --check`: required before sealing and deployment.

## Dependency-backed suite limitation

A fresh `npm ci` could not complete in the validation sandbox because registry access timed out. An analysis-only `pg` loader stub was used only to allow dependency-independent test modules to load; it is not included in the release. With that stub, the cumulative suite reported 383 passes, 0 assertion failures, 3 PostgreSQL-only skips, and 3 failures caused solely by the unavailable `jszip` module. No application assertion failure remained.

The production deployment script therefore requires a successful clean `npm ci`, complete `npm test`, and `npm run test:routes` on the user's local machine before it can stage, commit or push v6.9.0.

## Catalog source limitation

The package states that `202608 Standard Apps by ERP.xlsx` was not supplied with the build. The catalog in `config/mep-standard-apps.json` is therefore validated for internal consistency, exact ordered hashes and application behavior, but has not been independently compared with that workbook. If the workbook becomes available, compare its names and order byte-for-name/order against the governed JSON before modifying catalog version `2026-08`.

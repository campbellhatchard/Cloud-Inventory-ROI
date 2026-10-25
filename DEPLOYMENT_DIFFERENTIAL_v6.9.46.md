# v6.9.46 deployment differential

User-authorized source: `cloud-inventory-roi-v6.9.46-render-ready.zip`, SHA-256 `7c7e582588b8c01af7b612c7df4642d6089f4767541118a2b5422542bf06ee72` (verified before extraction).

Existing production Git parent: `460af0a204b4e1ea54c7ac861454e1235cfa631b`. Rollback reference: `production-before-v6.9.46`. Supplied archive lineage remains unchanged and distinct from this deployed Git parent.

The supplied archive inherits the original v6.9.45 package rather than its deployed corrections. Its new v6.9.46 changes were applied forward with those corrections retained: create-only signed R2 uploads and identity metadata; conditional completion/retry; atomic stale cleanup and active-only counts; timestamp fingerprints; customer/modal/load isolation; PS Turnover filename uniqueness, cancellation and stream/file cleanup; and the permanent regression tests and valid PostgreSQL fixtures proving these behaviors. No prior source was substituted for the supplied v6.9.46 changes.

The evidence queue combines v6.9.46 server-confirmed completion and completed-file removal with the existing customer/modal generation guards. A completion JSON response is checked again after parsing. Existing test fixture queue access and the historical release pretests remain available.

Independent review reproduced a financial compatibility defect in the supplied package: canonical `contractPayback: null` could become the 60-month legacy payback. The compatibility summary now uses an alias only when the preceding property is absent, preserving explicit canonical nulls. The added behavioral regression failed with `24 !== null` before the fix and passed afterward; it also covers null ROI, NPV, annual benefit and legitimate legacy fallback.

Deployment remains on the existing GitHub repository and Render service. `render.yaml` changes only the start command to the requested `node server.js`. Existing pre-deploy migration, build, health check, Node 22.22.0 configuration and environment sources remain in place. Migrations are unchanged from the deployed source; migration 045 is still the latest. Production database test suites must never be run against the customer database.

Verification results from this deployment are recorded separately from the supplied package's historical test reports. Deployment success is not a Product Owner readiness classification.

Local verification on Node v22.22.0: locked production dependency install passed; full `npm test` passed (759 tests, zero failures, three database-dependent local skips); the evidence/stabilization/turnover focused run passed 47/47; 19 changed/new JavaScript files passed syntax checks; lineage, generated brand and generated knowledge checks passed. The initial restricted local run could not access localhost for an HTTP fixture; the permitted localhost run passed without source/test changes. CI pins the same Node version and uses its disposable PostgreSQL 16 `ci_test` database for integration checks. No customer database was used for automated tests.

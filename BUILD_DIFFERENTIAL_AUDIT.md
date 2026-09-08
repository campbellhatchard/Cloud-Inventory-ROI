# v6.9.1 differential audit

## Baseline

All release-delta statements in this document are against the exact live v6.9.0 production baseline:

- Commit: `19c9d9b537f8eedf593110360c876817eb107297`
- Tree: `b050db4e2fdf89fb4d47361e0218a9d739da4b79`
- Reference artifact: `cloud-inventory-roi-v6.9.0-validated-render-ready.zip`

The upstream v6.9.1 package was built from a different raw v6.9.0 developer package. Its intended v6.9.1 delta was isolated and integrated onto the production tree so that unrelated production corrections were not replaced.

## Intentionally changed

- Add frozen customer-safe Business Case publication with exact scenario-version metadata and immutable publication content.
- Add migration `035_published_business_cases.sql` for publication metadata/payload and the immutability trigger.
- Replace legacy public Business Case rendering with a small shell plus frozen-payload renderer.
- Retire legacy raw scenario-share and browser print economics paths with explicit unavailable/410 behavior.
- Remove Executive 70/100/130 scenario-scaling exposure from customer output paths.
- Keep Champion Pack inactive pending governed conversion.
- Require an approved current Battlecard revision for formal exports.
- Make customer report economics consume the canonical Executive Value Story economics instead of recalculating separately.
- Tighten Executive/JPP/Stakeholder customer-output layout and customer-safe projection.
- Enforce output-registry ownership, route/control presence and generator loading.
- Add v6.9.1 release-integrity tests, active-output audit and deterministic generated-asset line-ending policy.
- Advance application/version metadata to 6.9.1.

## Intentionally preserved

- ROI Model 2.8 / `modelVersion: 28`.
- v6.9.0 Solution Fit creation/recovery, MEP catalog and authorization behavior.
- Existing migrations 001–034, byte/canonical-equivalent to production.
- Production authentication and authorization boundaries.
- Explicit-zero ramp semantics.
- `fieldInvSav` Field Inventory result semantics.
- Medical Devices / Life Sciences customer-input-only policy.
- Server-authoritative contract-term metrics.
- Bounded Prospect AI context.
- Authenticated Three Whys AI and persistence hook.
- Brand System 1.0, Application Knowledge 1.0 and Christie Persona 1.0.
- Full cumulative CI and permanent production regression locks.
- Dependency graph and Node 22 production requirement.

## Removed as obsolete/reachable legacy behavior

Large line-count deletions in `public/print.html`, `public/business-case.html`, `public/deal-export.js` and related compatibility code are deliberate retirement of raw/public calculations and disabled output generators. They do not remove the authoritative ROI engine or the v6.9.0 Solution Fit implementation.

## Migration added

`035_published_business_cases.sql` is additive to the existing `business_case_shares` table. It adds frozen publication metadata/payload fields and a trigger preventing mutation of publication content after publication. It does not drop a table, truncate data or drop a column. View counters, view timestamps and revocation remain outside the protected publication-content comparison.

## Tests and gates added or strengthened

- `test/release-integrity.test.js` covers publication authorization/readiness, frozen exact-version behavior, customer-safe projection, public frozen-row loading, legacy-path retirement, Champion inactivity and Battlecard approval requirements.
- `scripts/audit-active-output-paths.js` scans for prohibited reachable output patterns.
- Permanent production locks remain in the cumulative suite. Assertions that previously required the now-retired `print.html` calculator were replaced with stronger assertions that the retired path cannot calculate/expose ROI while active output paths still preserve financial semantics.
- Existing v6.9.0 Solution Fit tests remain cumulative gates.

## Audit boundary

Source/unit checks do not by themselves prove live PostgreSQL trigger behavior, live authorization, concurrent publication, Render startup or SendGrid. Those checks remain explicit deployment/production verification requirements.

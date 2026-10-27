# JPP Date-Only Corrective Report — v6.9.52

## 1. Executive Summary

JPP-DATE-01 is corrected at the semantic boundary. JPP calendar values remain `YYYY-MM-DD` in storage and are validated and formatted as calendar components, never as local-time instants.

## 2. Authoritative Baseline

The only source baseline is `cloud-inventory-roi-v6.9.51-render-ready.zip`, SHA-256 `791AD9298068A23EA95E6FB84A42385188C01A9B14AE145E942A3219D552FAAD`.

## 3. JPP-DATE-01 Reproduction

Source-level reproduction proved that `new Date('2027-03-31')` represents UTC midnight. Formatting that instant in America/Chicago or America/Los_Angeles produces March 30.

## 4. Stored Value Verification

`src/routes/maps.js` reads and returns `target_close_date` without presentation conversion. Create and update routes continue to store the submitted date-only value. No schema or API change was made.

## 5. Editor Behavior

The date input continues to hydrate from the saved `YYYY-MM-DD` value and submit that same value. The behavioral fixture hydrates `2027-03-31` and 14 milestones without mutation.

## 6. All Plans Formatter Audit

The All Plans card previously called `new Date(m.target_close_date).toLocaleDateString(...)`. This exact production formatter was the confirmed shifting consumer.

## 7. Proven Root Cause

The All Plans card treated a governed date-only value as an ECMAScript instant. ECMAScript interpreted the ISO date as UTC midnight; local formatting in timezones behind UTC rendered the prior calendar day.

## 8. Date-Only Semantic Rule

`YYYY-MM-DD` is validated as year, month, and day. A validated UTC display representation is formatted with `timeZone: 'UTC'`. The stored value is never changed and no offset correction is applied.

## 9. Corrective Architecture

`public/jpp-date-only.js` owns strict parsing and deterministic presentation. Both authenticated and public JPP browser surfaces load the same helper. It rejects malformed and impossible dates rather than allowing JavaScript rollover.

## 10. JPP Date-Only Consumer Audit

| Consumer | Classification | v6.9.52 action |
|---|---|---|
| All Plans target close | Vulnerable local-time formatter | Uses canonical helper |
| Editor target close input | Correct date-only hydration | Preserved |
| Prospect-link email target close | Vulnerable local-time formatter | Uses canonical helper |
| Public JPP target/milestone display | Noon workaround | Uses canonical helper |
| Internal/customer JPP PDF | Raw date-only text | Preserved |
| Internal/customer JPP PPTX | Raw date-only components | Preserved |
| Rep overdue status comparisons | Separate status computation, not display | Audited; unchanged in this narrow presentation release |
| Public overdue status comparison | Local-day lexical comparison | Preserved |

## 11. UTC Results

`2027-03-31` renders `Mar 31, 2027`; behavioral card/editor parity passes.

## 12. America/Chicago Results

`2027-03-31` renders `Mar 31, 2027`; the prior March 30 shift is absent.

## 13. America/Los_Angeles Results

`2027-03-31` renders `Mar 31, 2027`; the prior March 30 shift is absent. America/New_York also passes.

## 14. DST Boundary Results

`2027-03-14` and `2027-11-07` render their governed calendar days in every tested timezone.

## 15. Save/Reload Results

The API and model contract are unchanged. An API-shaped saved-plan fixture renders the correct card, reopens with `2027-03-31`, and hydrates all 14 milestones.

## 16. Editor/Card Parity

Card: `Mar 31, 2027`. Editor: `2027-03-31`. Both represent the same calendar day for owner, read-only Rep, Leader/Manager, SE, and Rep+SE viewers.

## 17. JPP Role Regression

Role rendering is covered by the v6.9.52 fixture; authority behavior remains covered by the permanent v6.9.51 suite.

## 18. JPP Sharing Regression

No sharing code or route changed. Permanent owner/non-owner share, rotate, revoke, and direct-mutation tests are retained.

## 19. JPP Output Regression

The four JPP output owners remain registered and use the saved plan. PDF and PPTX retain the raw governed calendar components; active-output runtime validation is recorded in machine evidence.

## 20. v6.9.50 Preservation

The permanent v6.9.50 production-integrity suite remains wired into the v6.9.52 focused, pretest, and production-lock gates.

## 21. Executive Narrative Regression

The v6.9.48 Executive narrative authority suite remains unchanged and registered.

## 22. Solution Fit Header Regression

The v6.9.49 header/body/progress synchronization suite remains unchanged and registered.

## 23. Production Locks

PASS: 414 production locks, 0 failures, 0 skips. See `QA_RESULTS_v6.9.52.md` and `RELEASE_GATE_RESULTS_v6.9.52.json` for the full executed matrix.

## 24. Output Runtime

PASS: the registry retains 29 active output owners and every owner executed with artifact validation. See `OUTPUT_RUNTIME_RESULTS_v6.9.52.json` for per-output evidence.

## 25. JavaScript Syntax

PASS: 310 JavaScript files, 0 syntax failures.

## 26. PostgreSQL Result

`NOT TESTED` unless a clean approved non-production `DATABASE_URL` is supplied. No migration is required.

## 27. R2 Result

`NOT TESTED` unless approved test credentials are supplied. No R2 code changed.

## 28. Files Changed

Production changes are limited to the canonical JPP date helper, its authenticated/public consumers, script load order, and version metadata. Tests, release configuration, and release documentation were added or updated.

## 29. Migration Status

`NONE`.

## 30. Known Limitations

Live Render/Chrome certification, PostgreSQL integration, and private R2 integration require approved external environments. The supported production runtime is Node 22.22.0; local machine evidence used the available later Node runtime and must be supplemented by GitHub/Render Node 22 certification. The existing rep-side overdue status calculation is not a presentation formatter and was not changed in this narrow release.

## 31. Release Recommendation

YELLOW — Date correction passes but external certification gates remain incomplete

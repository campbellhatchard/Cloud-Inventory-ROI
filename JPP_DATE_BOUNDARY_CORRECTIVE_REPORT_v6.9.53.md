# JPP Date Boundary Corrective Report — v6.9.53

## 1. Executive Summary
JPP-DATE-01 is corrected at the PostgreSQL adapter. A governed `DATE` now remains `YYYY-MM-DD` through API, browser, public JPP, PDF, and PowerPoint presentation.

## 2. Authoritative Baseline
Built only from `cloud-inventory-roi-v6.9.52-render-ready.zip`, SHA-256 `9C76181C3494DF47C3B254911326709716044D1FAB485593032993D29BD0D810`.

## 3. v6.9.52 Live Failure
The editor masked the defect, the All Plans card showed no target date, PDF leaked date-object text, and PPTX truncated the date and year.

## 4. PostgreSQL Column Type
`mutual_action_plans.target_close_date` remains PostgreSQL `DATE`; no schema change was required.

## 5. pg OID 1082 Behavior
With `pg` 8.22.0, the default OID 1082 parser returned a JavaScript `Date`. In America/Chicago, JSON serialization of the probe was `2027-03-31T05:00:00.000Z`.

## 6. Database DATE Audit
All seven DATE columns identified in the current schema are calendar facts. The detailed table and consumer/risk analysis are in `POSTGRES_DATE_BOUNDARY_AUDIT_v6.9.53.md`.

## 7. Actual API Type Before Fix
The default driver value could serialize as a timestamp-shaped string, violating the JPP API contract.

## 8. Browser Card Failure
The strict browser formatter correctly rejected the timestamp, producing the approved empty-state text instead of a false calendar date.

## 9. Editor Masking Behavior
The editor used `split('T')[0]`, hiding the contract defect. That repair was removed; the input now receives the date-only value directly.

## 10. PDF Failure
The operational PDF path could stringify a JavaScript `Date`, exposing runtime-specific text.

## 11. PPTX Failure
The operational PPTX path truncated `String(value)` to ten characters, producing incomplete Date-object text.

## 12. Proven Root Cause
PostgreSQL `DATE` crossed the Node boundary as a JavaScript instant instead of a calendar string.

## 13. Selected Boundary Architecture
`src/db.js` registers one OID 1082 parser before pool creation so raw PostgreSQL DATE text enters the application unchanged.

## 14. Why the Global Parser Was Chosen
The audit proved every application DATE column is a date-only business fact. A global adapter fix is therefore earlier, safer, and less duplicative than route casts or per-surface repairs.

## 15. Shared Normalizer
`src/shared/date-only.js` strictly validates Gregorian `YYYY-MM-DD`, preserves `null`, and rejects Date objects, timestamps, and invalid rollovers.

## 16. Shared Formatter
The same module formats valid date-only values as deliberate English short-month dates using UTC calendar components.

## 17. API Contract
JPP DATE fields are exactly `YYYY-MM-DD` or `null`; timestamps and localized strings are not permitted.

## 18. PostgreSQL Integration Result
PostgreSQL 16.15 focused certification applied all 45 migrations and passed 5/5 tests with zero failures, skips, or cancellations.

## 19. `/api/maps` Exact Value Result
A real `DATE '2027-03-31'` insert returned `target_close_date: "2027-03-31"` through the real authenticated route.

## 20. Browser Result
The production map renderer displayed `Close: Mar 31, 2027`; the editor input received `2027-03-31` unchanged.

## 21. Public JPP Result
The real public JPP API preserved the exact date-only value, and the public presenter uses the canonical helper.

## 22. Internal PDF Result
Actual PDF bytes were generated and inspected; `Mar 31, 2027` was present and prohibited timestamp/date-object strings were absent.

## 23. Customer PDF Result
Actual customer PDF bytes passed the same date and negative assertions while retaining customer audience classification.

## 24. Internal PPTX Result
Actual OOXML was opened and inspected; it contained `Mar 31, 2027` with the year and no truncated Date-object text.

## 25. Customer PPTX Result
Actual customer OOXML passed the same date assertions and retained customer audience classification.

## 26. Timezone Matrix
UTC, America/Chicago, America/Los_Angeles, and America/New_York all rendered `2027-03-31` as `Mar 31, 2027`.

## 27. DST Tests
`2027-03-14` and `2027-11-07` retained their calendar dates across the timezone matrix.

## 28. Boundary and Leap Tests
Jan 1, Dec 31, and valid leap day passed; `2027-02-29` and `2027-02-31` failed safely without rollover.

## 29. Owner/Non-owner Parity
The real API returned the same date for the owner and authorized non-owner; the non-owner remained read-only.

## 30. JPP Sharing Regression
v6.9.51 capability tests passed: read-only viewers retain allowed review/export, while all mutation controls and routes remain denied.

## 31. Milestone Hydration
The PostgreSQL fixture persisted and reloaded all 14 milestones while preserving the target date.

## 32. v6.9.50 Preservation
The focused v6.9.50 gate passed 141/141. The combined historical PostgreSQL suite retains an unrelated v6.9.36 stale-cleanup assertion that also fails in the exact v6.9.52 baseline.

## 33. v6.9.48 Preservation
Executive narrative authority passed 105/105 with no production narrative changes.

## 34. v6.9.49 Preservation
Solution Fit synchronization passed 140/140 when executed with headless Chrome available.

## 35. v6.9.51 Preservation
JPP capability and sharing passed 48/48; no authorization production file changed.

## 36. Full Regression
Clean non-database `npm test` exited 0. Production locks passed 421/421, Brand passed 19/19, all 29 active output results passed, and focused v6.9.53 passed 61/61. The consolidated PostgreSQL ledger recorded 41 pass, 7 fail, 0 skip, 0 NOT TESTED; all failures are in inherited historical setup/assertion/teardown paths, not the v6.9.53 date suite. R2 was NOT TESTED because credentials were unavailable.

## 37. Files Changed
Production: `src/db.js`, `src/shared/date-only.js`, two operational export builders, and four JPP browser/public/export consumers. Other changes are tests, CI evidence names, version metadata, lineage, and release evidence.

## 38. Migration Status
No migration was added. All existing 45 migrations applied successfully to the disposable PostgreSQL database.

## 39. Known Limitations
Final real-Chrome deployed certification is still required. The historical PostgreSQL aggregate contains pre-existing test defects: bootstrap first-login assumptions, the v6.9.36 stale cleanup assertion, an invalid `sales_manager` primary-role fixture, and cleanup-order foreign-key errors. R2 remains NOT TESTED.

## 40. Release Recommendation
The JPP date boundary is corrected and independently certified. Because unrelated external/historical certification gates remain incomplete, the corrective package is recommended as YELLOW for controlled live deployment certification; the Product Owner retains final production authority.


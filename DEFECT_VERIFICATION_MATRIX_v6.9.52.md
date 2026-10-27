# Defect Verification Matrix — v6.9.52

Defect: `JPP-DATE-01` — governed JPP date-only values shifted to the prior day in browser timezones behind UTC.

| Test case | Expected | Status |
|---|---|---|
| 2027-03-31 UTC | Mar 31, 2027 | PASS |
| 2027-03-31 America/Chicago | Mar 31, 2027 | PASS |
| 2027-03-31 America/Los_Angeles | Mar 31, 2027 | PASS |
| 2027-03-31 America/New_York | Mar 31, 2027 | PASS |
| 2027-01-01 boundary | Jan 1, 2027 | PASS |
| 2027-03-14 DST start | Mar 14, 2027 | PASS |
| 2027-11-07 DST end | Nov 7, 2027 | PASS |
| 2027-12-31 boundary | Dec 31, 2027 | PASS |
| 2028-02-29 leap day | Feb 29, 2028 | PASS |
| Null/empty | Existing No target date state | PASS |
| Malformed/impossible date | Existing No target date state; no rollover | PASS |
| Saved-plan API-shaped reload fixture | Stored value unchanged | PASS |
| Editor/list parity | 2027-03-31 / Mar 31, 2027 | PASS |
| 14 saved milestones hydrate | 14 milestones | PASS |
| Owner/read-only/Leader/SE/Rep+SE display | Same calendar day | PASS |
| JPP PDF target date | Same raw governed calendar day | PASS |
| JPP PPTX target date | Same raw governed calendar day | PASS |
| Live Render Chrome America/Chicago | Mar 31, 2027 | NOT TESTED |
| PostgreSQL certification | No regression | NOT TESTED |
| R2 certification | No regression | NOT TESTED |

The blank `+ New Joint Project Plan` form is recorded as expected behavior and is not a defect.

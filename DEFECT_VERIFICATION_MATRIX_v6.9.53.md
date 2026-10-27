# Defect Verification Matrix — v6.9.53

| JPP-DATE-01 surface/case | Result | Evidence |
|---|---|---|
| PostgreSQL raw DATE | PASS | Real PostgreSQL 16.15 returned `2027-03-31` as a string after adapter registration. |
| pg parser output | PASS | OID 1082 parser returns exact text and is not a `Date`. |
| API `/api/maps` | PASS | Exact `target_close_date = "2027-03-31"`. |
| All Plans | PASS | Actual production renderer shows `Close: Mar 31, 2027`. |
| Hard refresh | PASS | Re-fetch/re-render from authoritative API retains the date. |
| Editor | PASS | Date input value is exactly `2027-03-31`. |
| Public JPP | PASS | Public API and presenter preserve the date-only contract. |
| Internal PDF | PASS | Actual PDF content contains `Mar 31, 2027`; negative strings absent. |
| Customer PDF | PASS | Actual PDF content contains `Mar 31, 2027`; audience preserved. |
| Internal PPTX | PASS | Actual OOXML contains `Mar 31, 2027`; year present. |
| Customer PPTX | PASS | Actual OOXML contains `Mar 31, 2027`; audience preserved. |
| Owner | PASS | Owner receives the exact API date and normal edit capability. |
| Authorized non-owner | PASS | Same date; fields and mutations remain read-only. |
| UTC | PASS | `Mar 31, 2027`. |
| America/Chicago | PASS | `Mar 31, 2027`. |
| America/Los_Angeles | PASS | `Mar 31, 2027`. |
| America/New_York | PASS | `Mar 31, 2027`. |
| DST start 2027-03-14 | PASS | `Mar 14, 2027` in all tested timezones. |
| DST end 2027-11-07 | PASS | `Nov 7, 2027` in all tested timezones. |
| Jan 1 | PASS | `Jan 1, 2027`. |
| Dec 31 | PASS | `Dec 31, 2027`. |
| Leap day | PASS | `Feb 29, 2028`; invalid 2027 leap date rejected. |
| Null | PASS | Remains `null`; existing empty state retained. |
| Invalid date | PASS | Rejected without rollover or synthetic date. |
| 14-milestone hydration | PASS | Real PostgreSQL/API fixture retained 14 milestones. |
| v6.9.51 read-only sharing | PASS | UI and mutation-route capability locks pass. |

Final live Render/Chrome deployment certification is not part of this source matrix and remains required.


# v6.9.47 Defect Verification Matrix

Status vocabulary is limited to **PASS**, **FAIL**, and **NOT TESTED**.

| Defect | v6.9.46 reproduction | Root cause | Correction | Automated | Browser | PostgreSQL | Final certification |
|---|---|---|---|---|---|---|---|
| REG-6945-01 — intentional Three Why clear retained stale content | PASS — supplied live certification proved a cleared Why Now still rendered its old value. | Truthy/sparse merges collapsed omitted and blank states, then the Executive Value Story could refill an intentionally cleared canonical field from legacy/Discovery fallback. | A present blank/`null` persists canonical `null`; omission preserves; compatibility mirrors clear; canonical presence blocks fallback; the client adopts the returned canonical state before success. | PASS — all three siblings clear independently, omitted siblings survive, stale legacy cannot resurrect, replacement works, and all seven Executive/Proposal formats resolve `To validate`. | NOT TESTED — permanent browser fixture added, but the controlled browser blocked local `file:` execution. | NOT TESTED — no safe `DATABASE_URL`. | NOT TESTED |
| Customer-specific application creation used unsupported `prompt()` | PASS — supplied certification reported `prompt() is not supported`. | The active Add Customer-Specific Application action depended on a browser primitive rather than application UI. | Accessible modal with required trimmed name, Cancel, inline error, double-submit lock, stable `APP-CUSTOM-*` identity, `non_standard` source, save-before-close, and failure rollback. | PASS — 15 governed + 2 custom = 17 unique; reload migration and one custom assessment preserve the stable ID. | NOT TESTED — permanent browser fixture added; local-page execution was blocked by browser policy. | NOT TESTED — no safe `DATABASE_URL`. | NOT TESTED |
| Primary SE read-only surface showed `Not Assigned` | PASS — supplied certification showed SE-A in the selector and `Not Assigned` to SE-B in the opened fit. | The assigned-user presence check used the broad directory while rendered options used the narrower viewer-assignable list, so no option could be selected. | A pure presentation authority checks the actual rendered option set and adds the saved assignment as a read-only current option when required. | PASS — Admin, assigned SE, other SE, unassigned, disabled, and inactive/filtered cases; route remains based on `primary_se_id`. | NOT TESTED — browser fixture exists but could not be executed locally under the controlled-browser URL policy. | NOT TESTED — no safe `DATABASE_URL`. | NOT TESTED |

## Regression totals

- Machine release matrix: **3,058 passed, 0 failed, 5 skipped, 5 gate entries NOT TESTED**.
- Corrective suite: **206 passed, 0 failed, 0 skipped**.
- Active output matrix: **29/29 production outputs certified**, with **30/30 matrix assertions passed**.

The source corrections are PASS. Production certification remains NOT TESTED until the browser and PostgreSQL gates run in an approved environment.

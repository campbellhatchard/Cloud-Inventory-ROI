# Defect Verification Matrix v6.9.49

## SOLFIT-6949-01 — Header summary stale after successful scope change

| Scenario | Observable requirement | Status | Evidence |
|---|---|---|---|
| ERP selection | JDE appears in the header immediately after save | PASS | Actual headless-browser production UI test |
| Standard Package | Header, scope body, and progress all report 15 | PASS | Actual headless-browser production UI test |
| Custom application add | First add reports 16; second reports 17 everywhere | PASS | Actual headless-browser production UI test |
| Custom application remove | One deselection reports 16 everywhere | PASS | Actual headless-browser production UI test |
| Application scope change | Shared active-process selector drives every count | PASS | Pure selector plus actual UI behavior |
| Save failure | SAP attempt fails and every surface returns to governed JDE/16 | PASS | Simulated HTTP 503 in actual UI test |
| Refresh parity | Immediate JDE/16 equals reload JDE/16 | PASS | Actual UI reload against mocked saved server state |
| Stable identity | 15 governed plus two unique custom IDs equals 17; remaining ID persists | PASS | Shared-model and inherited v6.9.47 tests |
| Async protection | Saves execute serially and invalidated workspace responses are rejected | PASS | Save-loop behavioral/source invariant and existing workspace-generation protection |

Focused result: 4 passed, 0 failed, 0 skipped, 0 NOT TESTED.

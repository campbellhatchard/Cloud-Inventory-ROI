# JPP Capability Corrective Report — v6.9.51

## Verified root cause

`src/routes/maps.js` and `src/shared/jpp-capability.js` already enforced owner-only JPP mutations and returned `canEditPlan`. The browser correctly disabled mutating controls during its read-only render pass, but `mapUpdateOutputControls()` later treated **Share with prospect** as an ordinary saved-plan output. A clean saved plan therefore re-enabled Share without checking the server-owned edit capability. The same refresh path could affect prospect-link management after re-render or readiness transitions.

## Correction

- `mapApplyCapability()` adopts the server-returned `canEditPlan`; `_mapReadOnly` remains a presentation projection only.
- `mapCanManageProspectLink()` requires `canEditPlan` and the existing saved/clean output readiness.
- Share, Rotate, and Revoke use that combined capability on every refresh.
- Internal/customer PDF and PowerPoint controls continue to use output readiness independently.
- No server rule was weakened or duplicated; all plan and link mutations still pass through the existing owner-only `editablePlan()` route guard.

## Behavioral proof

- Actual `public/map.js` DOM behavior is executed for owner and non-owner plans, including render, reload, dirty/clean, active-link, editing, Add/Remove, AI, and output states.
- The actual `src/routes/maps.js` router is mounted in Express. Non-owner update, share, revoke, and delete requests return 403 and record zero mutations; owner share and revoke succeed.
- Full regression, production locks, prior focused release gate, Brand System, output matrix, lineage, active-output audit, and syntax validation pass locally.

## Remaining acceptance

Disposable PostgreSQL, private R2, supported Node 22 CI, and authenticated deployed owner/non-owner browser acceptance remain external gates and are not reported as PASS.

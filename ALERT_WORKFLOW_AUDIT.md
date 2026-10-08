# Application Alert Workflow Audit — v6.9.34

## Inventory summary

The v6.9.33 baseline contained 231 `showToast(...)` call sites, 27 confirmation-dialog call sites, two direct `alert(...)` calls, multiple inline validation/status regions, and workflow-specific modals and banners. The shared `showToast` entry point was transient and could not distinguish accessible severity or persistence. The two direct alerts were removed in v6.9.34. Confirmation dialogs remain only as user decisions for destructive, provenance-changing, or governed acknowledgement actions; they are not notification channels.

## Shared authority

`public/app-alerts.js` is the common visual/accessibility/audio authority for authenticated application alerts and material Prospect submission failure. `showToast(...)` now classifies its existing callers into that service, avoiding broad business-logic rewrites. Warning/error messages default to persistent and assertive. Info/success messages default to polite and auto-dismiss. Identical active alerts are deduplicated. Audio is off by default, stored only in browser-local preference state, throttled, and never replaces visual or ARIA content.

| Location / workflow | Trigger | Severity | Previous UX | v6.9.34 persistence | Accessible | Audio | Migration / disposition |
|---|---|---|---|---|---|---|---|
| `customer-setup.js` | Required field missing | Error | Not available | Until corrected/dismissed | Alert + summary + field association + focus | Optional single cue | Direct `AppAlerts.error` |
| `customer-setup.js` | Server/database create failure | Error | Browser customer appeared saved | Until retry/success/dismissal | Assertive alert and focused inline summary | Optional single cue | Direct `AppAlerts.error`; input retained |
| `customer-setup.js` | Duplicate candidate | Warning | No customer-first duplicate UX | Until reviewed/dismissed | Assertive alert plus inline choice | Optional single cue | Direct `AppAlerts.warning` |
| `customer-setup.js` | Customer saved | Success | Browser-only transition | Routine auto-dismiss | Polite status | Optional | Direct `AppAlerts.success` after returned ID is active |
| `customer-setup.js` / `customer-switcher.js` | Unsaved context change | Warning | Separate modal/polling behavior | Until choice | Alertdialog plus assertive alert | Optional, throttled | Shared semantics; three explicit choices |
| `customer-switcher.js` | Save or switch failure | Error | Short toast | Persistent | Assertive alert | Optional | Existing message routed through `showToast`/AppAlerts or direct AppAlerts |
| `app.js` / `versioning.js` | Scenario save success/failure | Success/Error | One transient toast channel | Success transient; failure persistent | Polite/assertive by severity | Optional | Existing `showToast` callers centralized |
| `executive-output-adapters.js`, `proposal.js`, `features.js` | Output/readiness failure | Warning/Error | Toast, modal, or inline state | Important messages persistent; governed decision modal retained | Central alert plus existing modal content | Optional | Alert channel centralized; readiness logic unchanged |
| `prospect.html` | Confirm/send submission failure | Error | Native `alert()` | Persistent | Assertive alert | Optional | Native alert replaced; answers remain |
| `discovery.js` | Prospect link/evidence load or apply failure | Error/Warning | Transient toast and review modal | Important message persistent | Central alert; existing evidence modal retained | Optional | Existing calls centralized |
| `features.js` | Rep Confirmed / Three Whys / email failure | Error/Warning | Transient toast or governed confirmation | Important message persistent | Central alert; confirmation preserved for provenance decision | Optional | Business rules unchanged |
| `solution-fit.js` | Save/research/output failure | Error/Warning | Transient toast / inline status | Important message persistent | Central alert plus existing inline state | Optional | Existing calls centralized |
| `map.js` | JPP save/share/output failure | Error/Warning | Transient toast / confirmation | Important message persistent | Central alert; destructive confirms retained | Optional | Existing calls centralized |
| `competitive.js` / `competitive-context.js` | Research/save/approval failure | Error/Warning | Transient toast / inline status | Important message persistent | Central alert plus governed approval UI | Optional | Existing calls centralized |
| `ai-session.js` and AI surfaces | AI provider/context failure | Error/Warning | Surface-specific text / toast | Important message persistent where routed | Central ARIA alert plus existing conversation state | Optional | AI state and prompts unchanged |
| `index.html` admin/profile | Email, export, user/session failure | Error | Transient toast | Persistent | Central assertive alert | Optional | Existing calls centralized |
| `teams-admin.js` | Team-SE explanation | Info | Native `alert()` | Routine auto-dismiss | Polite status | Normally silent | Native alert replaced |

## Confirmation dialogs retained intentionally

The 27 remaining `confirm(...)` call sites guard delete/revoke/reset actions, provenance downgrades, readiness acknowledgements, or scope changes. They require a user decision before a transaction and therefore remain confirmation controls rather than being converted into passive alerts. Examples include scenario/version deletion, Prospect link revocation, ERP-scope change, stakeholder removal, team deactivation, and Review Before Sharing acknowledgement.

## Inline and modal patterns retained intentionally

- Customer Setup keeps inline field errors and a linked validation summary because a global alert alone cannot identify individual invalid controls.
- Executive/Proposal readiness dialogs, Prospect Evidence review, and destructive confirmations remain governed interaction surfaces. AppAlerts supplements but does not replace the required decision.
- AI conversation/status content remains inside its own persistent AI session state; material failures additionally use the shared alert entry point when emitted through `showToast`.
- Legacy `.toast` markup remains as a safe fallback if the alert script cannot initialize, but normal authenticated runtime uses `AppAlerts`.

## Accessibility and audio verification

- Info/success use `role="status"` and `aria-live="polite"`.
- Warning/error use `role="alert"` and `aria-live="assertive"`.
- All messages are visible text with a dismiss control.
- Required fields set `aria-invalid`, link help/error IDs, provide a validation summary, and focus the first invalid field.
- Audio is off by default, throttled, non-overlapping, and wrapped so browser audio rejection cannot interrupt the workflow.
- Audio preference uses only `localStorage['ci_audio_alerts']`; no customer, scenario, evidence, or ROI data is stored locally by this framework.

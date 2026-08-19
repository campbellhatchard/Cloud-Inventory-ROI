# Cloud Inventory ROI Builder v4.3.0

Render-ready release. Promoted from the validated v2.9.3 package (public prospect-link auth fix) with the dependency-free ROI engine test suite restored (`npm run test:engine`).

## Deployment target

- GitHub repository root must contain `render.yaml`, `package.json`, `package-lock.json`, `server.js`, `src/`, `public/`, and `migrations/`.
- Render deploys through Blueprint from `render.yaml`.
- The service is configured as a Node web service with a managed Render PostgreSQL database.

## Render settings

- Build command: `npm ci --omit=dev --no-audit --no-fund`
- Start command: `node server.js`
- Health check path: `/health`
- Node version: `22.22.0`
- Shutdown delay: `15` seconds
- Web plan: `starter`
- PostgreSQL plan: `basic-256mb`

## Initial administrator

- Username: `admin`
- Password: `CloudInventory2026!`
- Email: `admin@cloudinventory.com`

Keep the GitHub repository private because the bootstrap credential is present in `render.yaml`.

## Optional integrations

Add these manually in Render Environment settings only when needed:

- `ANTHROPIC_API_KEY`
- `SENDGRID_API_KEY`
- `FROM_EMAIL`
- `APP_URL`

The application derives its default public URL from Render when possible. `APP_URL` is only needed for a custom domain override.

## Public discovery links

This release preserves the developer update to generate prospect links with `?token=` and supports legacy `#token=` links in `public/prospect.html`.

## v2.9.3 Discovery Link Authentication Fix

This release fixes public prospect questionnaire links returning `401 NO_TOKEN`.

The cause was `src/routes/analytics.js` applying authentication globally while being mounted at `/api`, which intercepted `/api/discovery/sessions/:token` before the public discovery route could run.

After deployment, public prospect links should call:

```text
GET /api/discovery/sessions/:token
```

without requiring a user login session.

## v3.0.1 fixes

- Discovery guide now shows only industry-relevant value-driver sections. Field-service questions appear for Telecom, Engineering & Construction, Oil & Gas, and Minerals & Mining; warehouse throughput/accuracy questions appear for Manufacturing, Distribution, Retail, and Food & Beverage. (Previously all sections appeared on every industry.)
- Prospect discovery links are now hard-gated to an active customer: a link cannot be generated or shown without a customer selected, and the active link displays which customer it belongs to. Switching customers clears any prior session token. This prevents sending one customer's link to another prospect.

## v3.0.2

- Added a dedicated per-user rate limiter on the AI endpoint (/api/enhance), defaulting to 15 calls/minute per authenticated user, to protect Anthropic API spend. Tune via the max value in server.js. The general 100/min per-IP API limit remains in place.


## v3.1.0

Three bundles of improvements:

- Session-expiry handling: expired sessions show a clear message, remember where the rep was, and return them there after signing in again.
- Scenario clone: "Duplicate" a saved scenario as a new business case.
- Version diffing: "Compare versions" shows exactly what changed between two versions of a scenario.
- Industry reframe: "Distribution & 3PL" renamed to "Wholesale Distribution"; "Retail" replaced with "Medical Devices / Life Sciences" (conservative placeholder benchmarks — tune to validated figures; discovery context rewritten for UDI, consignment, recall, FDA/ISO 13485).
- Delivery tracking: discovery links now show open engagement to the rep; business cases can be shared as a trackable view link (no tracking pixels). New migration 008 adds engagement counters and a business_case_shares table.

## v3.1.1 — accessibility pass 1

- Fixed low-contrast status text (rep-confirmed confidence chip now meets WCAG AA).
- Darkened the muted-text token so hint/sub-label text meets contrast guidance across the app.
- Added a clear keyboard focus indicator (:focus-visible) on all interactive elements, including sidebar nav and confidence chips.
- Added an accessible label to the icon-only dismiss button; marked decorative glyphs aria-hidden.

Still open (accessibility pass 2, larger — recommended as its own build): programmatic <label>s for the ~93 calculator inputs, and dialog semantics + focus trapping for modals.

## v3.2.0 — UX enhancements (batches 1 & 2)

Batch 1 — responsive, trustworthy calculator:
- Live count-up animation on the ROI live-bar as inputs change (respects reduced-motion).
- Out-of-range input warnings: benchmark-aware, non-blocking notes that catch fat-finger errors before they reach a CFO.
- Optimistic save status in the header ("Saved ✓ · Ns ago").
- Persistent customer/scenario context header across every tab.

Batch 2 — feedback & safety:
- Undo toasts replace jarring confirm() dialogs for scenario and stakeholder deletes; the destructive action is deferred during the undo window.
- Reusable loading and empty-state helpers for async lists.

Remaining UX (batch 3, planned): discovery-side progress + save reassurance, resumable-discovery welcome-back, guided first-business-case flow, keyboard shortcuts, and a tablet presentation mode for the Executive View.

## v3.2.1 — UX enhancements (batch 3)

- Discovery (prospect side): a persistent "Saving… / All answers saved automatically" indicator, plus a "Welcome back" cue that shows returning prospects their prior answers were kept. (Progress bar and resumable answers were already present.)
- Keyboard shortcuts: "g" then a letter jumps between tabs (g-c Calculator, g-d Discovery, g-e Executive, g-s Saved, g-m Map, g-a Analytics); Cmd/Ctrl+S saves; "?" shows the shortcut sheet.
- Guided onboarding: a dismissible first-business-case coach shown only to reps with no saved scenarios yet.
- Presentation mode: a "Present" button on the Executive View for a full-screen, large-type layout suited to live tablet demos.

## v3.2.2

- Admin → Version history: a new admin-only panel showing a timeline of releases with a summary of each change. Maintained in public/version-history.js (prepend an entry per release).

## v3.3.0

- Rebrand: applied the new colour palette (Dark #1E2931, Blue #00A9CC, Orange #F9642E/#C24A1E, Red #FF341F/#C81E10, Light surfaces) across all CSS, inline styles, generated markup, and PDF/PPT exports. Semantic green and the grey text scale (WCAG-tuned) preserved.
- Win/loss outcome tracking (migration 009): capture deal results + realized value for later benchmark calibration.
- Calculator UX: live progress-tracking stepper, per-section completion, next-best-action nudge, Advanced disclosure, and an optional step-by-step Guided mode.
- ROI dollar-field input guidance: persistent format hints, magnitude sanity warnings, and forgiving paste normalization.

## v3.3.1

- Executive View data infographics: a benefit waterfall (drivers → ramp adjustment → defensible year-1 figure) and a payback timeline (signing → implementation → ramp → break-even). Lightweight SVG in public/exec-infographics.js, brand-themed and print-safe.

## v3.4.0 — benchmark credibility (gap-closing batch A)

- Benchmark sourcing: documented basis for each default-benchmark family (public/benchmark-provenance.js), surfaced in the ROI methodology PDF.
- Provisional-benchmark banner: industries with unvalidated benchmarks (currently Medical Devices / Life Sciences) show a rep-facing warning to confirm figures before external use.

## v3.5.0 — multi-currency display

- Currency selector (USD, GBP, EUR, AUD, NZD) on the calculator, saved per scenario, restored on load.
- All money displays route through a central currency-aware formatter (public/currency.js): symbol + code, US-style grouping (e.g. £1,250,000 GBP). Covers calculator, exec view, ROI methodology + PPT exports, and the public business-case viewer.
- Display only — no exchange-rate conversion. Figures are entered and shown in the selected currency; the ROI math is currency-agnostic (ratios and the customer’s own numbers).

## v3.6.0 — reliability (gap-closing batch B)

- Production error monitoring: server-side errors persist to an error_log table (migration 010) via a resilient logger that never throws. Global Express handler + uncaughtException/unhandledRejection hooks feed it. Admin → Error log shows recent errors with a prune control. Endpoints GET/DELETE /api/logs/errors are admin-gated.
- Automated route/integration tests (test/routes.test.js, node:test): auth boundary (protected routes 401 for anon; public prospect route stays reachable), health, admin-gating of the error log, and a scenario create → server-authoritative ROI → outcome → delete round-trip. Skips cleanly when DATABASE_URL is unset.
  - Run: `npm test` (engine + routes) or `npm run test:routes`. Needs DATABASE_URL, JWT_SECRET, ADMIN_PASSWORD.
- CI: .github/workflows/ci.yml spins up Postgres, runs migrations, and executes both test suites on every push/PR.
- server.js now exports { app, start } and only auto-starts when run directly, so the test suite can boot it on an ephemeral port.

## v3.7.0 — first-class customer entity (Solution Fit phase 1a)

Foundation for the SE Solution Fit & Handoff feature. No user-facing change yet.
- New `customers` table (migration 011): stable id, owned by an AE, case-insensitive unique per owner.
- scenarios.customer_id FK added (nullable, ON DELETE SET NULL). New saves link via ensureCustomer(); existing scenarios are backfilled and linked from their company name. Idempotent; take a DB snapshot before applying.
- /api/customers (list) and /api/customers/:id (owner-scoped; SE cross-customer read arrives in phase 1b/2).
- Integration tests cover customer listing and scenario→customer linking.

## v3.7.1 — bug fixes

- Download PDF (Executive View): fixed “Could not load scenario / data may be corrupted.” Cause: the prospect-logo data URL bloated the print hand-off URL past browser limits, truncating the base64 and breaking JSON.parse in print.html. Fix: always drop the logo from the PDF URL payload (print page falls back to the CI logo), add a 60k-char size guard, and give clearer errors.
- Share & track: fixed the button appearing to do nothing. Cause: fragile exact company+name matching against a possibly-unloaded scenario list, with silent returns. Fix: load scenarios if needed, match case/space-insensitively, and always surface a toast (including the real HTTP error or missing-URL/APP_URL case).

## v3.8.0 — Solution Fit handoff backend (phase 1b)

Backend foundation for the SE Solution Fit & Handoff feature. No user-facing tab yet.
- handoffs table (migration 012): one record per customer (FK to customers, CASCADE), full state in JSONB, cached readiness score + status, last-edited-by.
- Shared readiness engine (src/shared/handoff-readiness.js, UMD) ported from the prototype; served to the browser at /handoff-readiness.js so client and server score identically.
- Routes: GET /api/handoffs/:customerId (empty shell if none) and PUT (upsert; readiness recomputed server-side, authoritative). Owner/admin-scoped, with a marked access-control seam for the Phase 2 SE role (SE cross-customer; AE read+print).
- Integration tests cover auth-gating, empty shell, upsert, and server-computed readiness.

## v3.9.0 — SE role + handoff permissions (phase 2)

The risky structural phase, kept surgical and heavily tested.
- New `se` role (migration 013 adds it to the users role CHECK; idempotent). Admins assign it via user management.
- Access policy centralized in src/handoff-access.js (unit-tested for every role × verb × ownership combination):
  - admin: read+write any handoff.
  - se: read+write ANY customer’s handoff (cross-customer, since an SE supports multiple AEs); sees all customers.
  - rep (AE): read + PRINT only, and only on customers they own; AEs do not write handoffs.
- /api/customers widened: SE/admin see all customers; AE sees their own.
- Scenario/deal ownership is deliberately UNCHANGED — the SE gains handoff + customer-read access, not the ability to modify others’ scenarios (verified: scenario mutations still owner/admin-only).

## v3.10.0 — Solution Fit & Handoff tab (phase 3)

- New "Solution Fit" tab (public/solution-fit.js), namespaced (sf*) to avoid collisions with the main app. Five sections: Context (opportunity/architecture/partner), Demo & Fit checklist, Gap register (with material-gap detail), Integration & drivers, and Readiness.
- Server-persisted via /api/handoffs/:customerId (debounced autosave); NO localStorage. Readiness uses the shared engine served at /handoff-readiness.js so client and server agree.
- Entry is tied to a customer: uses the loaded scenario’s customer_id, or a customer picker (SEs see all customers).
- Permission-aware UI: SE/admin edit; AE gets read + print (inputs disabled, add/delete hidden). Server still enforces authoritatively.
- Handoff documents (internal + customer-facing, branded) are Phase 4.

## v3.11.0 — Solution Fit handoff documents (phase 4, feature complete)

- Two branded handoff documents generated from the handoff state, in the Readiness tab:
  - Internal handoff (Solution Fit, Gap & Services Handoff): summary metrics, business context, architecture & delivery ownership, demo/fit evidence table, full gap register (classification, acceptance, dependencies, open questions), integration drivers, readiness blockers, CONFIDENTIAL footer.
  - Customer-facing summary (Solution Discovery & Demonstration Summary): internal scoping language removed — no gap classifications, no confidential markings, OUT OF SCOPE gaps excluded; includes a "not a Statement of Work" disclaimer, functionality reviewed, requirements requiring validation, shared responsibilities, and items to confirm together.
- Print / Save as PDF opens a self-contained, brand-styled print window (Cloud Inventory palette, page margins) so output renders identically to PDF. Copy-text also available.
- Read + print for AEs: the document toggle, print, and copy work for read-only AE users; editing controls remain SE/admin-only. Server still enforces write access.
- This completes the SE Solution Fit & Handoff feature (phases 1a, 1b, 2, 3, 4).

## v3.12.0 — roles, admin access, responsive, dictation, customer search

- Distinct roles: Account Executive (AE = rep) and Solution Engineer (SE) are now separate, assignable options in create + edit user (backend already supported se since v3.9.0; this exposes it in the UI). Badges/labels distinguish AE / SE / Admin. Existing combined-role users display as AE.
- Admin full access: admins can view (View all) and edit any user’s scenarios/handoffs. Admin-on-behalf edits preserve the original owner and are logged (audit action admin.edit_on_behalf) for accountability.
- Solution Fit fixes: the Internal / Customer-facing document toggle and Print / Save as PDF now work (tab re-render was not re-binding handlers).
- Responsive layer (public/style.css): desktop / tablet (641–1024) / phone (≤640) tiers plus touch (pointer:coarse) tuning — larger tap targets, iOS-zoom-safe inputs, Solution Fit tabs scroll, tables/doc preview scroll, single-column stacking. Feature/viewport driven, not device sniffing.
- Microphone dictation (public/dictation.js): Web Speech API mic button on text fields (three-whys + all Solution Fit textareas). Degrades gracefully where unsupported; needs HTTPS + mic permission.
- Customer search on the calculator landing: type-ahead to find an existing customer and load their most recent scenario.

## v3.12.1 — bug fix

- Fixed Solution Fit being read-only for SE and admin users. Root cause: the module called a bare `getUser()` that is not global (the app exposes it as `window.ciAuth.getUser`), so role resolution always failed and defaulted to read-only. Now uses `window.ciAuth.getUser()` (matching the rest of the app); SE/admin edit, AE read+print. Same bare-getUser bug fixed in the new customer search.

## v3.13.0 — Solution Fit v2 + admin Customers landing

Context tab (public/solution-fit.js):
- Solution Engineer is now a dropdown of SE + Admin users (new SE-readable endpoint /api/solution-engineers), defaulting to the logged-in SE/admin.
- Cloud Inventory products = checkboxes MEP / CIP / CPP / Platform + Other (free text).
- Business owner and Technical owner each capture name, title, email, phone (email/phone optional).
- Known customizations to the system of record: Yes/No; on Yes, repeatable {module, description, impact} rows (impact None/Low/Med/High) with + Add another.
- Primary integration method now includes Standalone.
- Removed Opportunity ID and Locations / operating scope. Old handoffs migrate-on-read (no data loss).

Other:
- Demo & Fit "Add process" restyled to a high-contrast brand button.
- Headline calculator KPIs (Annual benefit / Year-1 ROI / 3-yr / 5-yr NPV) read $0 until a customer is selected AND inputs entered, or a saved scenario is loaded.
- New admin-only "Customers" landing tab (public/admin-customers.js): all customers across the team, search, drill into a customer to load a saved scenario or start a new one; admin edits remain audit-logged.
- Handoff documents updated to render the new products/owner/customization fields.
- ROI engine unchanged: 22/22 engine tests still pass; calculation credibility unaffected.

## v3.14.0 — brand consistency & design-system audit

A senior UX/UI pass across every page, document, and export. Presentation-layer only — the ROI engine is unchanged (22/22 tests still pass).

**Phase 1 — fixed off-brand colors on customer-visible surfaces:**
- pptx-export.js: the entire PPT deck ran an old, pre-rebrand palette (navy #243646, cyan #00A7CF, orange #F79424) — now canonical.
- business-case.html (the shared ROI link prospects open): had its OWN stale `:root` silently overriding the real brand tokens, AND used Helvetica Neue instead of Inter (the font wasn't even loaded). Both fixed.
- prospect-map.html: same stale-palette issue, plus a regressed accessibility contrast fix (old low-contrast gray had crept back in).
- deal-export.js, discovery.js, stakeholders.js: same intermediate draft palette, reconciled to canonical tokens.
- Fixed a genuine accessibility regression found along the way: a low-contrast gray (#94A3B8), already corrected in the main app's CSS, was still hardcoded as literal text color in 8 files (features.js, narrative.js, print.html, login/prospect/change-password/reset-password.html, index.html) — all corrected to the accessible value (#6B7A8D).

**Phase 2 — formalized the extended categorical palette:**
- New tokens: --chart-teal (#12786F), --chart-violet (#6A4C93), --chart-gold (#A6791E), --chart-slate (#45688A), --chart-berry (#A23E5C) — designed to complement the 5 core brand colors without colliding with success/danger meaning, and to fix the old set's two nearly-identical purples.
- New public/brand-palette.js: single source for the value-driver chart colors and deal-stage colors, previously duplicated verbatim in app.js AND versioning.js (a drift risk — a color change in one would silently not apply to the other).
- Every scattered old categorical hex (teal/brown/purple family) across the whole app — charts, stage tags, audience tags, stakeholder roles, password-strength meters, audit-log action colors — reconciled to the new tokens.

**Phase 3 — component consolidation:**
- ~30 of ~49 near-duplicate badge/pill/tag CSS rules normalized to one consistent shape (2px 8px padding, 10px radius, 10px font) — metrics only, no class renames, so no call sites changed.
- New shared .pill base class + 10 color modifiers (public/style.css) for any new badge going forward.
- Card-container radius outliers (sf-card, ac-card) routed through the existing --radius-md token.

**Phase 4 — spacing & type scale:**
- New tokens: --sp-1..6 (4/8/12/16/24/32px) and --fs-xs..2xl (11–32px, 7 steps replacing ~20 ad hoc sizes).
- 246 existing declarations that already matched the scale exactly were tokenized (zero visual change — same pixel output, just referencing the scale instead of a magic number). No blanket changes were made to values that didn't already fit the scale, to avoid unverified visual regressions.

**New reference artifact:** public/style-guide.html — open in a browser to see the full palette, type scale, spacing scale, and components live.

## v3.15.0 — How to Use guide update + responsive hardening

- Updated the in-app How to Use guide (migration 014, applied once to existing databases; 002 seed updated for fresh installs):
  - Removed the default admin credentials from the Admin guide. Credentials are now described as provided separately to authorized administrators.
  - Refreshed terminology and content for AE/SE roles, the admin Customers landing, customer search, and dictation.
  - Added a new "Solution Fit & Handoff (SE)" guide page.
- Responsive display hardening (mobile / tablet / PC): global horizontal-overflow guard on the main content, media (img/svg/pre/canvas) constrained to container width, long unbroken strings wrap, tight fixed-width boxes (prospect link, map share box) go fluid on phones, a tablet tier for the 4-up grids, and viewport-capped modals. Viewport meta confirmed present on every page.
- Note: the admin password still exists in migration 003 (the functional admin-account bootstrap) and in README.md (developer notes) — neither is the in-app admin guide. The 003 re-seeding behavior remains as previously scoped.


## v4.0.0 — UI/UX rebuild

A full presentation-layer rebuild across every page. **No calculation, route, migration or
stored value was changed.** The ROI engine, `src/`, `migrations/` and the test suites are
byte-identical to v3.15.0; `npm run test:engine` still passes 22/22.

### Brand
The six brand colours are unchanged — Dark `#1E2931`, Blue `#00A9CC`, Orange `#F9642E`,
Red `#FF341F`, Light Blue `#F5F8FA`, White. v4 changes how they are *used*: Blue is the
single action colour, Dark is the frame, Orange carries every advisory notice, and Red is
reserved for destructive actions.

### What changed

**1. Navigation — thirteen flat tabs became a workflow.**
The sidebar now reads Deal workflow (1 Discovery guide → 2 Calculator → 3 Executive view →
4 Solution Fit), then Strengthen the case (Competitive, Sensitivity, Action Plan,
Stakeholders), Library (Saved, Compare, Customers, Analytics, Impact Map) and Settings
(How to Use, Admin). Every destination and every `switchTab()` target is unchanged.

**2. The live KPI bar belongs to the model.**
It was pinned to all sixteen screens, costing 60px everywhere and showing four em-dashes on
Admin, Help and Stakeholders. It now shows on Calculator, Executive view, Sensitivity and
Compare, and hides elsewhere (`body.livebar-off`).

**3. Action hierarchy.**
Any action row with five or more buttons collapses to one primary, one secondary and a
**More** menu. The Executive view header went from eleven equal-weight buttons to three.
Buttons keep their ids and their `onclick` handlers — they are moved, not rebuilt.

**4. One stepper instead of four progress affordances.**
The calculator stacked a breadcrumb, a completeness meter, a progress bar and a
next-best-action banner above the first input. The breadcrumb is hidden, the completeness
meter is now a slim rail, the nudge is one line of guidance, and the stepper carries the
state.

**5. Form ergonomics.**
Currency and percentage moved out of the label text (`Annual revenue ($)`) into a real
affix on the control. Labels are 13px with a proper `for`/`id` pair. The type floor rose
from 11px to 12px, so hints, benchmarks and table cells meet contrast and size guidance.

**6. One icon language.**
The emoji glyphs in controls (🔗 ✉️ 📋 📄 📊 🖥 👥 ✨) are replaced at runtime with a single
inline SVG set that inherits `currentColor`.

**7. Design tokens.**
Neutrals, radii, shadows, focus ring, a seven-step type scale and a 4px spacing scale were
rebuilt in `:root`. Four tokens that were referenced but never defined — `--radius`,
`--shadow-lg`, `--ink`, `--font-mono` — now exist, fixing silent fallbacks.

**8. Pages.**
`login.html` is a two-panel brand layout. `style-guide.html` is rebuilt as the live v4
reference (open it in a browser). The executive document, tables, sub-tabs, notices,
modals and empty states were normalised to one treatment. `print.html` geometry was left
alone deliberately.

### Files touched

| File | Change |
| --- | --- |
| `public/style.css` | New token foundation + a v4 consolidation layer at the end |
| `public/exec.css` | v4 document layer appended |
| `public/ui-v4.js` | **New.** Runtime enhancement: livebar context, icons, More menus, input affixes |
| `public/index.html` | Sidebar restructured; `ui-v4.js` loaded; version stamped 4.0.0 |
| `public/ux-enhancements.js` | Context bar shows customer initials instead of an emoji |
| `public/login.html` | Rebuilt |
| `public/style-guide.html` | Rebuilt |
| `public/change-password.html`, `reset-password.html`, `prospect.html`, `business-case.html`, `prospect-map.html` | Shared control metrics, focus ring, type |
| `public/print.html` | Border token value only |
| `public/version-history.js`, `package.json`, `README.md` | 4.0.0 |

### Rollback
Every change is additive or replaces a stylesheet. To revert the runtime layer alone,
remove `<script src="ui-v4.js"></script>` from `public/index.html`; the app returns to its
previous behaviour with the v4 styling intact.

## v4.1.0 — stability fixes + easier navigation (on the v4 UI base)

Navigation / scrolling:
- New global "back to top" button (bottom-left) appears on any tab once scrolled past ~400px; switching tabs now scrolls to the top of the new tab automatically. The impact map keeps its own scroller-aware button (no duplicate). Added a self-contained back-to-top to the long prospect discovery page (prospect.html).
- Deal workflow reordered: Calculator (1) → Discovery guide (2) → Executive view (3) → Solution Fit (4), so customer details are entered before discovery (discovery links are tied to a customer).

Bug fixes:
- Executive PDF (print.html): loads /roi-engine.js and only narrative.js (was pulling all of app.js, whose top-level recalc/DOM code threw); heals corrupted ramp values on render. Resolves "Could not load scenario / Data may be corrupted".
- app.js load-order: guarded cross-file globals (prospectLogoDataUrl, confirmedFields) and the todayDate write; deferred the top-level recalc() to the post-load init. Resolves the ReferenceError at load.
- Discovery "Switch" button: now switches to the calculator tab so the customer gate is visible (it lives inside that pane).
- Three Whys: now captured into the scenario save payload and restored on load, so Executive-view edits persist.
- Save dialog: removed the misleading "Overwrite current" (versioning is append-only; it always incremented anyway).
- Ramp %: fixed the save/reload double-division that turned 40% into 0.4% (and self-heals already-corrupted scenarios).
- Customer search: hardened against Chrome autofilling the login username.
- Executive scenario range (Conservative/Base/Aggressive): the global livebar no longer shows on the Executive view, so the only ROI figures shown are the scenario-aware ones that respond to the toggle.
- PowerPoint export: loads pptxgenjs from jsDelivr npm (minified) with jsdelivr allowed in CSP connect-src — removes the MIME-type and sourcemap console errors.

ROI engine unchanged: 22/22 engine tests pass.

## v4.2.0 — prospect experience, scenario navigation, guided mode & share tracking

Consolidates all work since v4.1.0 on the v4 UI base. ROI engine unchanged (22/22 tests pass). Two new migrations: 014 (help guide refresh + admin credentials removed from the in-app guide) and 015 (trackable scenario_shares table).

Prospect discovery page (prospect.html):
- Sticky progress header: answered count, percentage, estimated time remaining, milestone messages.
- "What your answers help assess" panel — 7 value areas that fill in as the prospect answers (driven off each question's sync field; verified across all industries). Uses customer-facing language, not the internal rep-facing "why" text.
- Per-question value context, and an "I'm not sure" option that records the gap without counting as data.
- Percentage questions get a slider + precise box; number questions get live thousands separators (display-only — stored values stay raw for rep-side sync).
- Review-and-confirm screen before submitting, with edit-and-jump back to any question.

Calculator:
- Scenario picker dropdown: switch between a customer's scenarios in place (guarded by the unsaved-changes check).
- Version history reachable directly from the calculator.
- Sticky action header with primary actions (Save, Executive view) always reachable.
- Guided mode: progress stepper moved to the top and sticky; sections numbered to match the stepper dots.

Sharing & tracking:
- New trackable, revocable scenario share links (migration 015). The old #share= links (which embedded the whole scenario in the URL and could not be tracked or revoked) still work for links already sent, but new links are token-based.

Reliability:
- Unified unsaved-changes guard across in-app navigation, logout, and browser close/refresh/back.
- Fixes carried in: executive PDF engine load, prospectLogoDataUrl load-order crash, ramp % save/reload double-division (+ self-heal), removal of the misleading Overwrite button, Chrome autofill hardening on customer search, executive scenario-range ROI, PowerPoint export via CDN, and the Calculator-first workflow order.
- Guided toggle now uses aria-checked (correct for role="switch").

## v4.3.0 — Phase 1 "Modern SaaS" visual pass (calculator)

Presentation-layer only. Implemented as a single additive block at the END of public/style.css, marked `PHASE 1 — "Modern SaaS"`, so the whole pass can be reverted by deleting that block. Uses only existing design tokens — no new palette.

**1a — results elevation**
- The live bar gave four metrics equal weight, so nothing read as "the answer". Annual benefit is now the hero (larger, tighter tracking, brighter label); ROI / payback / NPV support it. Grid re-weighted to 1.55fr / 1fr / 1fr / 1fr.
- Value changes animate with a restrained bump rather than a scale pop.
- The results grid at the foot of the calculator follows the same hero logic, so the top bar and detail grid tell one consistent story. Tabular numerals throughout so figures align as they change.

**1c — visual language**
- One elevation system: a card nested inside an accordion is now a grouping (flat, tinted) rather than a second floating surface, removing compounded borders/shadows.
- Rhythm: labels sit closer to their inputs; more space between logical groups. Card titles get a hairline underline for section separation.
- Accent discipline: cyan reserved for interactive/important; the input focus ring is the strongest accent moment on the form.

Not included (deliberately held): 1b input tiering and 1d top-chrome consolidation — 1d overlaps the sticky header shipped in v4.2.0 and should wait until that is verified live.

Note: 11 pre-existing rules elsewhere in style.css use font-weight 800, which is not among the loaded Inter weights (400/500/600/700) and will fall back. Not changed here — flagged for a future cleanup.

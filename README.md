# Cloud Inventory ROI Builder v3.2.3

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

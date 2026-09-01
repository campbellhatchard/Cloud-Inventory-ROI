# Cloud Inventory Brand System Audit - v6.7.2

## Release scope

v6.7.2 closes the active Brand System v1.0 enforcement residuals found after v6.7.1 without changing ROI Model v2.8. The canonical source, document/email adapters, type scale and logo metadata remain unchanged.

## Before / after literal report

The v6.7.0 baseline contained 16 direct active logo filename selections in browser UI/output code; that count remains 0 outside the canonical/generated implementation. v6.7.2 expands the scan from selected output modules to real reachable UI, client, stylesheet, server and output surfaces. Active occurrences of `#00AECF`, `#042C53`, `#00AEEF`, Calibri, Aptos and Helvetica Neue are all 0.

## v6.7.1 residuals closed

- Customer Business Case: the provenance banner and its high/medium/low chip now use centralized information, success, warning and neutral roles. Its customer-safe wording now distinguishes documented model assumptions from approved benchmarks.
- Prospect Link: the time-basis badge no longer carries an obsolete `#00AECF` fallback. Palette-like gray/white fallbacks were also removed; local radius and box-shadow fallbacks remain intentional technical layout fallbacks.
- Session expiry: the early-loading client creates an accessible semantic dialog and Primary action class. Generated CSS tokens own colour, hover and focus; JavaScript no longer assigns corporate colours.
- Main provenance banner: information treatment and provenance states use the same centralized semantic roles as the Business Case.
- Admin purge page: server-rendered inline CSS resolves its font, canvas, surface, text, muted text, success/danger, button, border and focus values through the shared server Brand helper.

## Output migration

- Competitive battlecard Word: shared internal document theme, role-selected high-resolution logo, shared type scale and internal footer.
- Executive proposal Word: shared customer document theme, role-selected high-resolution logo, shared type scale and customer footer.
- Solution Fit handoff and risk ledger: shared browser document CSS and audience metadata.
- Joint Project Plan, stakeholder, ROI methodology and competitive print/PDF: shared document CSS and centralized customer/internal footers.
- Executive ROI print and proposal previews: semantic logo roles, centralized document roles and customer footer.
- Transactional email: shared server-side email theme and approved font stack.

## Standalone-page integrity

Login, password, Prospect Link, Prospect Joint Project Plan, business-case and print pages retain page-specific layout aliases where useful, but no longer redefine canonical navy, cyan, green, red or font variables with independent literals. Generated tokens remain authoritative.

## Intentional compatibility allowlist

- Historical logo files remain on disk for old cached links and saved artifacts, but active code cannot reference them directly.
- Historical release notes and locked test fixtures remain immutable evidence.
- Non-corporate chart colours and third-party-required render values are permitted only when resolved from a canonical chart or semantic role.
- Existing component aliases in `public/brand-tokens.css` remain generated compatibility bridges; they are not independent sources.

## Enforcement and validation

`test/v671-brand-integrity.test.js` retains output and logo enforcement. `test/v672-brand-final-enforcement.test.js` additionally scans Business Case, Prospect Link, early client API, shared and Executive styles, server HTML, the application shell, and existing governed output modules. It verifies the session-expiry redirect/focus contract, Business Case wording, Prospect badge, provenance states and server purge helper. `scripts/generate-brand-assets.js --check` rejects generated drift. The full application suite remains the release gate.

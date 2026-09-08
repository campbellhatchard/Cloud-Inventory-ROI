# Cloud Inventory Brand System

## Brand source

`config/cloud-inventory-brand.json` is the only authoritative machine-readable source for brand version 1.0. It governs core, neutral, semantic, status, document, email and chart colors; web and Office typography/type scale; logical logo roles and dimensions; audience labels; confidentiality language; spacing, radius and shadow primitives.

Run `node scripts/generate-brand-assets.js` after an approved token change. This generates `public/brand-tokens.css` and `public/brand-system.js`. CI uses `node scripts/generate-brand-assets.js --check` to reject drift. Server and test code consume `src/shared/brand-system.js` directly from the canonical JSON.

## Token inventory

- Core: dark, blue, orange, red, light blue and white.
- Working: blue dark/pale, green, deep red, orange dark, canvas, border and muted.
- Semantic: text, muted text, link, focus, surface, info and warning text.
- Status: complete, current, future, blocked and warning. Every state includes a label and icon name so meaning is never communicated by color alone.
- Charts: governed eight-color categorical sequence for web and Office exports.
- Neutral: eight steps from neutral 50 through neutral 800 for borders, canvases, muted copy and hierarchy.
- Documents: background, canvas, heading/body, muted, accent, border, table, information, warning, success and danger roles.
- Email: background, surface, header, accent, button, body, muted, border and message-state roles.
- Type: Inter for web and Office when available; Segoe UI/system fallbacks on web and Arial/Segoe UI fallbacks for Office recipients.
- Type scale: governed display, page title, section heading, body, label, small, caption and KPI sizes for browser and Office outputs.

## Logos

Active code requests `logoColor`, `logoNegative` or `logoOfficeHighResolution`. File names, intrinsic dimensions, aspect ratio, alternative text and fallback role are implementation details held in the brand source. Older duplicated image files remain compatibility assets only and must not be selected by new feature code.

## Audience and output rules

Customer outputs use `Cloud Inventory / Confidential and Proprietary`. Internal outputs use `Cloud Inventory / Confidential - Internal Use Only`. Copyright years are generated at runtime. Covers use the color or negative role based on surface contrast. PowerPoint uses `officeTheme()`. Word uses `documentTheme(audience)`. Browser print/PDF and Solution Fit documents use `documentTheme()` plus `documentCss()`. Email uses `emailTheme()` on the server. Route-local primary themes are prohibited.

## Accessibility

Body text uses dark or the accessible muted-text semantic token. Small informational links use the darker accessible link token, not bright blue. Keyboard focus uses the centralized focus token. Statuses always pair color with visible text or an icon. The automated brand suite checks key text/background contrast pairs.

## Change process

1. Change the canonical JSON in a reviewed release.
2. Regenerate browser assets.
3. Review the live style guide.
4. Run brand parity, contrast, version and full regression tests.
5. Render representative PDF, PowerPoint and Word outputs before release.

## Enforcement

The v6.7.2 integrity suite rejects generated-asset drift, direct governed logo filenames in active UI/output code, standalone canonical-variable literal shadows, Calibri/Aptos/Helvetica Neue primary output themes, retired corporate-blue/server-theme literals, route-local corporate themes, and non-centralized audience labels. Compatibility assets and immutable historical evidence may remain, but cannot be selected by active output code.

Early-loading authenticated browser components must use generated CSS tokens and semantic component classes even when `brand-system.js` has not executed yet. Server-generated standalone pages must obtain their inline values from `src/shared/brand-system.js`; typing a second local palette into a server HTML template is not permitted.

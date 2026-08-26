/* ═══════════════════════════════════════════════════════════════════
   version-history.js — admin-only changelog
   A curated record of releases and their changes, rendered as a timeline
   in Admin → Version history. To add a release, prepend an entry to
   VERSION_HISTORY (newest first). Keep summaries short and rep-readable.
   ═══════════════════════════════════════════════════════════════════ */

const VERSION_HISTORY = [
  
  {
    version: '5.5.9', date: '2026-08-26', tag: 'hotfix',
    title: 'Competitive source migration hotfix',
    summary: 'Corrects migration 022 so uploaded_by and created_by use UUID foreign keys to match users.id.'
  },
{
    version: '5.5.8', date: '2026-08-25', tag: 'fix',
    title: 'Full regression pass: added missing cr-badge-client CSS class',
    changes: [
      'Regression pass caught a missing CSS class: .cr-badge-client (purple badge for AI-researched items from browser sources in the competitive research panel) was referenced in comp-research.js output but had no matching CSS rule. Added alongside the existing cr-badge-file, cr-badge-web, cr-badge-ai, and cr-badge-cur classes.',
      'Confirmed all other 106 regression checks pass: 17 ROI engine tests, 17 phase-1 spec tests, 3 version consistency checks, 41 JS files syntax-clean, 11 server files syntax-clean, 1859 CSS braces balanced, 5 HTML pages div-balanced, 22 migrations sequential, 65 feature integrity checks, 41 UX/UI checks, 12 security checks, 36 critical IDs present.'
    ]
  },
  {
    version: '5.5.7', date: '2026-08-25', tag: 'fix',
    title: 'Dollar field hint text no longer overlaps the input value',
    changes: [
      'injectFormatHints() placed the hint div immediately after the <input> element using insertAdjacentElement("afterend"). However, ui-v4.js runs later and wraps that same input in an affix-wrap flex container (the $ prefix). The hint ended up trapped inside the affix-wrap, which is a flex row, causing it to render inline next to the input text and overlap the value. Fixed in two ways: (1) injectFormatHints now checks for an existing affix-wrap or .field parent and inserts after that instead; (2) a requestAnimationFrame pass re-anchors any hints that still ended up inside an affix-wrap after ui-v4 ran. The fmt-hint CSS is also hardened to display:block with width:100% so it cannot collapse into an inline element regardless of its container.'
    ]
  },
  {
    version: '5.5.6', date: '2026-08-25', tag: 'fix',
    title: 'How to Use fixed; client-side errors now captured in Admin error log',
    changes: [
      'How to Use tab stuck on "Loading...": initHelpTab was awaiting window._authReady with no timeout. If the auth promise never resolved (race condition on page load), the tab hung indefinitely. Fixed with a 5-second timeout using Promise.race so the help content always either loads or shows a clear error message. The content area now also shows an error state (not just the TOC sidebar) when the API call fails.',
      'Client-side error capture: added window.onerror and unhandledrejection handlers that POST browser JS errors to a new /api/errors/client endpoint. These are written to the existing error_log table with source prefixed "client:" so they are distinguishable from server errors. Errors are queued before the page is fully loaded and flushed via XHR to avoid losing early boot errors. A global logClientError(msg, source, level) helper is also available for manual instrumentation.',
      'Admin Error log tab improved: shows All / Server / Client filter pills so admins can focus on browser-only or server-only errors. Each entry now shows a "browser" (purple) or "server" (teal) badge alongside the source label. Stack traces are expandable via a toggle button rather than always-visible, keeping the list scannable. The warn level now has its own amber styling.'
    ]
  },
  {
    version: '5.5.5', date: '2026-08-25', tag: 'fix',
    title: 'Competitive battlecard Word export: replaced broken CDN with HTML-in-Word',
    changes: [
      'Export Word on the competitive battlecard page was failing with "Failed to load docx library" because docx@8.5.0 was being loaded from cdn.jsdelivr.net at runtime, and the Render hosting environment blocks that CDN URL (403 host_not_allowed). Replaced the entire CDN-dependent approach with the HTML-in-Word technique: generates a styled HTML document with Word XML namespaces and serves it as a .doc file via Blob URL. Word, Google Docs, and LibreOffice all open it natively. Zero external dependencies, no CDN, no runtime script injection. Also removed the duplicate copy of exportCompDocx that had accumulated from earlier append operations.'
    ]
  },
  {
    version: '5.5.4', date: '2026-08-25', tag: 'fix',
    title: 'Export fixes: PDF popup fallback, pptxgen lazy-load, menu onclick order',
    changes: [
      'Download PDF: when the browser blocks the pop-up (common in Render\'s hosted environment or fullscreen presentation mode), a dismissible notification bar now appears with a direct "Open PDF in new tab" link. Previously it silently failed or showed a vague toast.',
      'More exports menu: champion pack, role one-pager, ROI methodology PDF/PPT were not firing reliably because toggleExecMore() was called before the export function. Browsers treat window.open and async operations as untrusted if they don\'t happen directly in the user gesture. Fixed by swapping the order: close the menu first, then run the export.',
      'deChk (PowerPoint library check) upgraded from synchronous to async with lazy-loading: if pptxgen isn\'t loaded yet (CDN still fetching), it now polls for up to 6 seconds then attempts a fresh script inject before giving up. Previously it returned false immediately with a toast, causing champion pack and one-pager to silently abort on slow connections.',
      'dePrintWindow (ROI methodology PDF, action plan print, stakeholder print) now generates a Blob URL fallback when window.open is blocked, showing a clickable link rather than an unhelpful "Pop-up blocked" toast.',
      'All export functions that call deChk are now properly async/await-chained: printActionPlan, printStakeholderMap, roiMethodologyPDF (were missing async keyword).'
    ]
  },
  {
    version: '5.5.3', date: '2026-08-25', tag: 'fix',
    title: 'Saved scenarios visible again; sensitivity analysis chart fixed',
    changes: [
      'Saved scenarios bug fix: the ownership filter defaulted to "Mine" (ownershipFilter = \'mine\') while the UI showed "All" as the active button, so the list was filtered to empty even when scenarios existed. Fixed by defaulting to "all" and marking the All button active in HTML.',
      'Saved scenarios empty state: the check for no results used !display.length (before the ownership filter was applied) instead of !filtered.length (after). When filter excluded all results, it still rendered an empty <ul> with no message. Fixed to show "No scenarios match the current filters" when filters are active.',
      'Saved scenario cards redesigned: company name is now the primary anchor with rep badge shown inline for scenarios owned by other reps, deal stage and outcome pills have their own row, and the Load button is now the primary CTA (teal) with other actions as ghost.',
      'Sensitivity analysis chart: the bars had almost no CSS, so the neg-fill and pos-fill divs had no visible height or color. Added full chart CSS: grid layout for label/bars/values, red gradient for -30% bars, green gradient for +30% bars, center axis line, and legend. Chart now renders as a proper tornado diagram.',
      'AI competitive research (v5.5.2 work): added /api/competitive/research and /api/competitive/ci-source server routes, migration 022 for competitive_sources tables, comp-research.js UI, and competitive sub-tabs. Full dual-source research with provenance-tagged output.'
    ]
  },
  {
    version: '5.5.2', date: '2026-08-25', tag: 'fix',
    title: 'Discovery guide: section collapse/expand now works',
    changes: [
      'Root cause: section header buttons used JSON.stringify() to embed the section title in an onclick attribute, but JSON.stringify wraps strings in double quotes. Since the onclick attribute itself uses double quotes, the browser saw onclick="toggleDiscSection(\"Value-engineering core (must-ask)\")" — the inner double quotes terminated the attribute early and the click handler was silently dropped. Every section header appeared clickable but did nothing. Fixed by using single-quote wrapping with proper apostrophe escaping instead of JSON.stringify.'
    ]
  },
  {
    version: '5.5.1', date: '2026-08-25', tag: 'feature',
    title: 'Executive view redesigned — larger Three Whys, persistent mic buttons, sidebar',
    changes: [
      'Three Whys editor rebuilt: each field is now 5 rows tall (was 3) with a larger font and more breathing room, making it practical to write a full paragraph without scrolling inside the box.',
      'Persistent mic button inside each textarea (bottom-right corner). Previously the mic icon was injected dynamically by SFDictation.enhanceAll() after the tab loaded, making it invisible until you knew to look. Now each field has a clearly visible mic button at all times. Clicking it calls SFDictation if available (Chrome/Edge), or shows a graceful fallback toast on unsupported browsers. The button pulses red while recording.',
      'AI enhance button is now teal/filled and lives in the card header next to Reset, as the primary action on the card. It was previously a small secondary button buried in a toolbar with other controls.',
      'Audience selector is now pill chips (Mixed / CFO / COO / CEO / CIO) instead of a dropdown. Five options in a row is more scannable than a collapsed select. A hidden select element is preserved for back-compat with refreshExec().',
      'Two-column layout: Three Whys on the left, a right sidebar showing the value breakdown bar chart and cost-of-delay cells. Populated live by renderExec() so the rep can write "labor saves $980K" while confirming that number without switching sections. Stacks to single column on mobile.',
      'Narrative completeness bar in the card footer shows what % of the three fields are filled (threshold: >15 characters), so reps know before export if they left a field empty.',
      'Value breakdown sidebar card shows a horizontal bar chart per driver. Cost-of-delay sidebar card shows per-month / 6-month / 12-month foregone value, with the 6-month cell highlighted in red as the most likely scenario.'
    ]
  },
  {
    version: '5.5.0', date: '2026-08-25', tag: 'feature',
    title: 'Mutual Action Plan redesigned — card view, overdue alerts, rep visibility, admin filters',
    changes: [
      'Complete list view redesign: replaced the plain bullet list with cards. Company name is the visual anchor (large, bold), plan title sits below it as secondary text, and each card shows a color-coded progress bar (red/amber/green), share status dot (green = live with prospect, grey = draft), close date, and an overdue or on-track pill.',
      'Clicking anywhere on a card opens the plan — no separate Open button needed. Delete is still a button to prevent accidental opens, but is suppressed on plans the rep doesn’t own.',
      'Overdue alert banner is always shown when any of your plans has overdue milestones. Lists each affected company and count inline. Cannot be dismissed — by design, so reps can’t ignore it.',
      'Stats strip at the top shows total plans, overdue milestone count (amber), shared-with-prospect count (green), and (admin-only) active rep count.',
      'Rep view now shows two sections: "Your plans" (full edit/delete access) and "All reps’ plans" (read-only, no delete). Reps can open any plan to view details but cannot delete plans they don’t own.',
      'Admin view shows a flat table with filter bar: filter by rep, status (overdue/on-track/shared/draft), and company search. A live count shows how many plans match the current filters.',
      'loadMaps now always fetches all=true for both roles. Client-side ownership check determines edit/delete access, matching the server-side guard that was already in place.'
    ]
  },
  {
    version: '5.4.9', date: '2026-08-25', tag: 'feature',
    title: 'Solution dropdown simplified to CIP/MEP; competitive battlecard upgraded with full PDF battlecard data',
    changes: [
      'Calculator: Cloud Inventory solution dropdown now shows only Cloud Inventory Platform (CIP) and Mobile Enterprise Platform (MEP) — removed the legacy All/Platform, Warehouse Operations (WMS), and Manufacturing Materials options. Default changed from "all" to CIP.',
      'Competitive displacement: added a solution filter (CIP or MEP) at the top. Selecting a solution filters the competitor dropdown to show only relevant competitors for that product. CIP shows SAP, Oracle WMS, Legacy RF, Spreadsheets, ERP-native, and Other WMS. MEP shows Low-code platforms (Power Apps/Mendix/Appian) and ERP Mobility/Scanning (RFgen/RF-SMART).',
      'All COMP entries now carry the full battlecard data from the official PDFs: target account profile, target buyers, competitive landscape, competitive reframe strategy, prequalify discovery questions, qualify discovery questions, and why-Cloud-Inventory-wins points. These all render in expandable sections below the main pain/advantage grid.',
      'Added two new MEP-specific competitors: Low-code Platform (Power Apps/Mendix/Appian) and ERP Mobility/Scanning (RFgen/RF-SMART), each with full battlecard content sourced from the Mobile Enterprise Platform battlecard PDF.',
      'Each competitor card now shows a product badge (CIP or MEP) so reps know which product motion to lead with.',
      'Talk tracks added for all eight competitor entries including the two new MEP-specific competitors.'
    ]
  },
  {
    version: '5.4.8', date: '2026-08-25', tag: 'feature',
    title: 'Competitive battlecard redesign — structured layout, talk tracks, PDF & Word export',
    changes: [
      'Competitive displacement page rebuilt from a plain text dump into a structured battlecard: competitor name and "Current solution" tag at the top, a three-column cost/time/maintenance strip, then a clean two-column grid (Pain points on the left, Cloud Inventory advantages on the right) with red/green dot indicators and column headers that explain the intent to new reps.',
      'Added per-competitor talk tracks — a paragraph-length opening line for the first call or email, with a "Copy talk track" button. Six talk tracks written for SAP, Oracle WMS, Legacy RF, Spreadsheets, ERP-native, and Other WMS.',
      'Export PDF: opens a branded print window (same pattern as ROI Methodology PDF) with the battlecard laid out in a two-column table, talk track in a teal accent block, and company/rep/date header. Uses browser print dialog to save as PDF.',
      'Export Word (.docx): downloads a fully formatted .docx via the docx@8.5.0 CDN browser bundle — two-column table with colored headers, metadata rows, and talk track with left border accent. Loads the library on first use (~200KB, cached after that). The Word file is editable so reps can customize before sharing.',
      'Export buttons appear in the page header only after a competitor is selected, staying hidden when the selector is empty.'
    ]
  },
  {
    version: '5.4.7', date: '2026-08-25', tag: 'feature',
    title: 'Benchmark editor redesigned — dropdown, per-industry reset, OTIF fields',
    changes: [
      'The admin Benchmarks tab is now a single-industry editor: choose an industry from a dropdown and edit only that industry\'s values, rather than scrolling through all 8 industries at once as an overwhelming flat list.',
      'Added OTIF baseline and OTIF target as editable benchmark fields (previously hidden from the admin editor). These are the two OTIF values that drive the OTIF revenue-at-risk calculation.',
      'Fields are grouped into three sections: Improvement levers, Industry rates, and OTIF baseline & target, each with a short description of what the number means.',
      'Custom values are highlighted in teal with a dot indicator and show the factory default inline, so it\'s always clear what has been changed vs what ships out of the box.',
      'A "Reset to factory defaults" button per industry sends DELETE /api/benchmarks/:industry, removing all custom rows from the database and restoring the hard-coded values. Replaces the previous no-op button that just showed a toast.',
      'Save / Cancel / Reset buttons only appear when relevant — the footer is clean at rest and shows an "Unsaved changes" warning when fields are dirty.'
    ]
  },
  {
    version: '5.4.6', date: '2026-08-25', tag: 'feature',
    title: 'Cleanup: selectable rows, typeahead search, any company (admin)',
    changes: [
      'Search input on the cleanup page is now a taller textarea with live typeahead — as you type, matching company names across all reps appear in a dropdown so you can pick exactly who you mean without guessing the exact spelling.',
      'Preview results now show checkboxes on every row. You can check individual scenarios, discovery sessions, and customer records independently, use the per-section Select all toggle, or mix and match. A Delete selected button shows a live count of checked records and stays disabled until you pick something.',
      'A secondary Delete all N matched button remains available for cases where you do want to wipe everything under a search term in one go.',
      'The execute endpoint now accepts explicit record IDs from the selection, so only the checked rows are soft-deleted — not everything that happens to match the search string. The legacy all-match path is preserved as a fallback.',
      'New admin-only GET /api/admin/companies?q= endpoint powers the typeahead — searches across scenarios, discovery sessions, and customers for any company name across all reps, not just the current user.'
    ]
  },
  {
    version: '5.4.5', date: '2026-08-25', tag: 'fixes',
    title: 'Dollar field width fix, discovery sections start collapsed',
    changes: [
      'Fixed dollar input fields clipping large numbers (e.g. "120,0" instead of "120,000"): the CSS min-width rules targeted type=number but in v5.4.2 those fields were switched to type=text inputmode=numeric — the selectors no longer matched. Updated to cover both types and ensured affix-wrap (the $ prefix container) always fills its parent regardless of grid layout (field-row-2/3/4 or two-col).',
      'Discovery guide sections now start collapsed except the first. Previously all sections were forced open on initial render, making the guide feel overwhelming and breaking the collapse toggle (closing a section and then switching tabs or triggering a re-render would re-open everything). Fixed to open only the first section on initialization; all others start closed and each toggle persists correctly through re-renders.'
    ]
  },
  {
    version: '5.4.4', date: '2026-08-22', tag: 'fixes',
    title: 'Version history render crash fixed, version consistency test, admin nav hidden for reps',
    changes: [
      'Fixed the recurring version-history bug at its root: one old entry (v4.9.2) used a summary field instead of a changes array, which threw a TypeError mid-render and blanked the ENTIRE version-history panel — leaving only the header and a stale version number. Converted that entry and made the renderer defensive so no single malformed entry can ever blank the list again (it now accepts a legacy summary field and coerces anything unexpected to an empty list).',
      'Added a version-consistency test (test/version-consistency.test.js) that fails loudly if the three version sources — package.json, APP_VERSION in index.html, and VERSION_HISTORY[0] — ever disagree, and validates that every version-history entry is well-formed. This is the structural fix for version drift showing a stale number in the panel.',
      'Role-based UX: the Admin nav item was always visible to everyone, so reps saw an Admin link that only led to an access-denied gate. It is now hidden entirely for non-admins, matching how the Customers command center is already handled. The access gate remains as defense in depth.'
    ]
  },
  {
    version: '5.4.3', date: '2026-08-22', tag: 'fixes',
    title: 'Critical layout fix (modal overlay), stakeholder cross-company data fix',
    changes: [
      'Fixed a major layout bug: the modal overlay CSS had lost its positioning rules, so opening any modal (CRM copy, share link, AI personalize) rendered a giant grey block inline in the page instead of a centered dialog. This pushed content down, ran buttons off the bottom of the screen, and caused the horizontal overflow that put page content behind the sidebar. Restored full modal positioning (fixed, centered, scrollable) plus the close-button and label styles that were also lost.',
      'Added overflow-x protection on the body so nothing can push content sideways behind the fixed sidebar again.',
      'Fixed stakeholder map showing another company data: when no company was selected, an admin view fell through to loading every stakeholder across all companies. Now an unselected stakeholder map shows the empty "select a company" state with no data behind it.',
      'Re-verified the prospect discovery live ROI panel: engine loads from the served /roi-engine.js route and the range appears and narrows correctly as each field is entered.'
    ]
  },
  {
    version: '5.4.2', date: '2026-08-22', tag: 'fixes',
    title: 'Comma formatting extended to every dollar-entry field',
    changes: [
      'Every dollar-entry field in the calculator now formats with thousands separators as you type — including the one-time cost fields (professional services, hardware, training), field-service costs (field inventory value, reconciliation cost), and cost per error. Previously only the annual figures were formatted.',
      'All 14 dollar fields are now type=text with numeric input mode for consistent behavior, readable large numbers, and no spinner arrows.',
      'Fixed a field-ID mismatch where the formatter targeted fieldInventoryValue but the actual input is fieldInvValue, so field inventory value never formatted.',
      'The comma-stripping value parser applies to all of these, so stored figures and the computed NPV are always correct regardless of display formatting.'
    ]
  },
  {
    version: '5.4.1', date: '2026-08-22', tag: 'fixes',
    title: 'Prospect live-ROI fix, dollar-field comma formatting, prospect time-basis clarity',
    changes: [
      'Fixed: the prospect discovery link was not showing the live ROI panel. The ROI engine was loaded from an unserved path (src/shared/roi-engine.js) and 404d in the browser, so calcROI was never defined. Now loads from the served /roi-engine.js route, the same one the main app uses.',
      'Fixed: the live ROI panel gate used the wrong field name (users instead of userCount), so a prospect who answered only the user-count question would not see the panel appear.',
      'Dollar fields (revenue, inventory value, subscription, write-offs, IT cost, labor cost, expedite spend, downtime cost/hr) now format with thousands separators as you type — 27000000 shows as 27,000,000. This directly prevents the order-of-magnitude entry errors that could produce a nonsensical negative NPV: an $80,000,000 subscription is now visually obvious versus $80,000. The value parser strips commas so stored figures are always correct.',
      'These dollar fields changed from type=number to type=text with numeric input mode, removing the spinner arrows and making large figures readable.',
      'Prospect discovery questions now show a time-basis badge (per year, per month, per event, per hour, point-in-time, etc.) so the prospect knows exactly what basis a figure should be on.',
      'Annual dollar questions on the prospect link now have a Convert helper: a prospect who only knows a monthly or weekly figure can enter it and have it converted to the annual total automatically.'
    ]
  },
  {
    version: '5.4.0', date: '2026-08-22', tag: 'feature',
    title: 'Two new AI features: free-text discovery figure extraction, natural-language deal data queries',
    changes: [
      'Discovery free-text figure extraction: context questions with no numeric field mapping (e.g. "What operational event exposed this problem?") now have an Extract numbers button once answered. It scans the free-text answer for numbers that imply a value for one of the ROI models 25 numeric fields and shows suggestions the rep can apply with one click or dismiss. Nothing is ever written automatically. Skips the API call entirely if the answer contains no digits.',
      'Natural-language deal data queries: Admin Analytics has a new Ask about your deals box. Sales managers can ask plain-English questions like "which reps have the highest win rate" or "does prospect-supplied data correlate with winning" and get a phrased answer with real numbers.',
      'Security: the AI never writes SQL for the deal query feature. It selects from 7 pre-written, parameterized queries in a fixed catalog (win rate by rep, win rate by industry, provenance vs outcome, resonance vs outcome, stakeholder coverage vs outcome, rep activity, deal stage breakdown). Every AI-chosen query name is re-validated against a server-side allow-list before execution — a hallucinated or malicious query name is rejected, never run.',
      'New src/deal-queries.js module holds the fixed query catalog. src/ai.js extended with extractDiscoveryFigures, pickDealQueries, and phraseQueryResults — all following the same non-blocking, graceful-degradation pattern as the existing AI features.'
    ]
  },
  {
    version: '5.3.0', date: '2026-08-22', tag: 'feature',
    title: 'Three new AI features: assumption-change interpretation, resonance pattern summary, AI-personalized follow-up email',
    changes: [
      'When a prospect adjusts assumptions on the interactive shared business case, the rep email now includes a one-sentence AI interpretation of what the change signals and what to do about it on the next call, in addition to the raw numbers already sent.',
      'Admin Analytics resonance panel now shows an AI-generated 2-4 sentence summary above the chart, calling out which drivers resonate most, any pattern by industry, and any connection between a specific driver and deals that progressed or closed.',
      'The follow-up email modal has a new AI personalize button. It rewrites the tone of the templated email for the selected audience (CFO, VP Ops, CEO, CIO) and weaves in the reps debrief notes where relevant, while keeping every dollar figure and percentage exactly as computed — the model never touches the numbers.',
      'New internal module src/ai.js centralizes these system-triggered AI calls, separate from the rep-facing /api/enhance proxy used by the in-app assistant, Three Whys, action plans, and stakeholder analysis. All three new features degrade gracefully to showing raw data with no interpretation if ANTHROPIC_API_KEY is not set or the AI call fails — never a visible error.'
    ]
  },
  {
    version: '5.2.3', date: '2026-08-22', tag: 'fixes',
    title: 'QA cleanup: accessibility on live ROI panel, dead default removed, nudge logic fixed',
    changes: [
      'Accessibility: prospect-facing live ROI sidebar now has aria-live=polite so screen readers announce updates as the estimate changes.',
      'Prospect ROI panel: def.discRate in IND_DEFAULTS was defined but never used — the hurdle rate always fell back to a hardcoded 10%. Now each industry default (oil and gas at 12%, others at 10%) is correctly applied when the prospect has not answered the hurdle rate question.',
      'Prospect ROI panel: the "which driver to answer next" nudge could incorrectly flag a fully-answered driver as locked if its computed savings happened to equal exactly $0. Lock status now depends only on whether the required inputs are present, not on the computed value.'
    ]
  },
  {
    version: '5.2.2', date: '2026-08-22', tag: 'feature',
    title: 'Prospect discovery: live ROI estimate panel as you answer',
    changes: [
      'The prospect questionnaire now shows a live ROI estimate in a sticky sidebar on the right as the prospect fills in fields.',
      'The estimate shows a conservative-to-base range (conservative = 70% of base recovery assumptions) so it reads honest rather than inflated.',
      'A driver breakdown shows which value areas are calculated and which are locked pending more answers, with a padlock and Enter data prompt on unanswered drivers.',
      'A confidence bar shows how many of the total questions have been answered, with a label nudging the prospect to provide more.',
      'A cost-of-inaction line shows the per-month cost of delay once enough data is available.',
      'The ROI engine (roi-engine.js) is loaded directly in prospect.html and runs entirely client-side — no server round-trip.',
      'Industry-specific benchmark defaults fill in reasonable starting assumptions for each vertical so partial answers still produce a meaningful estimate.',
      'A nudge card below the main panel highlights the locked driver that would add the most value if the prospect answered the relevant questions.'
    ]
  },
  {
    version: '5.2.1', date: '2026-08-22', tag: 'ux',
    title: 'UX audit fixes: mobile livebar, unsaved changes, exec toolbar, calc default view, nav cleanup',
    changes: [
      'Mobile livebar: NPV cells now hidden on screens narrower than 640px. The 4-column grid collapses to 2 columns showing only Annual benefit and Year 1 ROI — no more truncated figures on phone.',
      'Unsaved changes: an amber dot and Unsaved changes label appears in the topbar whenever the calculator has uncommitted edits. Switching tabs while dirty shows a non-blocking slide-up banner with a Save now shortcut. Removed the blocking native confirm() dialog.',
      'Executive view toolbar: 16 buttons reduced to 4 visible (Download PDF, Export to PowerPoint, Share and track, Save). All secondary exports moved into a More exports dropdown. Log debrief button added to the toolbar so the Batch C panel is reachable without scrolling. Exec preview now auto-refreshes on tab switch — the manual Refresh preview button removed.',
      'Calculator default view: Operational drivers and Assumptions accordions now collapsed by default. Reps see the 2 always-needed sections (Prospect details, Baseline questions) on first load. A Show advanced sections link at the bottom expands everything.',
      'Nav cleanup: Compare and Impact Map moved under a collapsible More tools toggle. Main nav reduced from 15 to 12 items. Duplicate clipboard icon on Start from template changed to filing cabinet icon to distinguish it from Copy for CRM.'
    ]
  },
  {
    version: '5.2.0', date: '2026-08-22', tag: 'feature',
    title: 'No-brainer upgrade: provenance trust, cost of inaction, 3 scenarios, champion pack, CFO sliders, role one-pagers, risk ledger',
    changes: [
      'Phase 1 — Provenance trust banner: the Executive View now leads with how many inputs came directly from the prospect, not the rep. "14 of 17 figures supplied by Ervin Cable" with a colour-coded chip collapses the CFO discount on vendor ROI before they apply it. Shows in the app, PDF, and shared link.',
      'Phase 1 — Cost of inaction: per-month, 6-month, and 12-month cost of delay shown directly under the KPI strip. Reframes the decision from "should we spend $90K" to "should we keep losing $220K a month". In the app, PDF, and shared link.',
      'Phase 1 — Benchmark citations: every industry average now shows its source and year on hover (Gartner, Aberdeen, APICS, Cloud Inventory customer median across 47 deployments). Field tooltips have a dotted underline to signal they are citable.',
      'Phase 2 — Champion pack: new Champion pack button in the Executive View exports a 3-slide PPT the champion can take into their own steering committee — problem statement in their data, conservative/base financial case, and a pre-filled objection FAQ answering the 8 questions CFOs always ask.',
      'Phase 3 — Interactive shared business case: the shared link now includes assumption sliders. The CFO can drag labor recovery, shrinkage, carrying cost, and OTIF assumptions to see how ROI changes under their own numbers. Clicking Send to rep records the adjustments and emails the rep exactly which numbers were pushed back on.',
      'Phase 4 — Role-specific one-pagers: new One-pager button reads the Audience dropdown and generates a single-slide PPT specific to CFO (payback/NPV), VP Operations (throughput/accuracy), CEO (strategic/NPV), or CIO (integration/IT displacement). Cost-of-inaction box on every version.',
      'Phase 5 — Prospect-facing risk ledger: the Solution Fit tab now has a Risk ledger button that generates a print-ready document showing every identified gap with its mitigation — framed as what you should know before you commit. Volunteering limitations before procurement finds them converts a discovered weakness into demonstrated integrity.',
      'Migration 021 required: adds prospect_adjustments columns to business_case_shares.'
    ]
  },
  {
    version: '5.1.1', date: '2026-08-21', tag: 'feature',
    title: 'README, resonance analytics, CRM label, server fix',
    changes: [
      'Added README.md covering local setup, environment variables, project structure, deployment checklist, migration notes, and security guidance.',
      'Resonance summary now appears in the Admin Analytics tab. Shows a ranked bar chart of which ROI drivers resonate most across all deals, and a by-industry breakdown of the top three drivers. Populated from post-meeting debrief data entered in the Executive View.',
      'CRM button renamed from Push to CRM to Copy for CRM. The modal title updated to Copy ROI summary for CRM. The feature copies a formatted summary to the clipboard — it never wrote directly to a CRM, and the label now reflects that accurately.',
      'Fixed a server.js syntax error where the purge confirm route handler lost its async wrapper during a prior edit, causing node --check to fail.'
    ]
  },
  {
    version: '5.1.0', date: '2026-08-21', tag: 'feature',
    title: 'Seven features: guided flow, prospect errors, accessibility, Batch C, cleanup undo, keyboard shortcuts, presentation mode',
    changes: [
      'Guided first-business-case flow: confirmed fully operational. The toggle, step-by-step navigation with progress dots, Next/Back buttons, soft validation, Advanced disclosure collapse, and session restore were all already complete.',
      'Session expiry for prospect.html: mid-session link revocation now shows a clear message instead of a silent save error. Connection failures show a Retry button that re-pushes all in-memory answers.',
      'Accessibility audit: all modal close buttons now have aria-label=Close across static HTML and dynamic modals. Nav items have min-height 44px for mobile touch targets. Duplicate keyboard shortcut handler removed.',
      'Batch C — learning loop: After the meeting panel in the Executive View. Reps can tag which drivers resonated and which were questioned, set a meeting outcome, and add notes. Auto-saves. Migration 020 required.',
      'Admin cleanup undo: Recently deleted panel in Admin → Cleanup shows all soft-deleted scenarios and customers from the last 30 days, each with a one-click Restore button. Loads automatically when the panel is opened.',
      'Keyboard shortcuts: Ctrl/Cmd+N new scenario, Ctrl/Cmd+T template picker, Ctrl/Cmd+P PDF download added to existing shortcut system. Shortcut reference sheet updated to show all shortcuts.',
      'Tablet presentation mode: confirmed fully operational. The Present button hides the sidebar and nav, enlarges the Executive View result cards, and adds an Exit button.'
    ]
  },
  {
    version: '5.0.4', date: '2026-08-21', tag: 'fixes',
    title: 'QA audit fixes: field constraints, ESC handling, loading states',
    changes: [
      'Fix 1: Added min=0 to all primary dollar input fields (revenue, labor cost, inventory value, IT cost, subscription, services, hardware, training, write-off). The engine already clamped negatives — the field now prevents entry.',
      'Fix 2: Added maxlength to scenarioName (120), companyName (120), and repName (80) to match database VARCHAR(255) limits and prevent silent truncation on save.',
      'Fix 3: All percentage inputs already had max=100 — confirmed clean.',
      'Fix 4: Global ESC key handler added. Pressing Escape now closes the topmost open modal across all tabs — version history, diff, template picker, stakeholder modal, cleanup preview, and the static email/share/CRM modals. ESC is ignored when focus is in a text field so reps can clear inputs normally.',
      'Fix 5: Stakeholder list and Saved Scenarios tab now show a meaningful placeholder while data loads, instead of a blank container.'
    ]
  },
  {
    version: '5.0.3', date: '2026-08-21', tag: 'feature',
    title: 'Version diffing — compare any two saved versions side by side',
    changes: [
      'The version history modal now shows a checkbox on each row. Select exactly two versions and click Compare selected to see what changed.',
      'The diff view groups changes into five sections: ROI outputs, Core inputs, OTIF and turns, WMS and operations, Investment and timeline. Only fields that actually changed between the two versions are shown.',
      'Each changed field shows the old value, the new value, and a direction arrow (up green or down red) indicating whether the change improved or worsened the ROI case.',
      'A Back to history button returns to the version list without losing context. Load v buttons let the rep jump directly into either version from the diff.'
    ]
  },
  {
    version: '5.0.2', date: '2026-08-21', tag: 'feature',
    title: 'Scenario templates — start any new deal pre-filled by vertical',
    changes: [
      'Six vertical templates available: Wholesale Distribution, Engineering and Construction, Manufacturing, Telecommunications, Oil and Gas, and Food and Beverage.',
      'Each template pre-fills revenue, users, labor cost, inventory value, investment, OTIF, shrinkage, WMS levers, and downtime with realistic mid-market values grounded in the industry benchmarks already in the app.',
      'Construction and Telecom templates pre-enable field inventory with typical field asset values.',
      'Start from template button appears in the calculator toolbar and in the Saved Scenarios tab. A card picker shows each vertical with a description, key drivers, and a field inventory badge where relevant.',
      'Templates apply through the same loadFromObject path as saved scenarios — every field restored correctly including ramp and benchmarks. Rep still fills in company name, scenario name, and actual figures.'
    ]
  },
  {
    version: '5.0.1', date: '2026-08-21', tag: 'feature',
    title: 'Admin visibility for action plans and stakeholder maps; company typeahead on all pickers',
    changes: [
      'Admins can now see all reps action plans and stakeholder maps. Both tabs fetch all=true when the logged-in user is an admin. A rep filter dropdown appears so the admin can narrow to one rep.',
      'Action plan list shows the owning rep name badge next to each plan when viewed as admin.',
      'Stakeholder map list shows an owner column for admins.',
      'Company picker on the Action plans editor replaced with a search-as-you-type typeahead. No more scrolling through hundreds of companies in a dropdown.',
      'Company picker on the Stakeholder map tab replaced with a search-as-you-type typeahead with the same pattern.',
      'Both typeaheads show a matched list filtered as you type, show a meta count (scenarios or stakeholders), and offer a create-new option when the typed name does not match any existing company.'
    ]
  },
  {
    version: '5.0.0', date: '2026-08-21', tag: 'fixes',
    title: 'Version history panel fixed + UX/fields audit',
    changes: [
      'Version history now renders all entries correctly. The tag CSS only had styles for features/fixes/security/ux — 14 additional tag variants (hotfix, breaking, design, foundation, etc.) were unstyled, causing their pill badges to render as white on white.',
      'Removed a duplicate 4.9.9 entry that appeared after the QA patch cycle.',
      'tagClass normalisation now maps all legacy and multi-word tags (Design system, Features and fixes, Docs and responsive) to the correct CSS class.',
      'UX audit: all calculator inputs have correct labels and tooltips. No duplicate IDs found. All 61 calculator fields checked.'
    ]
  },
  {
    version: '4.9.9', date: '2026-08-21', tag: 'fixes',
    title: 'QA audit fixes (13 issues reviewed, 9 fixed)',
    changes: [
      'Security: discovery token validation now checks the database — format-only regex was insufficient.',
      'ROI engine: inverted OTIF inputs (baseline > target) no longer produce positive savings. The fallback rate now only fires when neither field is entered.',
      'ROI engine: zero or negative invest now returns null for ROI and payback rather than misleading 0% / 1 month.',
      'Scenario load: field inventory flag now restores correctly when inputs come from the cache rather than the API.',
      'Admin cleanup: now soft-deletes handoff (Solution Fit) records linked to matched customers.',
      'Admin cleanup: share link deactivation ordering made consistent.',
      'Prospect page: double-submit race condition fixed — all Confirm and send buttons are disabled immediately on first click.',
      'Prospect page: 401/403 error messages rewritten to be prospect-friendly.',
      'Issues confirmed as false positives: div balance (grep was counting lines not tags), migration 013 constraint (already guarded by DROP IF EXISTS).'
    ]
  },
  
  {
    version: '4.9.8', date: '2026-08-21', tag: 'fixes',
    title: 'Session expiry modal + font-weight cleanup',
    changes: [
      'Session expiry now shows a clear modal instead of a fleeting toast. The modal explains what happened, offers a Sign in again button, and counts down 12 seconds before auto-redirecting. The rep\'s current location is preserved so they land back where they were after signing in.',
      'Removed all 9 instances of font-weight:800 across style.css and solution-fit.js. Inter only loads weights 400/500/600/700; 800 was silently falling back to 700 anyway. Now explicit.'
    ]
  },
  {
    version: '4.9.7', date: '2026-08-21', tag: 'fixes',
    title: 'Version history button now always shows when a scenario is loaded',
    changes: [
      'Fixed: the Versions button in the calculator header never appeared because it tried to count versions from the in-memory scenario list, which only contains current versions (one row per scenario). The count was always 1 so the button was always hidden.',
      'The button now appears whenever any scenario is loaded. When clicked, it fetches the real version list from the server and updates the button label with the actual count.'
    ]
  },
  {
    version: '4.9.6', date: '2026-08-21', tag: 'feature',
    title: 'Discovery guide redesigned + field inventory bug fixes',
    changes: [
      'Fixed: field inventory questions were not appearing in the internal Discovery tab even when the toggle was on. The question list now correctly includes the field inventory section when that flag is enabled.',
      'Fixed: toggling field inventory on the calculator did not update the Discovery tab. The tab now re-renders immediately when the toggle changes, with no need to switch away and back.',
      'Discovery guide now shows a progress bar: answered / remaining / synced to calculator / from prospect counts with a percentage track.',
      'Filter bar lets reps quickly see only unanswered questions, questions synced to the calculator, or questions answered by the prospect.',
      'Sections are now collapsible. Completed sections collapse to show just the header, keeping the focus on what still needs answering. All sections start open and collapse individually.',
      'Each section shows its answered count and a visual indicator (amber partial, green complete).',
      'Each question now shows a question number, a provenance pill (rep / prospect), and a sync chip showing which calculator field the answer maps to.',
      'Added a Save notes button with confirmation feedback. Answers still auto-save on each keystroke; this gives reps a clear visual confirmation.',
      'Prospect link is now a compact card with the submission status, engagement count, and actions in one place.'
    ]
  },
  {
    version: '4.9.5', date: '2026-08-21', tag: 'fixes',
    title: 'Admins can now see all reps\' scenarios when selecting a customer',
    changes: [
      'Fixed: when an admin selected a customer in the calculator, it showed "no saved scenarios" even when reps had created many. The scenario list was filtered to the current user only.',
      'Admins now load all scenarios across all reps on page load (GET /api/scenarios?all=true). The server already supported this — the client was not requesting it.',
      'When an admin selects a customer that has scenarios from multiple reps, the scenario picker shows the rep name next to each scenario so it is clear who built it.'
    ]
  },
  {
    version: '4.9.4', date: '2026-08-05', tag: 'fixes',
    title: 'PowerPoint export fixed',
    changes: [
      'Fixed: PowerPoint export always showed "library not loaded" error. pptxgenjs v3 renamed its global export from PptxGenJS to pptxgen (lowercase). The guard check and all constructor calls in pptx-export.js and deal-export.js have been updated to match.'
    ]
  },
  {
    version: '4.9.3', date: '2026-08-05', tag: 'fixes',
    title: 'Calculator dollar fields widened to accommodate 10-digit entries',
    changes: [
      'Dollar amount fields that were squeezed into 3-column grids (cost per order, cost per error, cost per downtime hour, field reconciliation cost) have been moved to 2-column rows so they always have enough room for large figures.',
      'Minimum column width for 3 and 4-column grids increased from 150px to 180px.',
      'All 11 dollar input fields verified to be in standalone or 2-column layouts.'
    ]
  },
  {
    version: '4.9.2', date: '2026-08-20', tag: 'hotfix',
    title: 'Migration 017 deployment hotfix',
    changes: ['Corrects share-link latest-version migration so scenario_base_id stores the base_id grouping key without an invalid foreign key to scenarios.id.']
  },
  {
    version: '4.9.1', date: '2026-08-05', tag: 'feature',
    title: 'Solution Fit redesigned',
    changes: [
      'Readiness bar now appears at the top of every tab so you can see handoff status without switching to the Readiness tab.',
      'Tabs are now pill-style with counts: Gaps shows how many gaps are captured, Readiness shows how many items are still missing.',
      'A navy top bar shows the customer name, deal stage, and auto-save state at all times.',
      'Context tab uses collapsible accordion sections (Opportunity, Architecture, Contacts) each showing fill count and completion status.',
      'Process cards on the Demo and Fit tab show colored status badges (green for demonstrated / full fit, amber for partial, red for gap) so you can scan coverage at a glance. A stats bar shows in-scope, demonstrated, and gap counts.',
      'Gap cards are color-coded by priority (red border for Must Have, amber for Should Have) and the gap register header shows unresolved and must-have counts.',
      'Integration tab uses a cleaner table with compact inputs and moves the mobility drivers into a two-column grid.',
      'Field labels are now uppercase 11.5px secondary color throughout, consistent with the rest of the app.'
    ]
  },
  {
    version: '4.9.0', date: '2026-08-05', tag: 'feature',
    title: 'Discovery submission notifications',
    changes: [
      'Reps now receive an email when a prospect clicks Confirm and send on the discovery questionnaire. The email includes the company name, answer count, and a link directly to the Discovery tab.',
      'A notification badge appears on the Discovery nav item when a prospect has submitted. It clears automatically when the rep opens the tab.',
      'The Discovery tab now shows a green Submitted badge with the submission timestamp, or the open count and not yet submitted if the prospect has opened but not completed.',
      'Migration 018 required: adds submitted_at, answer_count, and last_disc_viewed to discovery_sessions.',
      'Requires SENDGRID_API_KEY and FROM_EMAIL environment variables on Render. Without them, email details are logged to the server console instead of sent.'
    ]
  },
  {
    version: '4.8.2', date: '2026-08-05', tag: 'fixes',
    title: 'Discovery answers now apply to the calculator correctly',
    changes: [
      'Fixed: discovery answers were loading from the wrong session. The auto-load now scopes to the currently loaded scenario, not the most recently updated session across all customers.',
      'Fixed: discovery answers were silently skipped when a calculator field already had a value from a saved scenario. Prospect-verified answers now always overwrite. Rep answers fill empty fields.',
      'Fixed: the prospect-verified / rep-confirmed provenance chips were not being restored when a scenario loaded. fieldStates are now always updated from discovery answers regardless of whether the field value is written.',
      'Both the auto-load on session restore and the manual Apply button now trigger confidence chip re-render and recalc.'
    ]
  },
  {
    version: '4.8.1', date: '2026-08-05', tag: 'feature',
    title: 'Share links always show the latest scenario version',
    changes: [
      'Scenario share links and business case share links now always resolve to the latest saved version of a scenario. Previously they pointed at the specific version that existed when the link was created.',
      'Saving a new version after sharing is now safe — the prospect\'s link updates automatically. The original version data is never deleted.',
      'Migration 017 required: adds scenario_base_id to both share tables and back-fills existing share rows.'
    ]
  },
  {
    version: '4.8.0', date: '2026-08-05', tag: 'feature',
    title: 'Field inventory value drivers (opt-in per customer)',
    changes: [
      'A Field inventory toggle in Prospect Details lets reps flag whether a prospect holds inventory outside the warehouse (trucks, vans, contractor sites, job locations). Default is off.',
      'When turned on: a Field inventory section appears in the calculator with three ROI levers (leakage/shrinkage, carrying cost on field stock, and reconciliation labor). These are separate from the main warehouse levers.',
      'The flag is stored on the customer record and persists across all scenarios for that customer.',
      'If the rep has enabled field inventory, the prospect discovery link automatically includes a field inventory question section (6 questions covering locations, value, leakage rate, and reconciliation burden). If the flag is off, no field inventory questions appear.',
      'Migration 016 required (adds has_field_inventory to customers and discovery_sessions tables).'
    ]
  },
  {
    version: '4.7.2', date: '2026-08-05', tag: 'fixes',
    title: 'Ask button no longer covers the save/PDF buttons',
    changes: [
      'The Ask assistant button was sitting directly on top of the floating Save and Executive PDF buttons at bottom-right. It is now raised to 140px from the bottom, clearing the two-button fab-row with room to spare.'
    ]
  },
  {
    version: '4.7.1', date: '2026-08-05', tag: 'fixes',
    title: 'Prospect assistant: close button + field-sensitive help fixed',
    changes: [
      'Close button is now clearly visible and tappable on mobile. On narrow screens it shows a Close label alongside the X. Tap target increased to 44px minimum.',
      'Field-sensitive help now works with the new tabbed section layout. The IntersectionObserver now re-observes question elements each time a section loads, and reads the correct section title class.'
    ]
  },
  {
    version: '4.7.0', date: '2026-08-05', tag: 'feature',
    title: 'Prospect page redesigned: section-at-a-time layout',
    changes: [
      'The prospect discovery page now shows one section at a time instead of all 32 questions on a single scrolling page (~8,000-10,000px). Each section is 3-5 questions and fits comfortably on one screen.',
      'A section navigator in the sticky header shows all sections with completion status (numbered, dot for partial, checkmark for complete). The prospect can jump to any section freely at any time.',
      'Back and Next buttons navigate sequentially. The final section shows Review and submit.',
      'Context lines (why we ask each question) are now collapsed behind a Why are we asking? toggle to keep each question compact.',
      'All data capture, auto-save, and review logic is unchanged.'
    ]
  },
  {
    version: '4.6.4', date: '2026-08-05', tag: 'breaking',
    title: 'Field service (MEP) removed from calculator and discovery',
    changes: [
      'Removed the Field Service Value Drivers section entirely from the calculator.',
      'Removed the three field service ROI levers (truck-roll savings, technician revenue, field leakage) from the engine. Existing scenarios that had field service data will show a lower ROI reflecting only the retained WMS levers.',
      'Removed the MEP option from the solution selector.',
      'Removed field service questions from the prospect discovery questionnaire across all industries.',
      'ROI engine now runs 17 tests (was 22 — the 5 field-service-specific tests were removed alongside the feature).'
    ]
  },
  {
    version: '4.6.3', date: '2026-08-05', tag: 'feature',
    title: 'Value-engineering core questions reduced to 4',
    changes: [
      'The Value-engineering core (must-ask) section on the prospect discovery link is reduced from 10 questions to 4: why now, who feels the pain, who else is impacted, and how success will be measured.',
      'The 6 removed questions (corporate initiatives, board commitment, opportunity cost, cost of inaction, prior attempts, executive sponsor) are no longer shown to prospects.',
      'The 4 internal-only rep-assessment questions (decision process, budget, blockers, business case format) are unchanged.',
      'No impact on ROI calculations — all removed questions had no sync targets.'
    ]
  },
  {
    version: '4.6.2', date: '2026-08-05', tag: 'fixes',
    title: 'Prospect assistant CSS fix',
    changes: [
      'Fixed the prospect questionnaire assistant rendering as raw unstyled text. prospect.html has its own self-contained style block with no access to style.css, so the assistant CSS is now inlined directly into prospect.html.'
    ]
  },
  {
    version: '4.6.1', date: '2026-08-05', tag: 'feature',
    title: 'Persistent assistant suggestion chips',
    changes: [
      'Both assistants now show two always-visible shortcut chips pinned above the input — they stay in place throughout the conversation so common questions are always one click away.',
      'Internal: "What does this field mean?" and "How do I share this with a prospect?"',
      'Prospect: \u201cWhat if I don\u2019t know the exact number?\u201d and \u201cWhere do I find this number?\u201d'
    ]
  },
  {
    version: '4.6.0', date: '2026-08-05', tag: 'feature',
    title: 'AI assistant Pass 2: context-aware + prospect questionnaire assistant',
    changes: [
      'The internal assistant now knows which tab is active, which field was most recently focused, and the current scenario and company name. Ask "what does this field mean?" right after clicking a field and it resolves automatically.',
      'A separate Help assistant is now available on the prospect discovery page. It is scoped strictly to the questionnaire: it explains terms, helps prospects find numbers, and explains why questions are being asked. It knows nothing about the sales process or internal ROI model.',
      'Session guarantee: both assistants hold conversation history in memory only. Nothing is written to localStorage, sessionStorage, or cookies. Every page load starts a clean session.',
      'The prospect assistant uses a separate server endpoint authenticated by the discovery link token. The system prompt is enforced server-side so prospects cannot override the scope restrictions.'
    ]
  },
  {
    version: '4.5.0', date: '2026-08-05', tag: 'feature',
    title: 'In-app AI assistant (Pass 1)',
    changes: [
      'A floating "Ask" button opens a chat panel available on every screen inside the app.',
      'Answers questions about fields, calculations, how to use the app, and what the discovery questions mean.',
      'Grounded in the app\u2019s own content (ROI methodology, field definitions, key terms, workflow). Draws on general knowledge where helpful, with a clear disclaimer when going beyond the app\u2019s docs.',
      'Multi-turn conversation with suggested starter questions. API key stays server-side — reuses the existing secure proxy.',
      'Only available to logged-in reps and SEs, not on the prospect-facing discovery page.'
    ]
  },
  {
    version: '4.4.2', date: '2026-08-05', tag: 'fixes',
    title: 'Executive PDF actually fixed (root cause); stronger autofill block',
    changes: [
      'Executive PDF: found the real cause — the print page uses money/percent formatters that lived in the calculator file it no longer loads, so it failed before it could render. Those formatters now live in a shared file both pages load. Verified the PDF renders end to end.',
      'Customer search no longer inherits your login username: applied the readonly-until-focus technique Chrome actually respects.'
    ]
  },
  {
    version: '4.4.1', date: '2026-08-05', tag: 'fixes',
    title: 'Reverted sticky calculator header; robust Executive PDF fix',
    changes: [
      'Removed the sticky calculator header — it overlapped the customer-selection screen and the layered sticky positioning was too fragile. The header scrolls normally again.',
      'Executive PDF fixed properly: the industry/competitor data and narrative library are now reliably shared with the print page, and the print page degrades gracefully instead of failing if any is missing.'
    ]
  },
  {
    version: '4.4.0', date: '2026-08-05', tag: 'design',
    title: 'Calculator chrome consolidation + sticky-header fix (Phase 1b/1d)',
    changes: [
      'Fixed the sticky calculator header sliding up and disappearing behind the KPI bar when scrolling — the header and workflow strip now stay pinned just below it.',
      'Consolidated the top of the calculator into one cohesive toolbar: the action header and the workflow steps now read as a single band instead of separate stacked layers.',
      'Input tiering: the five inputs that drive most of the ROI (revenue, users, labor cost, inventory value, IT cost) now read as primary; the fine-tuning percentage knobs are visually quieted.',
      'NEEDS A LIVE LOOK: the sticky positioning is height-sensitive; please verify on staging before relying on it.'
    ]
  },
  {
    version: '4.3.1', date: '2026-08-05', tag: 'fixes',
    title: 'Calculator & PDF fixes; field-service made optional; prospect question context',
    changes: [
      'Executive PDF fixed again: the print page lost access to the industry/competitor labels when it stopped loading the full calculator. That data now lives in a shared file both pages load.',
      'Fixed number fields that appeared to reject entry (e.g. Revenue / job): the UI was re-processing the whole form on every keystroke and disrupting focus.',
      'Fixed large-number fields that clipped their digits (subscription, field inventory value, cost per truck roll / order).',
      'Field service value drivers are now a collapsed, optional section — not every deal needs them. Left blank, they are excluded from the ROI; loading a scenario that has field data expands it automatically.',
      'Prospect discovery: each question now shows a plain-language note on why it is being asked.'
    ]
  },
  {
    version: '4.3.0', date: '2026-08-05', tag: 'design',
    title: 'Calculator visual pass — results elevation & unified visual language',
    changes: [
      'The headline number now reads as the answer: annual benefit is the hero metric in the live bar and results grid, with ROI, payback and NPV supporting it.',
      'One elevation system — cards nested inside sections no longer stack borders and shadows.',
      'Tighter label-to-input rhythm with more space between logical groups, so the eye groups by proximity rather than hunting for borders.',
      'Accent colour reserved for interactive and important elements; the focus state is now the strongest accent moment on the form.',
      'Presentation only — no calculation, data or permission changes (22/22 engine tests unchanged).'
    ]
  },
  {
    version: '4.2.0', date: '2026-08-05', tag: 'feature',
    title: 'Prospect experience, scenario navigation, guided mode & share tracking',
    changes: [
      'Prospect discovery page redesigned: live progress with time-remaining, a "what your answers help assess" panel, per-question value context, "I\'m not sure" option, sliders for percentages, live number formatting, and a review-and-confirm step before submitting.',
      'Calculator: pick a different scenario for the current customer from a dropdown without leaving the page, and open saved version history right from the calculator.',
      'All share links are now trackable and revocable (scenario share links join the business-case and discovery links that were already tracked).',
      'Guided mode: progress stepper moved to the top and made sticky, sections numbered to match the stepper, and the guided-toggle screen-reader state fixed.',
      'Primary actions (Save, Executive view) added to a sticky calculator header so they are reachable without scrolling; global back-to-top button.',
      'Unsaved-changes protection unified across tab switch, scenario switch, logout, and browser close/refresh/back.',
      'Fixes: executive PDF download, a load-order crash, ramp % save/reload, the misleading Overwrite button, Chrome autofill on customer search, and the executive scenario-range ROI.'
    ]
  },
  {
    version: '4.1.0', date: '2026-08-05', tag: 'fixes',
    title: 'Stability fixes + easier navigation on top of the v4 UI',
    changes: [
      'Back to top: a floating button now appears on any long page once you scroll down, and switching tabs returns you to the top automatically. Added to the prospect discovery page too.',
      'Fixed the executive PDF download (Could not load scenario) — the print page now loads the ROI engine and no longer depends on the full calculator; corrupted ramp values are healed on render.',
      'Fixed a load-order crash (prospectLogoDataUrl is not defined) that could break the calculator on load.',
      'Fixed the Discovery Switch button (now opens the customer picker correctly from any tab).',
      'Three Whys edited on the Executive view now save with the scenario and reload correctly.',
      'Save no longer offers a misleading Overwrite that still incremented the version; ramp % saves/reloads correctly; the customer search no longer autofills your username.',
      'Executive view scenario range (Conservative/Base/Aggressive) now clearly drives the on-screen ROI.',
      'PowerPoint export loads reliably from CDN (no more MIME/CSP console errors).',
      'Workflow reordered to Calculator → Discovery so customer details are captured first.'
    ]
  },
  {
    version: '4.0.0',
    date: '2026-08-05',
    tag: 'ux',
    title: 'UI/UX rebuild — one design system across every page',
    changes: [
      'Navigation restructured from 13 flat tabs into a numbered deal workflow (Discovery → Calculator → Executive view → Solution Fit) plus Strengthen the case, Library and Settings groups.',
      'The live KPI bar now belongs to the modelling context and hides on screens with no live model, returning 60px of vertical space to Admin, Help, Stakeholders and the rest.',
      'Action hierarchy: long button rows collapse to one primary, one secondary and a More menu. The Executive view header went from eleven equal-weight buttons to three.',
      'Calculator guidance consolidated: the breadcrumb, boxed completeness meter, progress bar and next-best-action banner are now one stepper and one line of guidance.',
      'Currency and percentage moved out of label text into input affixes; the type floor was raised from 11px to 12px across the app.',
      'Emoji glyphs in controls replaced with a single inline SVG icon set.',
      'Design tokens rebuilt (neutrals, radii, shadows, focus ring, 7-step type scale, 4px spacing) and the undefined --radius, --shadow-lg, --ink and --font-mono tokens were defined.',
      'Sign-in page rebuilt as a two-panel brand layout; executive document, tables, tabs, notices, modals and empty states normalised to one treatment.',
      'Presentation layer only — the ROI engine, routes, database and every calculation are untouched (22/22 engine tests still pass).'
    ]
  },

  {
    version: '3.15.0', date: '2026', tag: 'Docs & responsive',
    title: 'Updated How to Use guide; mobile/tablet/PC display hardening',
    changes: [
      'Refreshed the How to Use guide for current functionality (AE/SE roles, admin Customers landing, customer search, dictation) and added a Solution Fit & Handoff page.',
      'Removed the default admin credentials from the in-app Admin guide.',
      'Responsive hardening: global horizontal-overflow guard, fluid fixed-width boxes on phones, long-string wrapping, tablet grid tiers, and viewport-safe modals — verified across mobile, tablet, and desktop breakpoints.'
    ]
  },
  {
    version: '3.14.0', date: '2026', tag: 'Design system',
    title: 'Brand consistency audit — documents, pages, and component system',
    changes: [
      'Fixed off-brand colors on the surfaces customers and prospects actually see: the PowerPoint export was running an entirely different, pre-rebrand palette; the shared business-case link had the wrong font AND wrong colors; the prospect map, ROI methodology PDF, discovery links, and stakeholder map all carried an intermediate draft palette that never got reconciled.',
      'Fixed a real accessibility regression: a low-contrast gray, already corrected in the main app, was still in use as literal text color across 8 files (empty states, captions, legends).',
      'Designed and formalized a new 5-color extended categorical palette (teal, violet, gold, slate, berry) for charts and stage tags — replacing an ad hoc set that included two nearly-identical purples.',
      'Eliminated a duplicated color-mapping object that existed in two files and could have silently drifted apart.',
      'Normalized ~30 near-duplicate badge/tag styles to one consistent shape, and added a shared pill component for future use — no visual change to existing badges, no HTML/JS call sites changed.',
      'Added a spacing and type scale; safely tokenized 246 existing declarations that already matched it exactly (zero visual change).',
      'Added a style guide page (style-guide.html) as a living reference for the palette, type scale, spacing scale, and components.'
    ]
  },
  {
    version: '3.13.0', date: '2026', tag: 'Features',
    title: 'Solution Fit v2 + admin Customers landing',
    changes: [
      'Context tab reworked: Solution Engineer picklist (defaults to you), product checkboxes (MEP/CIP/CPP/Platform + Other), business & technical owner with name/title/email/phone, known system-of-record customizations with impact, and a Standalone integration option. Opportunity ID and Locations removed.',
      'New admin Customers landing: see all customers, search, and open a saved scenario or start a new one.',
      'Headline ROI figures stay at zero until a customer is selected and data entered.',
      'The Add process button is now easy to read.'
    ]
  },
  {
    version: '3.12.1', date: '2026', tag: 'Fixes',
    title: 'Fix: Solution Engineers and admins can now edit Solution Fit',
    changes: [
      'Solution Fit was stuck read-only for everyone, including SEs and admins, because it could not read the signed-in user’s role. Fixed — SE and admin now have full edit access; AEs remain read + print.'
    ]
  },
  {
    version: '3.12.0', date: '2026', tag: 'Features & fixes',
    title: 'Distinct AE/SE roles, admin full access, responsive, dictation, customer search',
    changes: [
      'Account Executive and Solution Engineer are now distinct, assignable roles; you can change any existing user’s role. (Everyone previously on the combined role shows as AE.)',
      'Admins can view and edit any user’s data; admin-on-behalf edits are recorded in the audit log and keep the original owner.',
      'Fixed the Solution Fit documents: the Internal / Customer-facing toggle and Print / Save as PDF now work.',
      'Responsive layout for desktop, tablet, and phone; microphone dictation on text fields where supported; and a customer search on the calculator to open an existing customer.'
    ]
  },
  {
    version: '3.11.0', date: '2026', tag: 'Features',
    title: 'Solution Fit handoff documents (phase 4)',
    changes: [
      'The Readiness tab now generates two branded documents: an internal Services handoff (full gaps, ownership, assumptions) and a customer-facing discovery summary (internal scoping language removed).',
      'Print / Save as PDF opens a branded, print-ready document; text can also be copied. Account Executives can print, matching their read + print access.',
      'Completes the SE Solution Fit & Handoff feature.'
    ]
  },
  {
    version: '3.10.0', date: '2026', tag: 'Features',
    title: 'Solution Fit & Handoff tab (phase 3)',
    changes: [
      'New Solution Fit tab: SE discovery workspace with five sections — Context, Demo & Fit checklist, Gap register, Integration drivers, and Readiness.',
      'Tied to the selected customer; all data saved to the server (no local storage), with a live readiness score from the shared engine.',
      'Permission-aware: Solution Engineers edit; Account Executives get read + print. Documents (branded) follow in the next release.'
    ]
  },
  {
    version: '3.9.0', date: '2026', tag: 'Permissions',
    title: 'Solution Engineer (SE) role + handoff access model (phase 2)',
    changes: [
      'New Solution Engineer role: SEs support multiple AEs, so they get read/write access to any customer’s Solution Fit handoff, and can see all customers.',
      'Account Executives (AEs) keep their own customers and get read + print access to their handoffs; the SE completes the handoff content.',
      'Admins can assign the SE role. Scenario/deal ownership is unchanged — SEs do not take over deals.'
    ]
  },
  {
    version: '3.8.0', date: '2026', tag: 'Foundation',
    title: 'Solution Fit handoff backend (phase 1b)',
    changes: [
      'Added the handoff data model: one Solution Fit & Handoff record per customer (migration 012), storing opportunity, architecture, partner, processes, gaps, interfaces, and drivers.',
      'Readiness scoring runs server-side from a shared engine, so the score is authoritative and consistent.',
      'Backend only — no user-facing tab yet. The SE role and the tab UI follow in the next phases.'
    ]
  },
  {
    version: '3.7.1', date: '2026', tag: 'Fixes',
    title: 'Fix PDF download and Share & track',
    changes: [
      'Executive View → Download PDF no longer fails with “data may be corrupted”: the large prospect-logo image is dropped from the PDF hand-off URL (it was overflowing the URL and corrupting the payload), with a size guard and clearer errors.',
      'Share & track now reliably creates a link: scenario matching is case/space-insensitive and loads the list if needed, and the button always reports what happened instead of silently doing nothing.'
    ]
  },
  {
    version: '3.7.0', date: '2026', tag: 'Foundation',
    title: 'First-class customer entity (Solution Fit groundwork, phase 1a)',
    changes: [
      'Introduced a stable customer record; scenarios now link to a customer by ID instead of only a free-text company name.',
      'Existing scenarios are backfilled and linked automatically (migration 011) — no manual cleanup needed.',
      'Groundwork for the upcoming SE Solution Fit & Handoff tab; no user-facing change yet.'
    ]
  },
  {
    version: '3.6.0', date: '2026', tag: 'Reliability',
    title: 'Production error monitoring + automated route tests',
    changes: [
      'Server errors are now captured to a database log (migration 010) and reviewable in Admin → Error log, instead of only in transient hosting logs.',
      'Process-level crashes (uncaught exceptions, unhandled rejections) are recorded too.',
      'Added an integration test suite covering the auth boundary, prospect-link path, and scenario/outcome round-trip, plus a CI workflow that runs all tests on every push.'
    ]
  },
  {
    version: '3.5.0', date: '2026', tag: 'Features',
    title: 'Multi-currency display (USD, GBP, EUR, AUD, NZD)',
    changes: [
      'Currency selector on the calculator; the choice is saved per scenario.',
      'Every money figure — calculator, exec view, PDF/PPT exports, and the shared business-case viewer — shows symbol + code (e.g. £1.2M GBP).',
      'Display only: no exchange-rate conversion. Reps enter the customer’s own-currency figures, so the ROI reads in that currency without introducing FX error.'
    ]
  },
  {
    version: '3.4.0', date: '2026', tag: 'Features',
    title: 'Benchmark credibility: sourcing + provisional-data warnings',
    changes: [
      'Every default benchmark family now has a documented basis, surfaced in the ROI methodology PDF for finance review.',
      'Industries using provisional (unvalidated) benchmarks — currently Medical Devices / Life Sciences — show a visible warning banner on the calculator so reps confirm figures before sharing externally.'
    ]
  },
  {
    version: '3.3.1', date: '2026', tag: 'Features',
    title: 'Executive View data infographics',
    changes: [
      'Benefit waterfall: shows how each value driver builds up and how the conservative year-1 ramp adjustment brings gross to the defensible figure.',
      'Payback timeline: signing → implementation → ramp → break-even, making the payback period concrete.',
      'Both are lightweight SVG (no libraries), brand-themed, accessible, and print/PDF-safe.'
    ]
  },
  {
    version: '3.3.0', date: '2026', tag: 'Release',
    title: 'Rebrand, outcome tracking, calculator wizard, input guidance',
    changes: [
      'New brand palette applied across the entire app (dark, blue, orange, red, light surfaces).',
      'Win/loss outcome tracking: tag each business case won/lost/no-decision with optional realized value (migration 009).',
      'Calculator progress tracking + optional step-by-step Guided mode.',
      'Input format guidance on ROI dollar fields: format hints, magnitude sanity checks, and forgiving paste ($50M → 50000000).'
    ]
  },
  {
    version: '3.2.1', date: '2026', tag: 'UX',
    title: 'User-experience enhancements (batch 3)',
    changes: [
      'Discovery: prospects now see a live "answers saved automatically" indicator and a "welcome back" cue when resuming.',
      'Keyboard shortcuts: "g" then a letter jumps between tabs; Cmd/Ctrl+S saves; "?" shows the shortcut list.',
      'Guided onboarding for new reps with no saved scenarios yet.',
      'Presentation mode: a full-screen, large-type Executive View for live tablet demos.'
    ]
  },
  {
    version: '3.2.0', date: '2026', tag: 'UX',
    title: 'User-experience enhancements (batches 1 & 2)',
    changes: [
      'Live count-up animation on the ROI figures as inputs change.',
      'Out-of-range input warnings that flag unusual values before they reach a customer.',
      'Optimistic "Saved ✓" status and a persistent customer/scenario context header on every tab.',
      'Undo toasts replace confirmation pop-ups for deletes; consistent loading and empty states.'
    ]
  },
  {
    version: '3.1.1', date: '2026', tag: 'Accessibility',
    title: 'Accessibility pass 1',
    changes: [
      'Fixed low-contrast status and hint text to meet WCAG AA.',
      'Added a clear keyboard focus indicator across all interactive elements.',
      'Accessible label on the icon-only dismiss control.'
    ]
  },
  {
    version: '3.1.0', date: '2026', tag: 'Features',
    title: 'Session handling, scenario tools, industry reframe, delivery tracking',
    changes: [
      'Graceful session-expiry: clear message, returns the rep to where they were after signing back in.',
      'Scenario clone ("Duplicate") and version diffing ("Compare versions").',
      'Industry reframe: "Wholesale Distribution" (was Distribution & 3PL); "Medical Devices / Life Sciences" (was Retail) with provisional benchmarks.',
      'Delivery tracking: discovery-link open counts, and trackable business-case share links (view-based, no tracking pixels).'
    ]
  },
  {
    version: '3.0.2', date: '2026', tag: 'Security',
    title: 'AI endpoint rate limiting',
    changes: [
      'Added a per-user rate limit (default 15/min) on the AI endpoint to protect API spend.'
    ]
  },
  {
    version: '3.0.1', date: '2026', tag: 'Fixes',
    title: 'Discovery guide relevance and link safety',
    changes: [
      'Discovery guides now show only the value-driver sections relevant to the selected industry.',
      'Prospect discovery links are hard-gated to an active customer, preventing wrong-customer sends.'
    ]
  },
  {
    version: '3.0.0', date: '2026', tag: 'Release',
    title: 'v3.0 — Render-ready baseline',
    changes: [
      'Promoted the validated, Render-ready package with the public prospect-link authentication fix.',
      'Restored the dependency-free ROI engine test suite.'
    ]
  },
  {
    version: '2.9.x', date: '2026', tag: 'Fixes',
    title: 'Prospect-link reliability',
    changes: [
      'Fixed the root cause of "link not found": the analytics routes were unintentionally requiring auth on the public discovery route.',
      'Switched prospect links to a query parameter so they survive email and chat rewriting (old links still work).'
    ]
  },
  {
    version: '2.8.0', date: '2026', tag: 'Features',
    title: 'Levers, server-authoritative ROI, value-engineering, customer gate',
    changes: [
      'Warehouse (WMS) and Field Inventory value drivers added.',
      'ROI is recomputed and stored server-side, with a shared calculation engine and a 22-test suite.',
      'Value-engineering messaging, qualitative discovery questions, and the customer-selection gate.'
    ]
  }
];

function renderVersionHistory() {
  const host = document.getElementById('versionHistoryList');
  if (!host) return;
  const cur = document.getElementById('vhCurrentVersion');
  if (cur && typeof APP_VERSION !== 'undefined') cur.textContent = 'v' + APP_VERSION;
  else if (cur && VERSION_HISTORY.length) cur.textContent = 'v' + VERSION_HISTORY[0].version;

  const tagClass = t => {
    const norm = (t || 'release').toLowerCase().replace(/[^a-z]/g, '');
    /* Map legacy and variant names to canonical CSS classes */
    const map = {
      featuresfixes:'fixes', featurefix:'fixes', featuresfix:'fixes',
      feature:'feature', features:'features', fix:'fixes',
      designsystem:'design', docsresponsive:'release', docs:'release'
    };
    return 'vh-tag vh-tag-' + (map[norm] || norm);
  };
  host.innerHTML = VERSION_HISTORY.map((rel, i) => {
    /* Defensive: never let one malformed entry blank the whole list.
       Accept a legacy `summary` string in place of a `changes` array, and
       coerce anything unexpected into an empty list rather than throwing. */
    let changes = rel.changes;
    if (!Array.isArray(changes)) {
      changes = rel.summary ? [rel.summary] : [];
    }
    return `
    <div class="vh-item${i === 0 ? ' vh-current' : ''}">
      <div class="vh-marker"></div>
      <div class="vh-body">
        <div class="vh-head">
          <span class="vh-version">v${escapeHistoryHtml(rel.version)}</span>
          <span class="${tagClass(rel.tag)}">${escapeHistoryHtml(rel.tag || 'Release')}</span>
          ${i === 0 ? '<span class="vh-latest">Current</span>' : ''}
        </div>
        <div class="vh-title">${escapeHistoryHtml(rel.title)}</div>
        <ul class="vh-changes">
          ${changes.map(c => `<li>${escapeHistoryHtml(c)}</li>`).join('')}
        </ul>
      </div>
    </div>`;
  }).join('');
}

function escapeHistoryHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

if (typeof window !== 'undefined') {
  window.renderVersionHistory = renderVersionHistory;
  window.VERSION_HISTORY = VERSION_HISTORY;
}

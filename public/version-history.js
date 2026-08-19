/* ═══════════════════════════════════════════════════════════════════
   version-history.js — admin-only changelog
   A curated record of releases and their changes, rendered as a timeline
   in Admin → Version history. To add a release, prepend an entry to
   VERSION_HISTORY (newest first). Keep summaries short and rep-readable.
   ═══════════════════════════════════════════════════════════════════ */

const VERSION_HISTORY = [
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

  const tagClass = t => 'vh-tag vh-tag-' + (t || 'release').toLowerCase().replace(/[^a-z]/g, '');
  host.innerHTML = VERSION_HISTORY.map((rel, i) => `
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
          ${rel.changes.map(c => `<li>${escapeHistoryHtml(c)}</li>`).join('')}
        </ul>
      </div>
    </div>`).join('');
}

function escapeHistoryHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

if (typeof window !== 'undefined') {
  window.renderVersionHistory = renderVersionHistory;
  window.VERSION_HISTORY = VERSION_HISTORY;
}

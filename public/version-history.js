/* ═══════════════════════════════════════════════════════════════════
   version-history.js — admin-only changelog
   A curated record of releases and their changes, rendered as a timeline
   in Admin → Version history. To add a release, prepend an entry to
   VERSION_HISTORY (newest first). Keep summaries short and rep-readable.
   ═══════════════════════════════════════════════════════════════════ */

const VERSION_HISTORY = [
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

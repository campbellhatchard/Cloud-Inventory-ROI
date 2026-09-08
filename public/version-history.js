/* ═══════════════════════════════════════════════════════════════════
   version-history.js — admin-only changelog
   A curated record of releases and their changes, rendered as a timeline
   in Admin → Version history. To add a release, prepend an entry to
   VERSION_HISTORY (newest first). Keep summaries short and rep-readable.
   ═══════════════════════════════════════════════════════════════════ */

const VERSION_HISTORY = [
  {
    version: '6.9.1', date: '2026-09-04', tag: 'release-integrity',
    title: 'Governed Publishing and Release Integrity',
    changes: ['Frozen, customer-safe Business Case publishing with explicit readiness acknowledgement', 'Retired legacy share and print economics and disabled unconverted Champion Pack', 'Approved-revision Battlecard exports, readable executive narratives and permanent release controls']
  },
  {
    version: '6.9.0', date: '2026-09-03', tag: 'solution-fit',
    title: 'Solution Fit Creation & MEP Standard App Configuration',
    changes: ['Redesigned Solution Fit creation and recovery so authorized Sales Engineers and Admins can explicitly create assessments without dead-end states', 'Added state-aware Create/Open/Not started customer actions plus safer retry, return, overlay and onboarding behavior', 'Introduced governed MEP Product → ERP → Standard Apps scope from the August 2026 catalog with ERP-specific assessment rows, non-standard apps, quick gap capture, change history and catalog lineage']
  },
  {
    version: '6.8.5', date: '2026-09-02', tag: 'stabilization',
    title: 'Executive Output & Production Stabilization',
    changes: ['Centralized customer ROI report data across PDF, PowerPoint and Word', 'Replaced browser-print PDF handoff with authenticated server-side PDF download', 'Restored contract-value charts in Executive View and customer outputs', 'Improved output status, retry behavior, deployment guidance and release regression coverage']
  },
  {
    version: '6.8.4', date: '2026-09-01', tag: 'certification',
    title: 'Customer Output Reliability & Brand Certification',
    changes: ['Established an authoritative audience and data-source registry for every polished output', 'Certified customer and internal footers, governed logos, Office formats, filenames, popup recovery and local PowerPoint dependencies', 'Migrated saved Joint Project Plan and Stakeholder PowerPoints to authenticated server generation', 'Preserved ROI Model v2.8, Brand System v1.0, Application Knowledge v1.0 and Christie Persona v1.0']
  },
  {
    version: '6.8.3', date: '2026-09-01', tag: 'hotfix',
    title: 'Production Customer & Executive Export Recovery',
    changes: ['Recovered customer loading with the lightweight authorized customer list, local filtering, timeout, empty, error and retry states', 'Rebuilt Executive View and print/PDF presentation around the authoritative Executive Value Story', 'Added authenticated server-generated PowerPoint export with governed readiness and internal-draft handling', 'Preserved ROI Model v2.8, Brand System v1.0, Application Knowledge v1.0 and Christie Persona v1.0']
  },
  {
    version: '6.8.2', date: '2026-09-01', tag: 'fix',
    title: 'AI Knowledge & Christie Runtime Completion',
    changes: ['Regenerated current Help coverage and expanded specialist AI capability documentation', 'Added actual Manager and Sales Engineer Christie launch paths with server-controlled perspectives', 'Corrected competitive freshness and mapped Value History priority to counted ROI driver contribution', 'Aligned the final customer Business Case methodology wording']
  },
  {
    version: '6.8.1', date: '2026-09-01', tag: 'integrity',
    title: 'AI Context, Help & Production Email Integrity',
    changes: ['Unified Christie grounding across authorized opportunity workspaces', 'Made generated Help visible with deterministic curated overrides and registry-backed field semantics', 'Made admin email success reflect actual SendGrid provider acceptance with safe operational logging']
  },
  {
    version: '6.8.0', date: '2026-08-31', tag: 'ai',
    title: 'Help, AI Knowledge & Christie Coach Governance',
    changes: ['Introduced Application Knowledge 1.0, dedicated server-owned AI Help and prospect-safe field Help, Christie Persona 1.0, scenario-authorized coaching context, Coach Me preferences, and production-safe SendGrid configuration. ROI Model remains v2.8 and Brand System remains v1.0.']
  },
  {
    version: '6.7.2', date: '2026-08-31', tag: 'brand',
    title: 'Brand System Final Enforcement',
    changes: ['Completed final Brand System 1.0 enforcement across customer Business Case, Prospect Link components, session-expiry UX, provenance banners and server-generated Admin purge pages. Expanded Brand System regression coverage to prevent legacy corporate-blue, font and server-theme bypasses.']
  },
  {
    version: '6.7.1', date: '2026-08-31', tag: 'brand',
    title: 'Brand System Integrity Completion',
    changes: ['Completed centralized branding across Word battlecards and proposals, Solution Fit documents, browser print/PDF exports, email, semantic logo roles, document typography and audience footers; added bypass detection and literal-count audit reporting without changing Brand System v1.0 or ROI Model v2.8.']
  },
  {
    version: '6.7.0', date: '2026-08-31', tag: 'brand',
    title: 'Central Cloud Inventory Brand System',
    changes: ['Introduced the centralized Cloud Inventory Brand System across the web application, Prospect experiences, Executive Outputs, Proposal, PDF, PowerPoint, Word exports, methodology documents, Competitive Intelligence and authentication screens. Brand colors, typography, logos, charts, semantic statuses and document treatments now resolve from one governed source of truth.']
  },
  {
    version: '6.6.4', date: '2026-08-31', tag: 'integrity',
    title: 'Competitive Product Identity Integrity',
    changes: ['Corrected Competitive Intelligence product identity so vendors with multiple products can share a company/domain without being incorrectly deduplicated. Product-level identity now relies on product names, aliases, and governed product-specific evidence, while company domains resolve company identity. Admin source governance now distinguishes Proposed, Approved, Rejected, and Retired sources.']
  },
  {
    version: '6.6.3', date: '2026-08-31', tag: 'security',
    title: 'Competitive Intelligence Security & Migration Integrity',
    changes: ['Completed Competitive Intelligence governance with opportunity-level authorization, comprehensive legacy competitor migration and compatibility, Battlecard-safe duplicate merging, complete Admin product/source management, EPP competitive context, and restored Customer Proof release artifacts.']
  },
  {
    version: '6.6.2', date: '2026-08-31', tag: 'governance',
    title: 'Competitive Intelligence Memory & Governance',
    changes: ['Introduced persistent Competitive Intelligence with reusable product records, research history, source provenance, freshness, governed finding approval, versioned Battlecards, opportunity memory, and Admin competitive-content management. Newly researched competitors can now be reused rather than re-entered or researched repeatedly. RFgen and RF-SMART are maintained as independent competitive products.']
  },
  {
    version: '6.6.1', date: '2026-08-31', tag: 'integrity',
    title: 'Help, Admin Cleanup & UX Integrity Completion',
    changes: ['Replaced test-data cleanup with dependency-aware, recoverable Data Cleanup & Recovery; rebuilt Help around current tasks and governed terminology; and completed action hierarchy and responsive UX integrity without changing ROI Model v2.8.']
  },
  {
    version: '6.6.0', date: '2026-08-31', tag: 'experience',
    title: 'Application UX & Sales Manager Experience',
    changes: ['Redesigned the Sales Manager workspace around management attention, buying progress, customer commitments and explainable risk; simplified portfolio inspection across team, rep and buying-stage views; and introduced a consistent application-wide navigation and action hierarchy with responsive, accessible controls.']
  },
  {
    version: '6.5.3', date: '2026-08-31', tag: 'governance',
    title: 'Prospect Evidence Trust & Submission Integrity',
    changes: ['Strengthened Prospect Value History so immutable evidence is now classified from a server-authoritative questionnaire schema, Prospect Links are bound to authorized saved opportunities, Review / Sync uses actual submitted evidence rather than mutable drafts, and Discovery surfaces submission lineage and value-history actions directly.']
  },
  {
    version: '6.5.2', date: '2026-08-31', tag: 'architecture',
    title: 'Prospect Value Validation & Cross-Version History',
    changes: ['Added immutable Prospect Link submission snapshots and opportunity-wide ROI Value History', 'Reps can view prospect-submitted values across scenario versions, revalidate values with customer stakeholders, preserve original evidence, and compare current versus customer-supported values', 'Each ROI scenario version now traces exactly which value and provenance it used without changing ROI Model v2.8']
  },
  {
    version: '6.5.1', date: '2026-08-31', tag: 'fix',
    title: 'ROI Model v2.8 Integrity Completion',
    changes: ['Unified in-app and printable Impact Maps around the authoritative questionnaire and formula registries', 'Removed ghost technician-revenue methodology and made generated methodology consume counted engine drivers, overlaps, methods, and economic classes', 'Corrected questionnaire semantics and central/field boundaries, added complete documentation, actual-question tests, and frozen v27 fixtures']
  },
  {
    version: '6.5.0', date: '2026-08-31', tag: 'architecture',
    title: 'Economic & Questionnaire Integrity',
    changes: ['Established ROI Model v2.8 and an authoritative questionnaire-to-formula registry', 'Separated contribution-margin service value, penalties, expedite, first-time-fix, and field reconciliation economics', 'Added accuracy-derived recovery, explicit overlap decisions, prospect investment integrity, v2.7 compatibility, and governed methodology documentation']
  },
  {
    version: '6.4.19', date: '2026-08-31', tag: 'fix',
    title: 'Executive Credibility Integrity Patch',
    changes: ['Corrected Executive Value Story revision identity so Proposal review state no longer changes the story itself. Added safe unsaved draft outputs, removed legacy customer-story fallback on authoritative-story failure, aligned Proposal PDF with persisted Proposal editorial content, and strengthened Proposal story review governance.']
  },
  {
    version: '6.4.18', date: '2026-08-31', tag: 'governance',
    title: 'Unified Executive Value Story & Output Readiness',
    changes: ['Established one server-authoritative Executive Value Story for the Executive View, PDF, PowerPoint, proposal, Word export, and share flows', 'Added visible Ready, Review Before Sharing, and Draft Only readiness with explicit blockers, warnings, acknowledgement, and internal-draft controls', 'Made proposal editorial content persistent while governed facts remain traceable to a deterministic story revision']
  },
  {
    version: '6.4.17', date: '2026-08-31', tag: 'governance',
    title: 'Evidence-Driven Executive PowerPoint',
    changes: ['Rebuilt Executive PowerPoint around customer evidence and ROI provenance. Removed unsupported current-state, root-cause, implementation, and next-step fallbacks; added evidence-aware financial presentation, customer-safe Solution Fit context, joint next steps, and dynamic slide inclusion.']
  },
  {
    version: '6.4.16', date: '2026-08-31', tag: 'governance',
    title: 'PowerPoint Customer Proof Governance',
    changes: ['PowerPoint customer proof now uses only scenario-selected, source-backed approved Customer Proof Catalog records', 'Removed legacy hard-coded customer stories and omit the optional Customer Proof slide and navigation item when no approved proof exists', 'Kept visible slide numbering sequential and stored included proof IDs and revisions in deck metadata without changing ROI or Buyer Evidence']
  },
  {
    version: '6.4.15', date: '2026-08-31', tag: 'governance',
    title: 'Approved Customer Proof',
    changes: ['Replaced hard-coded customer-result claims with a source-backed, approval-governed server Customer Proof Catalog', 'Customer-facing outputs now resolve scenario-selected stable proof IDs and omit Customer Results when no approved proof exists', 'Added provenance, naming, status, external-use, maximum-selection, safe-projection, AI guardrail, and legacy-claim audit controls without changing ROI or Buyer Evidence']
  },
  {
    version: '6.4.14', date: '2026-08-31', tag: 'architecture',
    title: 'Authoritative Proposal Persistence',
    changes: ['Made Executive Proposals scenario-scoped and server persisted across authorized sessions and devices', 'Added debounced autosave, visible save state, revision conflict protection, safe legacy browser-draft import, and proposal carry-forward between ROI versions', 'Connected Buyer Evidence, Christie, Word export, and PDF output to the same authoritative proposal without changing ROI math, Opportunity Value, or BuyCycle progression']
  },
  {
    version: '6.4.13', date: '2026-08-31', tag: 'architecture',
    title: 'R10 Opportunity Value Semantics',
    summary: 'Added explicit Estimated Opportunity Value, separated commercial opportunity value from modeled investment and customer benefit, and made management portfolio values currency aware.'
  },
  {
    version: '6.4.12', date: '2026-08-31', tag: 'fix',
    title: 'R6.2 Analytics Outcome Authority',
    summary: 'Governed opportunity outcome now remains authoritative in Win/Loss analytics; legacy outcomes are used only for records without Buyer Evidence governance.'
  },
  {
    version: '6.4.11', date: '2026-08-31', tag: 'architecture',
    title: 'R6.1 Authoritative Opportunity Outcome Integrity',
    summary: 'Made governed Stage 7 Closed Won/Lost the sole current outcome, retired the Phase 1 outcome editor and API, separated realized value, and aligned switching, versioning, and analytics.'
  },
  {
    version: '6.4.10', date: '2026-08-31', tag: 'architecture',
    title: 'R9 Live Management Readiness',
    summary: 'Sales Manager and Customer Switcher now use the same live Buyer Readiness service as the governed workspace, while Stage History remains an immutable event snapshot.'
  },
  {
    version: '6.4.9', date: '2026-08-30', tag: 'feature',
    title: 'R8 Christie & AI BuyCycle Alignment',
    summary: 'Aligned Christie, AI Help, contextual guidance, and Rep Assessment UX to the governed Current Stage, Rep Assessment, and Evidence-Supported Stage model across BuyCycle Stages 2–7.'
  },
  {
    version: '6.4.8', date: '2026-08-30', tag: 'architecture',
    title: 'R7 Unified BuyCycle Stage Architecture',
    summary: 'Established Current BuyCycle Stage as the single governed opportunity stage, separated Rep Assessment and evidence-supported stage, preserved governance across ROI versions, and retired the editable seller-stage taxonomy.'
  },
  {
    version: '6.4.7', date: '2026-08-30', tag: 'feature',
    title: 'Governed opportunity close',
    changes: ['Replaced ambiguous native Won/Lost prompts with an explicit two-step Cloud Inventory close workflow', 'Added controlled loss reasons, customer feedback, conditional competitor details, separate lessons learned, and server-owned Stage at Loss', 'Required governed Stage 6 readiness and five actual user certifications for Closed Won', 'Removed role-only manager/admin bypasses and required a current relevant Manager Exception plus explicit acknowledgement', 'Added server-generated final value-case, value-realization, stakeholder, evidence, readiness, and team snapshots with terminal Stage 7 summaries, CRM-independent messaging, audit detail, and close-specific regression coverage']
  },
  {
    version: '6.4.6', date: '2026-08-30', tag: 'fix',
    title: 'Criterion-specific Buyer Evidence integrity',
    changes: ['Replaced broad source-presence matching with explicit validators for every Stage 2–6 readiness criterion', 'Prevented generic stakeholders, Discovery activity, proposals, competitors, Joint Project Plans, or partial Solution Fits from completing unrelated requirements', 'Required exact criterion-linked evidence with quality, customer validation, freshness, and mapped stakeholders where appropriate', 'Added semantic Solution Fit, workflow-validation, implementation-readiness, ROI baseline, economic-impact, and contract-economics checks', 'Added transparent proof summaries, precise blockers, mapped-stakeholder evidence entry, Christie context, Help, and a dedicated false-positive regression matrix without changing ROI formulas, stage thresholds, or history']
  },
  {
    version: '6.4.5', date: '2026-08-30', tag: 'fix',
    title: 'Buyer Commitment integrity',
    changes: ['Replaced the dated-milestone and Economic Buyer shortcut with one explainable buyer-action commitment service', 'Capped generic current customer and joint milestones at Moderate while treating overdue and seller-owned work as non-qualifying', 'Mapped current validated funding, decision, evaluation, ROI, procurement, and preference evidence to Strong commitment', 'Reserved Very Strong for explicit Cloud Inventory selection, funding reconfirmation, or Closed Won', 'Added commitment details, active/completed/overdue plan signals, stage blockers, Christie context, Help, and dedicated regression coverage without moving stages or rewriting history']
  },
  {
    version: '6.4.4', date: '2026-08-30', tag: 'fix',
    title: 'Evidence freshness integrity',
    changes: ['Made the customer Evidence Date authoritative for Current, Aging, Stale, and Needs Review status while retaining Last Updated only for audit', 'Added deterministic date-only aging, criterion-specific windows, future-date validation, and live freshness details', 'Made stale saved evidence block readiness and added an intentional Revalidate Evidence path without changing the rep-selected stage', 'Applied configurable 90-day freshness to customer ROI validation and Economic Buyer approval', 'Updated Christie context, Buyer Evidence cards, contextual Help, and regression coverage without changing ROI formulas or customer-value provenance']
  },
  {
    version: '6.4.3', date: '2026-08-30', tag: 'fix',
    title: 'OTIF maturity provenance correction',
    changes: ['Separated customer-baseline OTIF value from the industry-risk fallback when evaluating ROI maturity', 'Kept fallback OTIF value seller-supported even when revenue is prospect-verified', 'Added calculation-mode and support-reason detail to the ROI Maturity explanation', 'Added regression coverage for both OTIF modes while preserving the existing ROI formulas and maturity thresholds']
  },
  {
    version: '6.4.2', date: '2026-08-30', tag: 'feature',
    title: 'Customer-owned ROI maturity',
    changes: ['Rebuilt ROI Maturity around customer-supported annual value rather than generic Discovery completion', 'Added an authoritative 50% customer-value coverage threshold across every positive ROI driver', 'Separated Rep Estimate, Rep Confirmed, Customer Provided, and Prospect Verified provenance with source and date persistence', 'Added structured customer validation and explicit mapped Economic Buyer approval for Levels 3 and 4', 'Added a transparent ROI Maturity drawer, stage-blocking explanations, Christie context, export provenance, and dedicated regression coverage without changing ROI formulas']
  },
  {
    version: '6.4.1', date: '2026-08-30', tag: 'fix',
    title: 'Authoritative BuyCycle stage model',
    changes: ['Centralized governed BuyCycle parsing, validation, labels, and active progression for Stages 2–7', 'Preserved legacy Stage 6 and terminal Stage 7 records during loading and evidence saves instead of reducing them to Stage 5', 'Retired the obsolete stage-advance endpoint and retained the governed Stage 2→3→4→5→6 workflow', 'Kept Stage 7 exclusive to explicit Closed Won or Closed Lost actions and aligned Christie with the governed stage model', 'Added dedicated stage-model and regression coverage without changing ROI calculations or BuyCycle criteria']
  },
  {
    version: '6.4.0', date: '2026-08-30', tag: 'feature',
    title: 'Structured Sales Team administration',
    changes: ['Separated Primary and Additional Sales Leaders, Sales Reps, and Sales Engineers into clear team-editor panels', 'Added role-aware searchable multi-select pickers, multi-role badges, live composition counts, member search, and mobile full-screen selection', 'Kept professional role assignment in User Management while validating team eligibility and preventing duplicate memberships', 'Added explicit removal and deactivation impact warnings plus leader, Rep, SE, activation, and deactivation audit events', 'Clarified Team SE collaboration versus opportunity-level Primary SE responsibility', 'Closed inactive-team scope gaps in the centralized authorization service used by customer switching, Solution Fit, dashboards, direct access, and Christie']
  },
  {
    version: '6.3.0', date: '2026-08-30', tag: 'feature',
    title: 'Authorized in-context customer switching',
    changes: ['Replaced the normal return-to-landing switch flow with a responsive customer workspace overlay', 'Added one server-authorized lightweight search for customer-first, Rep-first, SE, Team, stage, status, and Solution Fit filtering', 'Preserved the current functional workspace while isolating customer scenarios, versions, discovery, Solution Fit, and Christie context', 'Added per-user authorized Recents, unsaved-work protection, view attribution, and direct Solution Fit entry', 'Updated the initial workspace, global customer search, Help, and AI guidance to use the same role-and-team authorization service']
  },
  {
    version: '6.2.0', date: '2026-08-29', tag: 'feature',
    title: 'Sales Teams, additive roles, and collaborative Solution Fit security',
    changes: ['Added first-class Sales Teams and many-to-many dated memberships for reps, SEs, and leaders', 'Centralized additive role permissions and server-side customer, scenario, stage, dashboard, and Solution Fit scope', 'Added same-team SE collaboration, Primary and Additional SE responsibility, permanent Created By attribution, and field-level Solution Fit change history', 'Added Admin Sales Teams workflow, searchable multi-role members, role multi-selects, access diagnostics, and historical close snapshots', 'Separated functionality demonstrated from customer validation in Solution Fit and its outputs']
  },
  {
    version: '6.1.1', date: '2026-08-29', tag: 'fix',
    title: 'Login release version stays synchronized',
    changes: ['Removed the hard-coded v4.0.0 login footer', 'Login now reads the deployed package version from the server health endpoint without caching', 'Added regression coverage that fails if a hard-coded login release version returns']
  },
  {
    version: '6.1.0', date: '2026-08-29', tag: 'feature',
    title: 'Task-oriented Help and current-workflow AI guidance',
    changes: ['Added searchable workflows for new opportunities, BuyCycle stages 2–7, buyer evidence, blockers, outputs, roles, managers, and CRM-independent operation', 'Added a replayable two-minute tour and contextual “Why is this blocking me?” guidance', 'Clarified the boundaries between application AI Help, Christie deal coaching, and prospect-safe question Help', 'Updated AI Help knowledge for Buyer Evidence & Stage Readiness and rep-owned stage selection']
  },
  {
    version: '6.0.0', date: '2026-08-28', tag: 'feature',
    title: 'Evidence-Based BuyCycle Deal Workspace',
    summary: 'The ROI application now owns BuyCycle Stages 2–7, critical buyer evidence, governed advancement and regression, and explicit Won/Lost outcomes without simulating CRM integration.',
    changes: ['Added a dedicated Buyer Evidence & Stage Readiness workspace inside every customer scenario', 'Reworked stages to Economic Consequences, Funding, Decision Criteria, Evaluation, Vendor Selection, and Closed', 'Added evidence provenance, strength, confidence, freshness, stakeholder, date, amount, timing, and customer validation', 'Added governed advancement, rep certification, stage regression, manager exceptions, and immutable history', 'Added Closed Won and Closed Lost with stage-at-loss preservation', 'Renamed leadership reporting to ROI Deal Governance Dashboard', 'Documented authoritative cross-app data sources and preserved legacy records as Setup Needed']
  },
  {
    version: '5.10.0', date: '2026-08-28', tag: 'design',
    title: 'Select once, assess automatically',
    summary: 'The rep maintains the deal stage once in the persistent Customer Workspace while Christie concentrates on evidence gaps and the next customer action.',
    changes: ['Added an autosaving Rep-Selected Deal Stage control to the persistent customer header', 'Added inline evidence alignment or evidence-supported-stage feedback', 'Removed duplicate stage entry from Deal Coach', 'Kept Deal Coach notes only for evidence not already captured elsewhere', 'Synchronized the rep selection with the saved scenario and manager governance view']
  },
  {
    version: '5.9.1', date: '2026-08-28', tag: 'fix',
    title: 'Rep-owned deal stages',
    summary: 'Removed CRM assumptions: the opportunity owner selects the working deal stage and Christie provides a separate advisory evidence assessment.',
    changes: ['Renamed CRM stage references to Rep-Selected Deal Stage', 'Made stage gaps compare the rep selection with the evidence-supported position', 'Updated Christie prompts, fallback output, and Sales Manager governance views']
  },
  {
    version: '5.9.0', date: '2026-08-28', tag: 'feature',
    title: 'Buyer Evidence & Stage Readiness Governance',
    summary: 'Buyer-stage decisions are now grounded in persisted customer evidence, governed advancement rules, and auditable manager exceptions.',
    items: ['Configurable buyer-evidence criteria for BuyCycle stages 1–5', 'Independent CRM, rep-assessed, and evidence-supported stage positions', 'Hard-gated advancement, rep certification, manager exceptions, and stage history', 'Offline-safe Christie assessment when live AI is unavailable', 'Stage gaps and readiness evidence in Sales Manager inspection']
  },
  {
    version: '5.8.1', date: '2026-08-28', tag: 'design',
    title: 'Sales Manager prototype-aligned experience',
    summary: 'The Sales Manager workspace now follows the approved leadership cockpit design and inspection workflow.',
    items: ['Restored the prototype leadership cockpit hierarchy and density', 'Added eight interactive management KPIs and portfolio distribution panels', 'Expanded the opportunity inspection table and next-customer-commitment visibility', 'Rebuilt the deal drawer around evidence, recovery, milestones, stakeholders, and internal actions']
  },
  {
    version: '5.8.0', date: '2026-08-28', tag: 'feature',
    title: 'Sales Manager Deal Management',
    summary: 'Sales leaders receive a role-gated portfolio view of deal health, execution, stakeholders, and interventions.',
    items: ['Multi-role Sales Manager access with server-side enforcement', 'Team, rep, and buying-stage portfolio views', 'Separate deal, Solution Fit, execution, stakeholder, and management-priority dimensions', 'Past-due and missing work visibility plus internal manager action plans']
  },
  {
    version: '5.7.6', date: '2026-08-28', tag: 'fix',
    title: 'Three Whys remain attached to the current scenario version',
    summary: 'After a versioned save, the newly created scenario version becomes active immediately so later Executive View autosaves survive logout and reload.',
    changes: [
      'Updated the active scenario ID from the server response after every successful versioned save',
      'Prevented Three Whys autosave from writing to the prior, non-current scenario version',
      'Refreshed the scenario/version picker after the new active version is established',
      'Added regression coverage for the save, logout, and current-version reload sequence'
    ]
  },
  {
    version: '5.7.5', date: '2026-08-28', tag: 'feature',
    title: 'Stronger champion objection handling and explicit Executive View save',
    summary: 'The champion deck now prepares internal advocates for finance, executive, operations, IT, security, adoption, and value-realization questions, while the Executive View has a dedicated narrative save action.',
    changes: [
      'Expanded the Champion Pack from five objection prompts to twelve practical questions with customer-safe answers',
      'Separated financial and executive objections from operations and IT objections for easier internal presentation',
      'Used the modeled contract economics, conservative case, cost of delay, implementation period, and payback where relevant',
      'Removed an overly absolute subscription-cancellation claim and replaced it with governance and value-realization guidance',
      'Added a prominent Save executive view action that immediately persists the Three Whys without creating an unnecessary scenario version'
    ]
  },
  {
    version: '5.7.4', date: '2026-08-28', tag: 'fix',
    title: 'Stable ROI product switching and persistent executive narrative',
    summary: 'Product selection is now presentation-only, customer Field Inventory state loads before ROI calculation, and Three Whys text autosaves across navigation and authenticated sessions.',
    changes: [
      'Prevented MEP/CIP selection from directly recalculating or changing ROI assumptions',
      'Loaded customer Field Inventory state before the first scenario ROI calculation',
      'Restored the saved Cloud Inventory solution when loading a scenario',
      'Added server-backed, debounced Three Whys autosave for keyboard edits',
      'Saved AI-enhanced Three Whys immediately and flushed pending edits before scenario changes or logout'
    ]
  },
  {
    version: '5.7.3', date: '2026-08-28', tag: 'fix',
    title: 'Customer Workspace no longer covers page actions',
    changes: [
      'Kept the Customer Workspace bar available at the top of each applicable screen while returning it to normal document flow.',
      'Removed the sticky high-layer positioning that allowed the bar to cover page titles, exports, and other action buttons while scrolling.',
      'Added regression coverage to prevent the workspace bar from becoming an overlay again.'
    ]
  },
  {
    version: '5.7.2', date: '2026-08-28', tag: 'feature',
    title: 'Persistent, field-aware AI experiences',
    changes: [
      'Added isolated session state for Christie, AI Assistant, Internal Field Help, and Prospect-Link Question Help so navigation no longer erases responses or follow-up context.',
      'Added explicit Continue, Refresh, Regenerate, and Clear behaviour; returning to a screen restores prior content without making an AI request.',
      'Added stale-information notices that preserve the prior response while telling the user when underlying context has changed.',
      'Added per-field Help histories and structured Field Context Objects with the exact screen, section, question, input type, units, current value, and only relevant prior inputs.',
      'Enforced a server-side prospect-safe allow-list so internal strategy, coaching, stakeholder classifications, risks, forecasts, and notes cannot enter Prospect-Link AI context.',
      'AI session state is cleared on logout and authenticated-session expiry to prevent content crossing user sessions.'
    ]
  },
  {
    version: '5.7.1', date: '2026-08-28', tag: 'feature',
    title: 'Evidence-driven BuyCycle coaching',
    changes: [
      'Added a dedicated advisory BuyCycle Stage 0–7 position and buyer-evidence workspace inside Christie, separate from CRM deal stage.',
      'Christie now challenges the stated position against buyer commitments and stage exit evidence, and distinguishes seller activity from genuine buyer progress.',
      'Added structured Three Whys, value evidence, stakeholder, risk, coaching, and next-commitment guidance based on the supplied sales methodology.',
      'Added a customer-facing safety mode that removes internal stage, qualification, risk, champion, and competitive coaching from prospect communications.'
    ]
  },
  {
    version: '5.7.0', date: '2026-08-28', tag: 'feature',
    title: 'Contract-term ROI and complete economic story',
    changes: [
      'Added an editable contract term in months, defaulting to 36, with deterministic support for 1–60 months and prorated partial contract years.',
      'Added simultaneous annual, cumulative, and total-contract economics, including explicit ROI labels and payback status for every displayed contract year.',
      'Made Total Contract ROI the headline metric across the live KPI bar, calculator, executive view, proposal, customer PDF, PowerPoint, and shared business case.',
      'Added contract benefit, investment, net benefit, NPV, ROI, and payback outputs using the configured implementation period and monthly benefit ramp.',
      'Added regression coverage for 36-month and 18-month contracts, including partial-year benefit and investment calculations.'
    ]
  },
  {
    version: '5.6.16', date: '2026-08-27', tag: 'fix',
    title: 'Fresh customer and scenario context',
    changes: [
      'Customer switching now refreshes customer and scenario lists before selection, and every selected scenario reloads its authoritative server data.',
      'Moved scenario switching and previous-version access into the persistent Customer Workspace bar so they are available across the deal workflow.',
      'Repaired the calculator Versions control so it correctly resolves the active scenario and opens server-fetched version history.'
    ]
  },
  {
    version: '5.6.15', date: '2026-08-27', tag: 'improvement',
    title: 'Contract-term Deal Coach health assessment',
    changes: [
      'Christie and Deal Coach readiness now assess total benefit, investment, net value, NPV, and payback across the proposal contract term rather than relying on Year 1 ROI.',
      'Updated champion materials with a warm, practical value-engineering voice focused on jointly validating the business case and route to value.',
      'Established Christie’s Toronto consultant voice: supportive, direct, and clear about the difference between entered facts and suggested guidance.'
    ]
  },
  {
    version: '5.6.14', date: '2026-08-27', tag: 'improvement',
    title: 'Compact customer workspace switcher',
    changes: [
      'Reworked the customer header into a compact, sticky Deal Context Bar with clearly labeled customer and scenario context.',
      'Moved customer switching into a focused, consistently placed action that no longer competes with page-level workflow and export controls.'
    ]
  },
  {
    version: '5.6.13', date: '2026-08-27', tag: 'feature',
    title: 'Christie AI Deal Coach',
    changes: [
      'Added Christie, a context-aware AI Deal Coach inside Deal Coach with deal-health, meeting-preparation, and follow-up prompts.',
      'Christie uses the current value case, stakeholder map, executive proposal, and Joint Project Plan while clearly separating facts from suggested guidance.',
      'Added copyable AI coaching responses and repaired proposal AI enhancement to use the authenticated AI proxy.'
    ]
  },
  {
    version: '5.6.12', date: '2026-08-27', tag: 'feature',
    title: 'Deal Coach and buyer-consensus workflow',
    changes: [
      'Added Deal Coach, a scenario-aware command center that prioritizes the next action required to advance the opportunity.',
      'Connected stakeholder coverage, executive proposal, value case, and Joint Project Plan into a single proposal-to-close workflow.',
      'Added forwardable champion email and internal sponsor brief templates that inherit the modeled value case.'
    ]
  },
  {
    version: '5.6.11', date: '2026-08-27', tag: 'feature',
    title: 'Executive proposal workspace and editable Word output',
    changes: [
      'Added a branded Executive Proposal workspace with calculator and narrative defaults, editable content, and local draft saving.',
      'Added AI case enhancement plus customer-ready PDF and editable Word proposal exports with confidentiality and copyright footers.',
      'Defaulted proposal commercial terms to a 36-month term and 30-day validity while keeping both fields editable.'
    ]
  },
  {
    version: '5.6.10', date: '2026-08-27', tag: 'fix',
    title: 'Joint Project Plans and customer-ready plan exports',
    changes: [
      'Renamed the internal and customer-facing Mutual Action Plan experience to Joint Project Plan while preserving existing plan data and links.',
      'Added customer-facing context that explains how the shared plan validates the value case, reduces evaluation risk, and keeps actions, owners, and dependencies visible.',
      'Added consistent Cloud Inventory copyright and confidentiality footers to customer PDFs, PowerPoints, shared plans, and Word battlecards.',
      'Condensed Joint Project Plan PowerPoints so workstreams remain a table column instead of producing a separate slide for every group.',
      'Fixed a server startup error caused by registering protected admin routes before the authentication middleware was initialized.'
    ]
  },
  {
    version: '5.6.9', date: '2026-08-27', tag: 'feature',
    title: 'Flexible Mutual Action Plan ordering and customer-ready groupings',
    changes: [
      'Added custom action-plan groupings that can be created, renamed, reordered, and removed, including safe reassignment of milestones when a grouping is deleted.',
      'Added accessible milestone move-up and move-down controls plus a grouping selector so milestones can be reordered within a section or moved across sections.',
      'The Add milestone control now lets the rep choose the destination grouping and whether to insert at the beginning or end; every grouping also has an add-here shortcut.',
      'Persisted grouping metadata through a new backwards-compatible database migration while automatically upgrading existing fixed-phase plans in the editor.',
      'Updated the live customer plan, customer PDF, and customer PowerPoint to preserve custom grouping names and order.',
      'Improved the customer view with actions-for-your-team and overdue summaries, per-group completion, explicit status labels, accessible completion buttons, mobile layout, and timezone-safe dates.'
    ]
  },
  {
    version: '5.6.8', date: '2026-08-27', tag: 'fix',
    title: 'Prospect live ROI now counts only supported value drivers',
    changes: [
      'Removed silent inventory and revenue defaults from the prospect-link headline so unanswered drivers contribute zero instead of inflating an early estimate.',
      'Corrected the one-answer example from $598k–$854k to $72.8k–$104k when only ten users are supplied.',
      'Made the driver breakdown fully reconcile to annual benefit, including inventory carrying, count labor, throughput, order accuracy, and field inventory components.',
      'Fixed percentage handling and now converts hours-per-week answers into a percent of a 40-hour week consistently with the rep Discovery workflow.',
      'Renamed Estimate confidence to Data coverage and replaced the inaccurate range-narrowing claim with clear supported-driver language.',
      'Changed locked-driver prompts to say additional data can add supported drivers without promising a significant value increase.'
    ]
  },
  {
    version: '5.6.7', date: '2026-08-27', tag: 'fix',
    title: 'AI competitive research now inherits Battlecard selections',
    changes: [
      'Fixed the state mismatch that caused AI Research to report no Cloud Inventory source after a rep selected CIP or MEP on the Battlecard tab.',
      'The selected Cloud Inventory solution now supplies its approved curated battlecard positioning as a valid first-party AI research source.',
      'The selected competitor now carries into AI Research automatically, including the MEP-specific RFgen/RF-SMART and low-code options.',
      'Competitor website defaults and product-specific competitor lists now stay aligned with the selected CIP or MEP motion.',
      'Added regression coverage and browser verification for the MEP plus ERP Mobility / Scanning research workflow.'
    ]
  },
  {
    version: '5.6.6', date: '2026-08-27', tag: 'feature',
    title: 'Rapid-entry Solution Fit workflow for high-volume SE discovery',
    changes: [
      'Redesigned Solution Fit around compact tables, visible completion counts, missing-only review, section badges, and keyboard-friendly progression.',
      'Added three reusable engagement templates plus one-click recommended defaults for process scope, architecture, integration, ownership, and operating model.',
      'Automatically reuses known calculator, scenario, discovery, stakeholder, and signed-in-user data while showing the source beside each populated value.',
      'Added locations and operating scope, stakeholder contact pickers, collapsed optional contact details, interface direction and frequency, and exception-only notes.',
      'Added one-click bulk actions to mark all in-scope workflows demonstrated or full fit, with reliable saving and regression coverage.',
      'Corrected readiness logic so an empty product list cannot count as complete and added accessible tab semantics and responsive rapid-entry styling.'
    ]
  },
  {
    version: '5.6.5', date: '2026-08-26', tag: 'fix',
    title: 'PowerPoint exports restored and narrative action labels cleaned up',
    changes: [
      'Restored the main business-case PowerPoint download plus the Champion Pack, role one-pager, and ROI Methodology PowerPoint exports.',
      'Added the missing JSZip browser dependency and normalized the PptxGenJS browser constructor used by every export.',
      'Added a reliable local-first runtime loader with CDN fallback so exports can recover if an initial script request fails.',
      'Corrected unsupported PowerPoint color formats and added the missing light-gray theme token used by the Champion Pack.',
      'Replaced escaped Reset and AI Enhance label codes with their intended icons on first page load.',
      'Added regression coverage for dependency order, constructor normalization, PowerPoint color validity, and clean narrative labels.'
    ]
  },
  {
    version: '5.6.4', date: '2026-08-26', tag: 'fix',
    title: 'Application-wide UI recovery and responsive calculator polish',
    changes: [
      'Restored the complete Model Confidence visual system: progress bar, status legend, grouped chips, state colors, spacing, and mobile wrapping.',
      'Fixed three malformed lines in the main startup script that stopped later initialization code from running, leaving multiple screens partially rendered.',
      'Recovered desktop styles for sensitivity charts, saved-scenario stage filters, analytics KPI cards, and executive scenario controls.',
      'Separated floating actions from calculator content on desktop and removed duplicate floating save/export actions on smaller screens.',
      'Repaired mobile navigation, the two-metric KPI bar, and the horizontal calculator stepper; verified all primary pages without horizontal overflow.',
      'Added a UI regression test that parses every inline script and checks the recovered component and responsive style contracts.'
    ]
  },
  {
    version: '5.6.3', date: '2026-08-26', tag: 'fix',
    title: 'ROI calculation integrity, timeline, overlap, and assumption controls',
    changes: [
      'Implementation and ramp benefits now use one continuous 60-month schedule. Payback and NPV can no longer count benefits before go-live when implementation extends beyond year one.',
      'All recovery, carrying, discount, leakage, error, accuracy, and ramp percentages are bounded to their documented ranges by the server-authoritative engine.',
      'Inventory carrying and turns estimates no longer use a fixed 15% heuristic or add overlapping benefits. The model counts the turns estimate plus only incremental direct carrying savings, equal to the higher estimate overall.',
      'Field-inventory zero values are preserved. Leakage recovery and reconciliation-effort recovery are explicit inputs, and reconciliation savings now apply the chosen recovery rate.',
      'Saved percentage inputs reload at the correct scale, including explicit zero discount and ramp values.',
      'Working capital, labor capacity value, and OTIF value realization are labeled and disclosed according to their financial meaning. Unvalidated Medical Devices / Life Sciences defaults were replaced with zero values that require customer inputs.',
      'ROI tests expanded from 17 to 26 checks covering long implementations, zero assumptions, percentage bounds, boolean coercion, zero discount rates, and overlap removal.'
    ]
  },
  {
    version: '5.6.2', date: '2026-08-26', tag: 'fix',
    title: 'Value breakdown percentages fixed; next steps MAP-aware and deal-stage-aware',
    changes: [
      'Annual value breakdown bar chart: percentages were calculated as % of the largest driver (so the biggest bar always showed 100% and others were relative). Fixed to show % of total annual benefit, which is what the reader expects. The percentage label is now a separate column outside the bar fill div, so it cannot be clipped by overflow:hidden. Applies to both the executive view tab and the PDF print layout. CSS updated to a 4-column grid (label / bar / pct / value).',
      'Bar chart labels cut off: the label text was rendered inside the bar fill div, which has overflow:hidden. Any label on a short bar was clipped or invisible. Moved all labels outside the fill into a dedicated column.',
      'Recommended next steps: buildNextSteps() previously returned the same three hardcoded steps regardless of deal stage or whether an action plan existed. Now: (1) if an active Mutual Action Plan exists for the current company, open milestones are used as the next steps, sorted by due date with overdue items flagged. (2) If no MAP, steps are selected by deal stage: Discovery/Prospecting, Demo, Evaluation/POC, Proposal/Negotiation/Contracting, and Closed Won/Implementation each produce relevant, stage-specific steps. (3) Falls back to the original generic steps if no stage is set.',
      'MAP next steps in PDF export: open MAP milestones are serialised into the print payload (vForPDF._mapSteps) so the PDF version of next steps also reflects the live plan, not just the in-app view.',
      'print.html: added a self-contained _buildPrintNextSteps() function with the same MAP+stage logic, reading from sv._mapSteps passed through the URL payload.'
    ]
  },
  {
    version: '5.6.1', date: '2026-08-26', tag: 'fix',
    title: 'Customer gate, scenario lookup, cleanup export, and JSZip bugs fixed',
    changes: [
      'Customer gate showed "Loading..." on first login: initCalcTab() was awaiting loadCompanies() before rendering the gate, causing a blank/loading state until the API responded. Fixed by showing the gate immediately with an empty list, then refreshing the list once companies arrive from the server. The gate is now instant.',
      '"No scenarios for James Test yet" despite 10 existing: promptScenarioForCompany() filtered the in-memory savedScenarios array, but that array may not be populated yet if the user selected a customer before fetchScenarios() completed (common on first login). Fixed by making the function async and awaiting fetchScenarios() when the cache is empty before filtering.',
      'adminCleanupExecute is not defined: the cleanup function was renamed to adminCleanupExecuteSelected / adminCleanupExecuteAll in v5.5.3, but a stale window.adminCleanupExecute = adminCleanupExecute export remained in the code, causing a ReferenceError logged in the console on every page load. Removed the stale export.',
      'JSZip is not defined (pptxgen error): in v5.6.0 we switched from loading pptxgen from CDN to serving it from npm via /pptxgen.min.js. The CDN build of pptxgen bundles JSZip internally; the local npm build does not expose JSZip as a global, causing pptxgen to fail immediately. Reverted to CDN as the primary source (which bundles JSZip), with /pptxgen.min.js as the onerror fallback. CSP already allows cdn.jsdelivr.net.'
    ]
  },
  {
    version: '5.6.0', date: '2026-08-26', tag: 'fix',
    title: 'Full functional audit: admin panel, duplicates, server-side exports, pptxgen local',
    changes: [
      'CRITICAL FIX: switchAdminPanel() was called by all 7 admin tab buttons (Users, Benchmarks, Audit log, Version history, Error log, Export, Cleanup) but the function declaration was missing — the function body existed but the opening line had been accidentally removed in a previous edit. Admin tab navigation was completely non-functional. Restored the function declaration.',
      'CRITICAL FIX: deal-export.js had accumulated three copies of _getCompData() and exportCompPDF() from repeated append operations during development. JavaScript uses the last definition, so behaviour was unpredictable. Removed all duplicates leaving exactly one of each function plus the correct window.exportCompPDF and window.exportCompDocx assignments.',
      'Word (.docx) export now runs server-side: added POST /api/export/battlecard-docx route that uses the docx npm package to generate a real .docx file on the server and streams it to the browser as a download. No CDN, no client-side library, no popup required. The old HTML-in-Word Blob approach is replaced.',
      'pptxgenjs now served from npm package: added pptxgenjs and docx as real npm dependencies in package.json. Express serves /pptxgen.min.js directly from node_modules so no CDN call is needed for PowerPoint export. The deChk() lazy-loader now tries /pptxgen.min.js first and only falls back to CDN if the local file is unavailable.',
      'Removed stale CDN script tag for pptxgenjs from index.html — replaced with /pptxgen.min.js served by Express from node_modules.',
      'Fixed dangling comment fragment in deal-export.js that caused a JavaScript syntax error (a file header comment was split across the boundary when a duplicate block was removed).'
    ]
  },
  {
    version: '5.5.9', date: '2026-08-25', tag: 'fix',
    title: 'Migration 022 FK type fix: UUID not INTEGER for users(id) references',
    changes: [
      'Migration 022_competitive_sources.sql used INTEGER for uploaded_by and created_by columns that REFERENCES users(id). The production users.id column is UUID (set in migration 001), so PostgreSQL rejected the foreign key with "cannot be implemented". Fixed: both columns now declared UUID REFERENCES users(id) ON DELETE SET NULL. The ci_source_id column referencing ci_product_sources(id) correctly remains INTEGER since ci_product_sources.id is SERIAL.',
      'Added test/migration-schema-compat.test.js: a new automated test that runs against all migrations and checks every REFERENCES clause against the known primary key types of referenced tables. UUID PK tables (users, scenarios, customers, etc.) require UUID local column type; SERIAL/INTEGER PK tables require INTEGER-family. The test splits on comma+newline to analyze individual column definitions rather than spanning multiple columns. Currently validates 26 FK relationships across 22 migrations and will catch this class of type mismatch before packaging in future.',
      'The migration is idempotent (CREATE TABLE IF NOT EXISTS) and safe to re-run since it had not successfully applied in production. Filename unchanged as required.'
    ]
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

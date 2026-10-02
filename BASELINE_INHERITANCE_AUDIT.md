# v6.9.25 Baseline Inheritance Audit

- Parent archive: `cloud-inventory-roi-v6.9.24-render-ready.zip`
- Verified parent SHA-256: `7f06565d76a4918f9c78fe8cc0debd1af64f71cc3a40ceeb474ec57726e0a7f2`
- Parent application version: 6.9.24
- Target application version: 6.9.25
- Deployed parent Git commit: `fc348bd5cc43b31dd5b5611afd92a00d750afd2b`
- Developer source snapshot: `00b8163afc7e621061a7db521b3a6bab685452a1`
- ROI authority: ROI Model v2.8 / modelVersion 28
- Brand System, Application Knowledge, and Christie Persona: v1.0
- Database migration added: `038_repair_scenario_customer_identity.sql`
- Authorization and role capabilities changed: none

The corrective release preserves immutable Prospect evidence, deliberate per-value application, Rep Confirmed provenance, native currency, output readiness, and the SE Solution Fit authorization boundary. The migration repairs scenario-to-customer identity using the existing scenario owner and normalized company name; it does not broaden access or rewrite ROI evidence.

## Prior audit records

# v6.9.23 Baseline Inheritance Audit

- Parent archive: `cloud-inventory-roi-v6.9.22-render-ready.zip`
- Verified parent SHA-256: `f6cbd19c59981faab2ee7267333fb9768aa3c2113f39c960a54109233fc10542`
- Parent application version: 6.9.22
- Target application version: 6.9.23
- Baseline Git snapshot: `211befa7be6aa32a4c476784b3bb418905d2a2d7`
- ROI authority: ROI Model v2.8 / modelVersion 28
- Brand System, Application Knowledge, and Christie Persona: v1.0
- Database migrations added: none
- Authorization and role capabilities changed: none

The release preserves immutable Prospect evidence, deliberate per-value application, governed scenario versioning, SE Solution Fit scope, output readiness, and the 25-output registry.

## Prior v6.9.21 audit record

- Parent archive: `cloud-inventory-roi-v6.9.20-render-ready.zip`
- Verified parent SHA-256: `8bc77f0e374e378faea8f0a887760524c4f6b4df1b3bcb16a6ceeac1591719d5`
- Parent application version: 6.9.20
- Target application version: 6.9.21
- Baseline Git snapshot: `d0bfb30b76eb21b56c75bbb10ef3e9eb36a679c3`
- ROI authority: ROI Model v2.8 / modelVersion 28
- Brand System: v1.0
- Application Knowledge: v1.0
- Christie Persona: v1.0
- Migration ceiling: `037_rep_confirmed_value_provenance.sql`; no migration added
- Output Registry: 25 active governed outputs
- Customer Business Case, Executive outputs, approved Battlecards, JPP, Proposal, Stakeholders, and saved Solution Fit output authority preserved
- Champion Pack remains intentionally inactive pending governed conversion

The exact deployed archive was used without substituting an earlier package or reconstructed source.

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.
# v6.9.24 baseline inheritance

The corrective release inherits from `cloud-inventory-roi-v6.9.23-render-ready.zip` with SHA-256 `94c9e4d0ba60ca9b5480d1ca360f4d946d7f06ae8b195a015d73df6b2a836dcc` and parent Git commit `932c159a9da181c041a3b8df28b8867b1b2caddf`. ROI Model v2.8, Brand System v1.0, Application Knowledge v1.0, Christie Persona v1.0, evidence provenance, authorization, and saved-state protections remain unchanged.

# v6.9.25 pre-build baseline inheritance audit

- Exact parent archive: `cloud-inventory-roi-v6.9.24-render-ready.zip`
- Verified parent SHA-256: `7f06565d76a4918f9c78fe8cc0debd1af64f71cc3a40ceeb474ec57726e0a7f2`
- Parent application version: 6.9.24
- Target application version: 6.9.25
- Deployed parent Git commit: `fc348bd5cc43b31dd5b5611afd92a00d750afd2b`
- Imported developer source snapshot: `00b8163afc7e621061a7db521b3a6bab685452a1`
- ROI authority: ROI Model v2.8 / `modelVersion` 28
- Brand System: v1.0
- Application Knowledge: v1.0
- Christie Persona: v1.0
- Migration ceiling: `037_rep_confirmed_value_provenance.sql`
- Output Registry: 25 active governed outputs; Champion Pack and Deal Coach Champion Kit remain intentionally inactive
- Active Customer Business Case route: `src/routes/business-case-shares.js`
- Active Executive file routes: `src/routes/scenarios.js` (`/:id/export-pdf`, `/:id/export-docx`, `/:id/export-pptx`)
- Active Proposal routes: `server.js` (`/api/export/proposal-pdf`, `/api/export/proposal-docx`)
- Active Battlecard routes: `server.js` governed revision PDF/Word routes
- Active Solution Fit workflow: dedicated cross-account selector and `src/routes/solution-fit-customers.js` / `src/routes/handoffs.js`

## Protected authorities carried forward

- Immutable Prospect submissions and deliberate per-value application
- Exact-value Rep Confirmed provenance
- One canonical Executive Value Story and readiness decision
- Saved-record authority for Proposal, JPP, Stakeholder, and Solution Fit outputs
- Native scenario currency and null-is-not-zero semantics
- Frozen Customer Business Case publication
- Server Prospect ROI preview
- Customer Email governed fact locking
- Buyer Evidence / BuyCycle governance and outcome integrity
- Authorization and customer-safe projections

## Confirmed corrective workstreams

The role-based v6.9.24 regression backlog is consolidated by root cause rather than by repeated symptom ID:

1. Customer, opportunity, and scenario identity isolation across navigation, reload, manager actions, same-name customers, and Solution Fit.
2. Saved working-state integrity for Prospect-applied values, Three Whys, Field Inventory activation, JPP milestones, and historical versions.
3. One bounded governed file-export lifecycle for PDF, Word, and PowerPoint with explicit saved scenario authority and actionable failures.
4. Proposal initial-save/edit/export reachability and canonical saved Proposal authority.
5. Canonical contract-economic presentation across Compare, Analytics, Sales Manager, Saved Scenarios, Executive, and Sensitivity.
6. AI and coaching context parity with saved stakeholders, JPP, ROI provenance, product identity, and current field context.
7. UI integrity: modal contrast, role display parity, credential-autofill isolation, dates, read-only controls, and feedback.

No ROI formula, evidence boundary, authorization scope, public endpoint classification, or migration is changed unless a failing behavioral test proves that such a change is required.

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.

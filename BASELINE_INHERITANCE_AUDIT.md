# v6.9.27 Pre-build Baseline Inheritance Audit

## Source and version

- Exact parent archive: `cloud-inventory-roi-v6.9.26-render-ready.zip`
- Verified parent SHA-256: `1b6ffd73e9c7210abad8defc0fb1f8460a314eb1823bdb38a44442d247e3ed0a`
- Parent application version: `6.9.26`
- Target application version: `6.9.27`
- Production parent Git commit: `79b1efee047346214b327cfebc8563c1a509570a`
- Developer source snapshot: `424476d2e7caf2b98b772378ea3105a88d87e8ad`
- ROI authority: ROI Model v2.8 / `modelVersion` 28
- Brand System, Application Knowledge, and Christie Persona: v1.0
- Migration ceiling before this build: `039_sync_customer_field_inventory.sql`
- Output Registry: 25 active governed outputs

The build started from the exact parent archive and SHA named above. Repository composition uses the live production Git commit as its parent while retaining the developer snapshot as supporting provenance.

## Active production paths carried forward

- Customer Business Case: `src/routes/business-case-shares.js`, mounted at `/api/business-case-shares`.
- Executive outputs: `src/routes/scenarios.js` routes `/:id/export-pdf`, `/:id/export-docx`, and `/:id/export-pptx`.
- Proposal outputs: server-owned `/api/export/proposal-pdf` and `/api/export/proposal-docx` routes.
- Champion Pack: intentionally inactive; the UI remains disabled pending governed output conversion.
- Competitive Battlecard: approved-revision PDF and DOCX exports remain server governed.
- Solution Fit: dedicated cross-account selector and the governed `solution-fit-customers` and handoff routes.
- Joint Project Plan: governed map routes and server-generated PDF/PPTX outputs.

## Protected authorities and regression controls

- Immutable Prospect submissions and deliberate, per-value application.
- Server-authoritative ROI persistence using governed raw inputs only.
- Product-neutral ROI behavior across CIP, MEP, and EPP.
- Exact-value Rep Confirmed provenance.
- One canonical Executive Value Story and cross-format readiness decision.
- Saved-record authority for Proposal, JPP, Stakeholder, and Solution Fit outputs.
- Native scenario currency and null-is-not-zero semantics.
- Customer-safe projections, frozen Customer Business Case publication, and governed fact locking.
- Existing migrations and cumulative permanent regression coverage.

## Authorized v6.9.27 change boundary

The release is limited to the documented corrective backlog: server ROI authority, saved-state reliability, governed workspace context, authorization enforcement, destructive-operation safety, output consistency, and JPP scenario integrity. It does not authorize a new ROI formula, role expansion, evidence-boundary change, or replacement output architecture.

SE Solution Fit Scope: Sales Engineers have cross-account access to all active customers for Solution Fit discovery/create/view/edit only. This does not confer general cross-account customer, scenario or opportunity access.

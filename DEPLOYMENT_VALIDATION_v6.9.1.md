# Deployment validation — v6.9.1
No deployment or production-system mutation was performed.
GitHub push: NOT TESTED. Render build/start/health/migration: NOT TESTED. SendGrid delivery/events: NOT TESTED.

## Local preparation
Existing render.yaml preserved: npm ci production build, node server.js start, /health probe and Node 22.22.0.
Local clean install and release gates run under the matching Node version. Windows test results do not prove Linux deployment.

## Required controlled-environment checks
1. Back up PostgreSQL. Apply migrations through 035. Verify rerun safety and immutable publication fields while view tracking/revocation still work.
2. Sign in using Admin, Rep, SE, Sales Manager and Sales Leader roles. Check allowed and denied customer/scenario access without changing existing grants.
3. Load customers, switch customers, open an existing exact scenario, verify saved Three Whys and Solution Fit creation/recovery/MEP scope.
4. Open Executive View; verify value graphs and PDF/PPT/Word.
5. Test Proposal preview/PDF/Word, both JPP audiences PDF/PPT, Stakeholder PDF/PPT, all Solution Fit PDFs, Methodology PDF/PPT, approved Battlecard PDF/Word, Impact Map and Role One-Pager.
6. Confirm Champion Pack stays unavailable. Confirm old scenario/print links never expose raw data.
7. Publish Ready and explicitly acknowledged Review business cases; reject Draft Only and unauthorized scenario/customer requests.
8. Open the public link logged out. Inspect network response for allowlisted fields only. Create/edit a later scenario version and confirm the existing publication is unchanged.
9. Verify USD and GBP output, correct internal/customer footers, long names, long narratives and large workstream tables.
10. Test configured SendGrid events. Record actual outcomes without treating absent configuration as success.

## Rollback/retention caution
Legacy Business Case rows intentionally return an updated-link notice. Publishing a new link is required; old links do not silently follow a newer version.
Migration 035 is additive but installs an immutability trigger. Do not blindly roll back to legacy publishing code after new snapshots exist.
Existing scenario/user foreign-key deletion behavior has not been integration-tested with the trigger. Validate retention/deletion policy before production use.

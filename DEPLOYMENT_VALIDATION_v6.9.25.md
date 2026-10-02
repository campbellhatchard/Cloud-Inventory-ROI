# Deployment Validation — v6.9.25

## Render deployment checks

1. Confirm `/health` reports 6.9.25 and the login/version-history UI shows 6.9.25.
2. Confirm migration 038 completed before normal traffic.
3. Sign in with Rep, SE, Sales Manager/Leader, mixed-role, and Admin test users.
4. Switch customers and verify the selected customer's current scenario, versions, Field Inventory state, Prospect evidence, Stakeholders, JPP, and Solution Fit load together.
5. Create and save a new scenario version; verify its customer identity remains unchanged after reload and logout/login.
6. Exercise Proposal initial save, edit, reload, PDF, and Word.
7. Download JPP customer/internal PDF and PowerPoint, Stakeholder PDF/PowerPoint, Solution Fit summary/risk/handoff PDF, Competitive PDF/Word, Impact Map PDF, ROI Methodology PDF/PowerPoint, and Executive PDF/Word/PowerPoint.
8. Open every downloaded file and verify branding, audience, saved data, native currency, and confidentiality classification.
9. Review a completed Prospect submission, confirm the comparison modal is readable, deliberately apply one value, and verify the unsaved warning remains until a scenario version is saved.
10. Confirm Christie sees the current saved Stakeholder Map and Joint Project Plan.

Production readiness remains unclassified until these live checks are completed by the Product Owner.

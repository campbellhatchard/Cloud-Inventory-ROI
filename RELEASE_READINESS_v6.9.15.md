# Release Readiness — v6.9.15

Status: **awaiting production deployment and post-deployment smoke validation**.

The source package is based on the exact Product Owner-selected v6.9.13 archive and contains bounded recovery changes only. Local deterministic and production-lock results are recorded in `QA_RESULTS_v6.9.15.md`. PostgreSQL integration and live Render behavior must be verified as deployment gates; no local result is a substitute for those production checks.

Post-deployment smoke requirements:

1. `/health` reports v6.9.15 and database connectivity.
2. A public Prospect Link loads and displays its ROI progress/preview.
3. Prospect answers save, submit, and refresh in the rep view.
4. Unsaved ROI changes block Executive PDF generation with a save instruction.
5. After saving a new scenario version, Executive PDF reflects the updated ROI.
6. Scenario creation returns its customer identity and scenario deletion retains a valid current version.

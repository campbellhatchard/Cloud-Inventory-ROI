# QA Results — v6.9.24

- Focused governed export tests: 41 passed, 0 failed, 0 skipped.
- Full application regression: 727 passed, 0 failed, 2 skipped across all scripted test phases.
- The two skips are database-dependent because no safe local `DATABASE_URL` was available.
- JavaScript syntax validation: passed.
- Actual Proposal PDF and ROI Methodology PDF builders produced valid `%PDF` artifacts.
- PostgreSQL certification: NOT TESTED locally; GitHub's ephemeral PostgreSQL gate remains required.

# Deployment Validation — v6.9.43

## Before deployment

1. Verify the delivered ZIP SHA-256 and committed archive identity.
2. Run the configured CI workflow on Node 22; it repeats `npm ci`, migrations, mandatory PostgreSQL integration, and the complete release runner.
3. Run migrations and PostgreSQL integration only against a clean non-production database.
4. Review the release, output-runtime, and PostgreSQL machine evidence.
5. Deploy the committed archive and confirm `/health`, Version History, and served assets identify `6.9.43`.

## Required authenticated regression

1. Exercise Admin, Rep, Sales Manager/Leader, SE, and mixed-role navigation and authorization.
2. Switch repeatedly between at least two customers and confirm Calculator, Executive, Proposal, Christie, AI Help, Discovery, and Solution Fit never retain prior-customer content.
3. Save an ROI scenario and confirm the displayed metrics equal the reopened server record.
4. Validate a legacy model requires the existing v2.8 upgrade review before save.
5. Confirm Executive and Proposal files use only the active scenario and correct readiness audience.
6. Verify Solution Fit selected-app counts refresh immediately; incomplete inventory, turnover, open gaps, or unsaved changes cannot show Ready.
7. Open a read-only Solution Fit and confirm no save, updated timestamp, or audit event is created.
8. Confirm each Three Why has one microphone, AI Field Help clears removed fields, and Christie/AI time out safely.
9. Confirm same-name Sales Manager opportunities remain separate and show different opportunity references.

## Status

PENDING deployment execution. Local automation does not certify the deployed production environment.

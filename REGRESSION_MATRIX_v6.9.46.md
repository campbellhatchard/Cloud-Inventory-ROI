# v6.9.46 Regression Matrix

Baseline: `cloud-inventory-roi-v6.9.45-render-ready(1).zip`
Parent SHA-256: `dece15e61fab898350166e5279a3c5eb53d522218e3d6ba2158ee4aa6c8aea31`

## Corrective defects

| Defect | Reproduced on v6.9.45 | Root cause | Correction | Automated evidence | Browser | PostgreSQL | Result |
|---|---|---|---|---|---|---|---|
| REG-6945-01 | Yes | Three Why persistence had only legacy sibling fields and no canonical persistence/read projection shared at the story boundary. | Canonical `executiveNarrative.threeWhys`, compatibility mirrors, and one story resolver. | Actual Executive/Proposal Web, PDF, DOCX, and PPTX semantic test. | NOT TESTED on v6.9.46 | No schema change; DB integration NOT TESTED | Automated PASS |
| REG-6945-02 | Yes | Catalog descriptors and saved rows used incomparable keys because saved rows had IDs and descriptors did not. | Stable catalog identity distinguishes governed catalog entries from real `non_standard` rows. | 15+0 and 15+2 save/reload fixtures. | NOT TESTED | No migration; DB integration NOT TESTED | Automated PASS |
| REG-6945-03 | Yes | Internal Discovery ignored Field Inventory applicability while Prospect/Impact used a different selector/state. | One applicable-questionnaire selector for all governed discovery consumers. | Exact ID parity, FI on/off, Manufacturing/Default. | NOT TESTED | Immutable submission suites NOT TESTED with DB | Automated PASS |
| REG-6945-04 | Yes | Server completion left the local item in a terminal queue state and the button used queue length rather than uploadable states. | ACTIVE response reconciliation, queue removal, single-flight guard, idempotent attachment acceptance, server list count. | Queue/state/idempotency tests plus v6.9.44/v6.9.45 suites. | NOT TESTED | PostgreSQL/R2 NOT TESTED | Automated PASS |
| REG-6945-05 | Yes | Saved list exposed legacy aliases while Compare required modern projection fields. | One null-preserving read-time financial summary populates both projections. | Complete legacy, missing legacy, and zero-value fixtures. | NOT TESTED | No migration; representative DB fixture NOT TESTED | Automated PASS |
| REG-6945-06 | Yes | Gap labels concatenated product, ERP, group, and app even when ERP and group were the same token. | Central structured, case-insensitive distinct-token formatter. | JDE, SAP, Oracle EBS, CIP, EPP, custom cases. | NOT TESTED | Not database-dependent | Automated PASS |
| REG-6945-D1 | Degraded once | No deterministic code defect reproduced; provider timed out and governed fallback operated. | No production behavior change. | Timeout/fallback/loading cleanup fixture. | NOT TESTED | Not database-dependent | Fallback PASS |

## Preserved critical areas

| Area | Evidence | Result |
|---|---|---|
| ROI Model v2.8 / modelVersion 28 | Full suite, v27 locks, ROI v2.8 tests; formulas unchanged | PASS |
| Prospect evidence and explicit application | Production locks and consolidated Prospect-value tests | PASS |
| Solution Fit authorization and cross-account SE boundary | v6.9.2, v6.9.16–v6.9.45 automated suites | PASS |
| PS Turnover DOCX/ZIP | v6.9.45 integration tests and runtime owner matrix | PASS |
| Executive/Proposal audience governance | Production locks and artifact semantic checks | PASS |
| JPP, stakeholders, competitive, methodology, role one-pager, business case | Production-owner output matrix | PASS |
| Brand System, Application Knowledge, Christie Persona | Generated-file checks and 19 brand tests | PASS |
| Cross-customer and role authorization | Automated authorization suites | PASS |
| Live PostgreSQL and migrations | No safe `DATABASE_URL` supplied | NOT TESTED |
| Real private R2 lifecycle | No R2 credentials supplied | NOT TESTED |
| Authenticated v6.9.46 browser lifecycle | Build not deployed | NOT TESTED |

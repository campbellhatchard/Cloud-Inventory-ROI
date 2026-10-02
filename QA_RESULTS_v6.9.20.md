# QA Results — v6.9.20

Local validation uses Node 22 and the locked production dependency set.

Final command counts are recorded in `RELEASE_GATE_RESULTS_v6.9.20.json` after execution. PostgreSQL-dependent integration is NOT TESTED locally because no safe non-production `DATABASE_URL` was supplied.

Focused role-regression coverage includes Prospect Link scenario binding, complete answer flush before submission, SE authorization, contract economic consistency, duplicate-save protection, search autofill, and PDF timeout recovery.

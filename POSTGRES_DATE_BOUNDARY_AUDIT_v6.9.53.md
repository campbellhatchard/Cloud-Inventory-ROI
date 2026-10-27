# PostgreSQL DATE Boundary Audit — v6.9.53

Audit performed before production-code changes.

## Driver behavior before correction

- Installed package-lock resolution: `pg` 8.22.0.
- PostgreSQL DATE OID: 1082.
- Default parser result for `2027-03-31`: JavaScript `Date`.
- JSON representation in the America/Chicago audit environment: `2027-03-31T05:00:00.000Z`.
- Expected semantic application type: exact string `2027-03-31`.

## DATE inventory

| Table | Column | Principal consumers | Semantic classification | Expected JS/API type | Global raw-string parser risk |
|---|---|---|---|---|---|
| `mutual_action_plans` | `target_close_date` | Maps route, All Plans, public JPP, Sales Manager, JPP PDF/PPTX | Date-only business fact | `YYYY-MM-DD` or null | Positive correction; eliminates the current defect. |
| `sales_manager_actions` | `due_date` | Sales Manager route/UI, Deal Coach | Date-only business fact | `YYYY-MM-DD` or null | Low; consumers already compare or format date-only text. |
| `stage_manager_overrides` | `review_date` | Stage-readiness route and audit presentation | Date-only business fact | `YYYY-MM-DD` | Low; no legitimate instant-time semantics. |
| `stage_manager_overrides` | `expires_at` | Stage readiness, Buyer Evidence, opportunity-close evaluation | Date-only business fact | `YYYY-MM-DD` | Low; the value is an inclusive calendar boundary. Existing regression remains mandatory. |
| `roi_value_events` | `evidence_date` | Value History, Executive source/story, Christie context, Prospect value authority | Date-only business fact | `YYYY-MM-DD` or null | Positive; prevents evidence dates from becoming timestamps. Existing freshness tests cover behavior. |
| `sales_team_memberships` | `effective_start` | Authorization and team-admin routes | Date-only business fact | `YYYY-MM-DD` | Low; SQL owns active-date evaluation. |
| `sales_team_memberships` | `effective_end` | Authorization and team-admin routes | Date-only business fact | `YYYY-MM-DD` or null | Low; SQL owns active-date evaluation. |

## JPP date-field audit

- `target_close_date` is a PostgreSQL DATE and must be normalized at the database adapter.
- Plan start date is not a standalone PostgreSQL DATE column in the current JPP schema.
- Milestone due dates are stored inside JSONB as governed `YYYY-MM-DD` text, not PostgreSQL DATE values.
- No JPP timestamp field should be reinterpreted as a date-only field.

## Architecture decision

All PostgreSQL DATE columns in the application are calendar facts. None has legitimate instant/timezone semantics. The selected correction is the preferred database-adapter strategy: register the `pg` text parser for OID 1082 once in `src/db.js` so DATE values enter the application as raw `YYYY-MM-DD` strings.

Downstream JPP output builders will use one strict shared server date-only normalizer/formatter. The browser helper remains strict. No route casts, offset hacks, noon timestamps, schema migration, or per-screen timestamp repair will be added.

## Regression obligation

Because this is a global DATE parser correction, v6.9.53 must execute all existing tests covering Sales Manager actions, stage overrides, evidence freshness/value history, authorization/team dates, JPP routes, outputs, and full production locks. A real non-production PostgreSQL integration must prove DATE → API exact-string behavior before package recommendation.

# Buyer Evidence Source-of-Truth Map

| Existing component | Business meaning | Authoritative source | BuyCycle use | Change |
|---|---|---|---|---|
| Customer + Scenario | Customer/opportunity identity and version | `customers`, current `scenarios` row | All stages | Reused; no duplicate record |
| Calculator | Baselines, benefits, investment, contract economics, ROI, payback, NPV | `scenarios.data` via shared ROI engine | Stages 2–7, ROI maturity | Reused; calculations unchanged |
| Discovery + Prospect Link | Current state, desired outcomes, compelling event and customer-supplied facts | `discovery_sessions` and `discovery_answers` | Stages 2–5 | Reused with prospect provenance |
| Stakeholder Map | Process owner, economic buyer, decision participants, technical owner, champion | `stakeholders` | Stages 2–6 | Reused; engagement required where applicable |
| Solution Fit & Handoff | Workflow fit, gaps, integration, risk and readiness | `handoffs.data` | Stages 4–7 | Reused; demonstrated is not customer accepted |
| Competitive | Named alternatives and comparison context | scenario competitive fields and research cache | Stage 5 | Reused; seller research is not buyer preference |
| Joint Project Plan | Customer/joint commitments, owners and dates | `mutual_action_plans` | Stages 3–7 | Reused; CI-only tasks do not prove buyer progress |
| Internal manager actions | Internal Cloud Inventory work | `sales_manager_actions` | Deal Health only | Explicitly excluded from buyer commitment evidence |
| Proposal | Scope, products, term, services, value narrative and commercial alignment | proposal draft in current scenario | Stages 5–7 | Reused; proposal delivery alone is seller activity |
| Buyer Evidence workspace | Critical verification not represented elsewhere | `scenario_stage_governance.evidence` | Stages 2–6 | New lightweight evidence capture |
| BuyCycle current stage | Official stage maintained by ROI app | `scenario_stage_governance.current_stage` | Governance | Advances only after evidence and certification |
| Rep assessment | Rep view of buyer position | `scenario_stage_governance.rep_assessed_stage` | Stage comparison | Never advances current stage automatically |
| Evidence-supported stage | Highest stage supported by requirements | Derived from stage config and evidence | Deal Health and governance | Read-only calculation |
| Outcome | Won/Lost and closure detail | governance outcome fields | Stage 7 | New; Lost allowed from Stages 2–6 |
| Stage history | Auditable advancement/regression/closure snapshot | `scenario_stage_history` | Governance and win/loss | Preserved immutably |

## Consistency rules

- ROI Calculator owns financial calculations.
- Stakeholder Map owns people and roles.
- Solution Fit owns technical/workflow fit.
- Joint Project Plan owns customer and joint commitments.
- Proposal owns commercial scope.
- Buyer Evidence stores only verification that has no reliable existing source.
- Seller activity never satisfies buyer evidence without a customer action or validation.
- CRM confirmation is administrative and never contributes to readiness.

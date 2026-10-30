# Buyer Evidence Requirement Audit — v6.9.55

## Authority and method

This audit traces all 28 active criteria in `buycycle_stage_config` for Stages 2–6 through `src/shared/buyer-evidence-requirements.js`, `src/shared/criterion-evidence.js`, the readiness service, authenticated route, browser drawer, Help, and Christie. Every criterion has exactly one proof type. No database migration or ROI methodology change was introduced.

Field abbreviations: `E` evidence narrative, `S` validating stakeholder, `O` confirmation source, `D` evidence date, `Q` strength/quality, `C` direct customer confirmation, `A` amount/range, `T` timing, `TD` target date, `TERM` commercial term. Normal freshness, minimum-strength, authorization, and current-opportunity rules apply to every saved record.

| Stage | Key | Label | Proof type | Evidence key / required fields | Governed source and navigation | Current evaluator | Prerequisite / exact blocking behavior | Hidden prerequisite found | Recommended UI | Permanent test |
|---:|---|---|---|---|---|---|---|---|---|---|
| 2 | `economic_impact` | Economic impact quantified | DERIVED | None | ROI Calculator → Calculator | Saved active value drivers and Annual Customer Benefit | Source value must exist and be economically meaningful | No | Source-status card; no evidence form | `v6955-buyer-evidence-requirements.test.js` |
| 2 | `current_baseline` | Current-state baseline | DERIVED | None | ROI Calculator → Calculator | Required current-state inputs for active drivers | Missing driver inputs listed by server | No | Source-status card; no evidence form | Same |
| 2 | `future_state` | Desired future state | CUSTOMER_EVIDENCE | `future_state`; E,S,O,D,Q,C | Discovery → Discovery | Structured evidence | Exact missing fields, strength, freshness, confirmation | No | Adaptive form | Same |
| 2 | `process_owner` | Process owner identified | HYBRID | `process_owner`; E,S,O,D,Q | Stakeholder Map → Stakeholders | Structured evidence plus mapped/engaged stakeholder | Evidence and “Process owner mapped and engaged” shown separately | Previously implicit | Adaptive form + prerequisite card | Same |
| 2 | `compelling_event` | Compelling event confirmed | CUSTOMER_EVIDENCE | `compelling_event`; E,S,O,D,Q,C,TD | Buyer Evidence → Buyer Evidence | Structured evidence | Target event date is explicit | No | Adaptive form with target date | Same |
| 2 | `economic_ack` | Customer acknowledges economic consequence | CUSTOMER_EVIDENCE | `economic_ack`; E,S,O,D,Q,C | Buyer Evidence → Buyer Evidence | Structured evidence | Strong customer-confirmed evidence required | No | Adaptive form | Same |
| 3 | `funding` | Funding status confirmed | CUSTOMER_EVIDENCE | `funding`; E,S,O,D,Q,C; A optional | Buyer Evidence → Buyer Evidence | Structured evidence | Exact field/quality/freshness blockers | No | Adaptive form | Same |
| 3 | `budget` | Budget amount or range | CUSTOMER_EVIDENCE | `budget`; E,S,O,D,Q,C,A | Buyer Evidence → Buyer Evidence | Structured evidence | Amount/range required | No | Adaptive form with amount | Same |
| 3 | `funding_timing` | Funding timing confirmed | CUSTOMER_EVIDENCE | `funding_timing`; E,S,O,D,Q,C,T | Buyer Evidence → Buyer Evidence | Structured evidence | Timing required | No | Adaptive form with timing | Same |
| 3 | `financial_authority` | Financial authority engaged | DERIVED | None | Stakeholder Map → Stakeholders | Engaged Economic Buyer / funding authority | Missing mapped authority listed by server | No | Source-status card; no evidence form | Same |
| 3 | `procurement_path` | Procurement and funding path | CUSTOMER_EVIDENCE | `procurement_path`; E,S,O,D,Q,C | Buyer Evidence → Buyer Evidence | Structured evidence | Exact field/quality/freshness blockers | No | Adaptive form | Same |
| 3 | `roi_funding` | ROI supports funding | DERIVED | None | ROI Calculator → Calculator | Governed investment, benefit, and contract economics | Missing value/investment/economic support shown | No | Source-status card; no evidence form | Same |
| 4 | `criteria` | Decision criteria and priorities known | CUSTOMER_EVIDENCE | `criteria`; E,S,O,D,Q,C | Buyer Evidence → Buyer Evidence | Structured evidence | Exact field/quality/freshness blockers | No | Adaptive form | Same |
| 4 | `decision_process` | Decision process and evaluation steps | CUSTOMER_EVIDENCE | `decision_process`; E,S,O,D,Q,C | Buyer Evidence → Buyer Evidence | Structured evidence | Exact field/quality/freshness blockers | No | Adaptive form | Same |
| 4 | `decision_stakeholders` | Decision stakeholders identified | HYBRID | `decision_stakeholders`; E,S,O,D,Q | Stakeholder Map → Stakeholders | Evidence plus map present and linked engaged stakeholder | Both prerequisites individually visible | Previously implicit | Mapped stakeholder selector + prerequisite cards | Same |
| 4 | `decision_timeline` | Decision timeline confirmed | CUSTOMER_EVIDENCE | `decision_timeline`; E,S,O,D,Q,C,TD; T optional | Buyer Evidence → Buyer Evidence | Structured evidence | Target decision date required | No | Adaptive date/timing form | Same |
| 4 | `solution_fit` | Solution Fit evaluated | DERIVED | None | Solution Fit → Solution Fit | Saved readiness, selected workflows, fit/gaps | Current readiness/source state shown exactly | No | Source-status card; no evidence form | Same |
| 5 | `workflows` | Critical workflows customer validated | DERIVED | None | Solution Fit → Solution Fit | All selected workflows and material gaps | Each incomplete workflow/source fact is server-owned | No | Source-status card; no evidence form | Same |
| 5 | `criteria_addressed` | Decision criteria addressed | CUSTOMER_EVIDENCE | `criteria_addressed`; E,S,O,D,Q,C | Buyer Evidence → Buyer Evidence | Structured evidence | Exact field/quality/freshness blockers | No | Adaptive form | Same |
| 5 | `alternatives` | Competitive alternatives known | CUSTOMER_EVIDENCE | `alternatives`; E,S,O,D,Q | Competitive Intelligence → Competitive | Structured evidence | Customer validation not mandated; source still explicit | No | Adaptive form | Same |
| 5 | `proposal_alignment` | Proposal aligns to value and criteria | CUSTOMER_EVIDENCE | `proposal_alignment`; E,S,O,D,Q,C | Proposal → Proposal | Structured evidence only | Proposal artifact neither required nor sufficient | Hidden artifact prerequisite removed in v6.9.54 | Adaptive form + contextual Proposal link | v6954 + v6955 suites |
| 5 | `preference` | Buyer preference signal | CUSTOMER_EVIDENCE | `preference`; E,S,O,D,Q,C | Buyer Evidence → Buyer Evidence | Structured evidence | Named buyer and strong current confirmation required | No | Adaptive form | Same |
| 6 | `selected` | Customer selected Cloud Inventory | CUSTOMER_EVIDENCE | `selected`; E,S,O,D,Q,C | Buyer Evidence → Buyer Evidence | Structured evidence | Named customer stakeholder and current strong evidence | No | Adaptive form | Same |
| 6 | `commercial` | Commercial scope agreed | CUSTOMER_EVIDENCE | `commercial`; E,S,O,D,Q,C,TERM; A optional | Proposal → Proposal | Structured evidence only | Commercial term explicit; Proposal artifact neither required nor sufficient | Hidden Proposal prerequisite removed in v6.9.55 | Adaptive term/amount form + contextual Proposal link | v6955 unit + PostgreSQL |
| 6 | `contract` | Contract, procurement, and security path | CUSTOMER_EVIDENCE | `contract`; E,S,O,D,Q,C; T optional | Joint Project Plan → JPP | Structured evidence | Exact field/quality/freshness blockers | No | Adaptive form with optional timing | Same |
| 6 | `funding_reconfirmed` | Funding reconfirmed | CUSTOMER_EVIDENCE | `funding_reconfirmed`; E,S,O,D,Q,C | Buyer Evidence → Buyer Evidence | Structured evidence | Current Stage 6 reconfirmation remains explicit | No | Adaptive form | Same |
| 6 | `signature_date` | Target signature date | CUSTOMER_EVIDENCE | `signature_date`; E,S,O,D,Q,C,TD | Buyer Evidence → Buyer Evidence | Structured evidence | Target signature date required | No | Adaptive date form | Same |
| 6 | `implementation` | Implementation assumptions and handoff readiness | HYBRID | `implementation`; E,S,O,D,Q,C | Solution Fit → Solution Fit | Evidence plus saved Solution Fit Ready status | Evidence can be saved while prerequisite remains blocked; both states visible | Previously compressed into generic incomplete state | Adaptive form + exact readiness card | Same |

## Count reconciliation

| Stage | Active requirements | Derived | Customer Evidence | Hybrid |
|---:|---:|---:|---:|---:|
| 2 | 6 | 2 | 3 | 1 |
| 3 | 6 | 2 | 4 | 0 |
| 4 | 5 | 1 | 3 | 1 |
| 5 | 5 | 1 | 4 | 0 |
| 6 | 6 | 0 | 5 | 1 |
| **Total** | **28** | **6** | **19** | **3** |

## Audit conclusion

All 28 active requirements are represented exactly once. The active evaluator, API, browser drawer, Help, Christie context, and summary projection now share the same server-owned requirement metadata. No second browser completion model was introduced.

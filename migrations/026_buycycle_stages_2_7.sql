/* BuyCycle 2–7 evidence workspace. Existing scenarios remain intact and require review. */
ALTER TABLE scenario_stage_governance ADD COLUMN IF NOT EXISTS current_stage INTEGER;
ALTER TABLE scenario_stage_governance ADD COLUMN IF NOT EXISTS opportunity_profile JSONB NOT NULL DEFAULT '{}';
ALTER TABLE scenario_stage_governance ADD COLUMN IF NOT EXISTS outcome VARCHAR(10);
ALTER TABLE scenario_stage_governance ADD COLUMN IF NOT EXISTS stage_at_loss INTEGER;
ALTER TABLE scenario_stage_governance ADD COLUMN IF NOT EXISTS outcome_details JSONB NOT NULL DEFAULT '{}';
ALTER TABLE scenario_stage_governance ADD COLUMN IF NOT EXISTS legacy_setup_needed BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE scenario_stage_governance ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
UPDATE scenario_stage_governance SET current_stage=GREATEST(2,LEAST(7,COALESCE(current_stage,rep_assessed_stage,2)));
ALTER TABLE scenario_stage_governance ALTER COLUMN current_stage SET DEFAULT 2;

DELETE FROM buycycle_stage_config;
INSERT INTO buycycle_stage_config(stage_order,stage_name,minimum_roi_maturity,minimum_commitment,criteria) VALUES
(2,'Define Economic Consequences',1,'moderate','[
 {"id":"economic_impact","name":"Economic impact quantified","description":"Current-state impact is quantified in the ROI Calculator.","required":true,"source":"roi","minQuality":"moderate","customerValidation":false,"freshnessDays":90},
 {"id":"current_baseline","name":"Current-state baseline","description":"Material baseline inputs are documented.","required":true,"source":"roi","minQuality":"moderate","customerValidation":false,"freshnessDays":90},
 {"id":"future_state","name":"Desired future state","description":"Customer outcome and success measures are documented.","required":true,"source":"discovery","minQuality":"moderate","customerValidation":true,"freshnessDays":90},
 {"id":"process_owner","name":"Process owner identified","description":"A customer process owner is mapped and engaged.","required":true,"source":"stakeholders","minQuality":"moderate","customerValidation":false,"freshnessDays":120},
 {"id":"compelling_event","name":"Compelling event confirmed","description":"Event, date, stakeholder, and consequence are recorded.","required":true,"source":"evidence","minQuality":"moderate","customerValidation":true,"freshnessDays":90},
 {"id":"economic_ack","name":"Customer acknowledges economic consequence","description":"Customer confirms the problem is important enough to solve.","required":true,"source":"evidence","minQuality":"strong","customerValidation":true,"freshnessDays":60}
]'),
(3,'Commit Funding',2,'strong','[
 {"id":"funding","name":"Funding status confirmed","description":"Funding is identified, approved, or committed with buyer evidence.","required":true,"source":"evidence","minQuality":"strong","customerValidation":true,"freshnessDays":60},
 {"id":"budget","name":"Budget amount or range","description":"Amount or supported range, currency, and source are recorded.","required":true,"source":"evidence","minQuality":"strong","customerValidation":true,"freshnessDays":60},
 {"id":"funding_timing","name":"Funding timing confirmed","description":"Release period or approval timing is confirmed.","required":true,"source":"evidence","minQuality":"strong","customerValidation":true,"freshnessDays":60},
 {"id":"financial_authority","name":"Financial authority engaged","description":"Economic buyer or funding authority is identified and engaged.","required":true,"source":"stakeholders","minQuality":"strong","customerValidation":false,"freshnessDays":90},
 {"id":"procurement_path","name":"Procurement and funding path","description":"Approval, PO, procurement, or financing process is documented.","required":true,"source":"evidence","minQuality":"strong","customerValidation":true,"freshnessDays":60},
 {"id":"roi_funding","name":"ROI supports funding","description":"The value case supports the proposed investment.","required":true,"source":"roi","minQuality":"moderate","customerValidation":false,"freshnessDays":60}
]'),
(4,'Define Decision Criteria',2,'strong','[
 {"id":"criteria","name":"Decision criteria and priorities known","description":"Criteria, priority, must-have status, weight, fit, and evidence are recorded.","required":true,"source":"evidence","minQuality":"strong","customerValidation":true,"freshnessDays":60},
 {"id":"decision_process","name":"Decision process and evaluation steps","description":"Customer evaluation and approval steps are documented.","required":true,"source":"evidence","minQuality":"strong","customerValidation":true,"freshnessDays":60},
 {"id":"decision_stakeholders","name":"Decision stakeholders identified","description":"Decision participants and roles are mapped.","required":true,"source":"stakeholders","minQuality":"strong","customerValidation":false,"freshnessDays":90},
 {"id":"decision_timeline","name":"Decision timeline confirmed","description":"Target decision date and evaluation timing are confirmed.","required":true,"source":"evidence","minQuality":"strong","customerValidation":true,"freshnessDays":45},
 {"id":"solution_fit","name":"Solution Fit evaluated","description":"Material fit, gaps, dependencies, and risks are assessed.","required":true,"source":"solution_fit","minQuality":"moderate","customerValidation":false,"freshnessDays":60}
]'),
(5,'Evaluate Alternatives',3,'strong','[
 {"id":"workflows","name":"Critical workflows customer validated","description":"Workflow, participants, feedback, and outcome are recorded.","required":true,"source":"solution_fit","minQuality":"strong","customerValidation":true,"freshnessDays":45},
 {"id":"criteria_addressed","name":"Decision criteria addressed","description":"Cloud Inventory response to priority criteria is documented.","required":true,"source":"evidence","minQuality":"strong","customerValidation":true,"freshnessDays":45},
 {"id":"alternatives","name":"Competitive alternatives known","description":"Competitors, status quo, internal build, and objections are known.","required":true,"source":"competitive","minQuality":"moderate","customerValidation":false,"freshnessDays":45},
 {"id":"proposal_alignment","name":"Proposal aligns to value and criteria","description":"Proposal connects scope and investment to agreed value and criteria.","required":true,"source":"proposal","minQuality":"strong","customerValidation":true,"freshnessDays":45},
 {"id":"preference","name":"Buyer preference signal","description":"Named buyer provides credible evidence of preference.","required":true,"source":"evidence","minQuality":"strong","customerValidation":true,"freshnessDays":30}
]'),
(6,'Select Vendor Solution',3,'very_strong','[
 {"id":"selected","name":"Customer selected Cloud Inventory","description":"Named stakeholder, date, and strong selection evidence are recorded.","required":true,"source":"evidence","minQuality":"strong","customerValidation":true,"freshnessDays":30},
 {"id":"commercial","name":"Commercial scope agreed","description":"Products, services, term, and commercial scope are agreed.","required":true,"source":"proposal","minQuality":"strong","customerValidation":true,"freshnessDays":30},
 {"id":"contract","name":"Contract, procurement, and security path","description":"Remaining owners, status, and dates are confirmed.","required":true,"source":"joint_plan","minQuality":"strong","customerValidation":true,"freshnessDays":30},
 {"id":"funding_reconfirmed","name":"Funding reconfirmed","description":"Stage 3 funding evidence remains current.","required":true,"source":"evidence","minQuality":"strong","customerValidation":true,"freshnessDays":30},
 {"id":"signature_date","name":"Target signature date","description":"Customer-confirmed signature target is recorded.","required":true,"source":"evidence","minQuality":"strong","customerValidation":true,"freshnessDays":30},
 {"id":"implementation","name":"Implementation assumptions and handoff readiness","description":"Solution Fit, plan, outcomes, owners, and timing are ready.","required":true,"source":"solution_fit","minQuality":"strong","customerValidation":true,"freshnessDays":45}
]'),
(7,'Closed',3,'very_strong','[]');

CREATE INDEX IF NOT EXISTS idx_stage_governance_current ON scenario_stage_governance(current_stage,outcome);

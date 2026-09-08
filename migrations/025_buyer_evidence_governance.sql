/* Buyer Evidence & Stage Readiness — configurable, auditable, additive. */
CREATE TABLE IF NOT EXISTS buycycle_stage_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), stage_order INTEGER NOT NULL UNIQUE,
  stage_name VARCHAR(120) NOT NULL, criteria JSONB NOT NULL DEFAULT '[]',
  minimum_roi_maturity INTEGER NOT NULL DEFAULT 0, minimum_commitment VARCHAR(20) NOT NULL DEFAULT 'weak',
  is_active BOOLEAN NOT NULL DEFAULT TRUE, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scenario_stage_governance (
  scenario_id UUID PRIMARY KEY REFERENCES scenarios(id) ON DELETE CASCADE,
  rep_assessed_stage INTEGER NOT NULL DEFAULT 1, evidence JSONB NOT NULL DEFAULT '{}',
  meeting_notes TEXT, certifications JSONB NOT NULL DEFAULT '{}', updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scenario_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  previous_stage INTEGER, new_stage INTEGER NOT NULL, evidence_supported_stage INTEGER NOT NULL,
  readiness INTEGER NOT NULL, roi_maturity INTEGER NOT NULL, evidence_snapshot JSONB NOT NULL,
  stakeholder_coverage JSONB NOT NULL, commitment_strength VARCHAR(20) NOT NULL,
  christie_assessment TEXT, changed_by UUID NOT NULL REFERENCES users(id), change_type VARCHAR(30) NOT NULL,
  reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stage_manager_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES users(id), missing_criterion TEXT NOT NULL, reason TEXT NOT NULL,
  supporting_explanation TEXT NOT NULL, review_date DATE NOT NULL, expires_at DATE NOT NULL,
  risk_acknowledged BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stage_history_scenario ON scenario_stage_history(scenario_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stage_override_scenario ON stage_manager_overrides(scenario_id, expires_at);

INSERT INTO buycycle_stage_config(stage_order,stage_name,minimum_roi_maturity,minimum_commitment,criteria) VALUES
(1,'Problem Recognition',0,'weak','[
 {"id":"problem","name":"Business problem acknowledged","description":"Customer confirms the problem and consequence.","required":true,"source":"discovery","minQuality":"moderate","customerValidation":true,"freshnessDays":120},
 {"id":"owner","name":"Operational owner identified","description":"Named customer owner for the current-state problem.","required":true,"source":"stakeholders","minQuality":"moderate","customerValidation":false,"freshnessDays":120},
 {"id":"investigate","name":"Further investigation committed","description":"Customer agrees to provide evidence or continue evaluation.","required":true,"source":"joint_plan","minQuality":"moderate","customerValidation":true,"freshnessDays":60}
]'),
(2,'Solution Exploration',1,'moderate','[
 {"id":"baseline","name":"Baseline metrics captured","description":"Current-state operating baseline exists.","required":true,"source":"roi","minQuality":"moderate","customerValidation":false,"freshnessDays":90},
 {"id":"future","name":"Desired future state documented","description":"Customer outcome and success measures are recorded.","required":true,"source":"discovery","minQuality":"moderate","customerValidation":true,"freshnessDays":90},
 {"id":"impact","name":"Business impact hypothesis","description":"Economic impact is quantified in the ROI record.","required":true,"source":"roi","minQuality":"weak","customerValidation":false,"freshnessDays":60},
 {"id":"stakeholders","name":"Relevant stakeholders mapped","description":"Business, technical, and decision participants are identified.","required":true,"source":"stakeholders","minQuality":"moderate","customerValidation":false,"freshnessDays":90}
]'),
(3,'Solution Validation',2,'strong','[
 {"id":"fit","name":"Solution Fit completed","description":"Priority workflows, technical approach, and material gaps are assessed.","required":true,"source":"solution_fit","minQuality":"moderate","customerValidation":false,"freshnessDays":60},
 {"id":"roi_customer","name":"Key ROI assumptions customer validated","description":"Customer validates material baselines and value assumptions.","required":true,"source":"roi","minQuality":"strong","customerValidation":true,"freshnessDays":60},
 {"id":"technical","name":"Technical stakeholder engaged","description":"Technical owner participates in validation.","required":true,"source":"stakeholders","minQuality":"strong","customerValidation":false,"freshnessDays":60},
 {"id":"commitment","name":"Next customer commitment secured","description":"A specific customer or joint commitment has an owner and date.","required":true,"source":"joint_plan","minQuality":"strong","customerValidation":true,"freshnessDays":45}
]'),
(4,'Business Case / Decision',3,'strong','[
 {"id":"business_case","name":"Business case customer validated","description":"Customer validates the economic case and outcomes.","required":true,"source":"roi","minQuality":"strong","customerValidation":true,"freshnessDays":60},
 {"id":"economic_buyer","name":"Economic buyer engaged","description":"Economic buyer participates in the investment decision.","required":true,"source":"stakeholders","minQuality":"strong","customerValidation":false,"freshnessDays":90},
 {"id":"decision","name":"Decision process and criteria documented","description":"Customer decision participants, criteria, and timing are clear.","required":true,"source":"discovery","minQuality":"strong","customerValidation":true,"freshnessDays":45},
 {"id":"map","name":"Joint Project Plan agreed","description":"Mutual milestones, owners, and dates are active.","required":true,"source":"joint_plan","minQuality":"strong","customerValidation":true,"freshnessDays":45}
]'),
(5,'Commercial Commitment',3,'very_strong','[
 {"id":"proposal","name":"Commercial proposal reviewed","description":"Customer has reviewed scope and commercial terms.","required":true,"source":"proposal","minQuality":"strong","customerValidation":true,"freshnessDays":30},
 {"id":"procurement","name":"Procurement and legal path confirmed","description":"Customer confirms process, owners, and dates.","required":true,"source":"joint_plan","minQuality":"strong","customerValidation":true,"freshnessDays":30},
 {"id":"implementation","name":"Implementation timing agreed","description":"Customer resources, timing, and responsibilities are confirmed.","required":true,"source":"solution_fit","minQuality":"strong","customerValidation":true,"freshnessDays":45},
 {"id":"purchase","name":"Buyer commits to purchase path","description":"Buyer confirms remaining steps and target signature timing.","required":true,"source":"joint_plan","minQuality":"strong","customerValidation":true,"freshnessDays":30}
]')
ON CONFLICT(stage_order) DO NOTHING;

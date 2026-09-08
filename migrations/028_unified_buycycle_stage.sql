-- v6.4.8 R7: one authoritative governed BuyCycle stage.
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS legacy_seller_stage VARCHAR(50);

-- Preserve seller-stage history before compatibility mirrors are normalized.
UPDATE scenarios
SET legacy_seller_stage=COALESCE(legacy_seller_stage,deal_stage,data->>'dealStage'),
    data=jsonb_set(COALESCE(data,'{}'::jsonb),'{legacySellerStage}',to_jsonb(COALESCE(deal_stage,data->>'dealStage')),TRUE)
WHERE COALESCE(deal_stage,data->>'dealStage') IN ('Discovery','Demo','Proposal','Negotiation','Closed Won','Closed Lost');

-- Existing valid governed labels may be parsed. Seller stages are deliberately
-- not translated; they initialize at Stage 2 and require readiness setup.
INSERT INTO scenario_stage_governance
  (scenario_id,current_stage,rep_assessed_stage,legacy_setup_needed)
SELECT s.id,
       COALESCE((regexp_match(COALESCE(s.deal_stage,s.data->>'dealStage',''),'^Stage ([2-7])(?: |—|-)'))[1]::int,2),
       COALESCE((regexp_match(COALESCE(s.deal_stage,s.data->>'dealStage',''),'^Stage ([2-7])(?: |—|-)'))[1]::int,2),
       CASE WHEN COALESCE(s.deal_stage,s.data->>'dealStage') IN ('Discovery','Demo','Proposal','Negotiation','Closed Won','Closed Lost') THEN TRUE ELSE FALSE END
FROM scenarios s
LEFT JOIN scenario_stage_governance g ON g.scenario_id=s.id
WHERE g.scenario_id IS NULL;

-- Compatibility fields mirror governance and are no longer independent inputs.
UPDATE scenarios s
SET deal_stage='Stage '||g.current_stage||' — '||CASE g.current_stage
      WHEN 2 THEN 'Define Economic Consequences' WHEN 3 THEN 'Commit Funding'
      WHEN 4 THEN 'Define Decision Criteria' WHEN 5 THEN 'Evaluate Alternatives'
      WHEN 6 THEN 'Select Vendor Solution' WHEN 7 THEN 'Closed' END,
    data=jsonb_set(COALESCE(s.data,'{}'::jsonb),'{dealStage}',to_jsonb('Stage '||g.current_stage||' — '||CASE g.current_stage
      WHEN 2 THEN 'Define Economic Consequences' WHEN 3 THEN 'Commit Funding'
      WHEN 4 THEN 'Define Decision Criteria' WHEN 5 THEN 'Evaluate Alternatives'
      WHEN 6 THEN 'Select Vendor Solution' WHEN 7 THEN 'Closed' END),TRUE)
FROM scenario_stage_governance g
WHERE g.scenario_id=s.id AND g.current_stage BETWEEN 2 AND 7;

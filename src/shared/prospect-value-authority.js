'use strict';
async function loadApplicableValueEvent({query,eventId,baseId,canonicalInput}){
  const result=await query(`SELECT e.*,u.username actor_username,u.is_active internal_actor_valid,
    ds.base_id submission_base_id,dss.customer_id session_customer_id
    FROM roi_value_events e
    LEFT JOIN users u ON u.id=e.actor_user_id
    LEFT JOIN discovery_submissions ds ON ds.id=e.discovery_submission_id
    LEFT JOIN discovery_sessions dss ON dss.id=ds.discovery_session_id
    WHERE e.id=$1 AND e.base_id=$2 AND e.canonical_input=$3`,[eventId,baseId,canonicalInput]);
  const event=result.rows&&result.rows[0];
  if(!event)return{ok:false,status:404,code:'VALUE_EVENT_NOT_FOUND',error:'Value event not found for this customer opportunity.'};
  if(event.event_type==='prospect_submitted'&&(!event.discovery_submission_id||String(event.submission_base_id||'')!==String(baseId))){
    return{ok:false,status:409,code:'PROSPECT_EVIDENCE_MISMATCH',error:'The submitted Prospect evidence is not linked to this customer opportunity.'};
  }
  return{ok:true,event};
}
module.exports={loadApplicableValueEvent};

/* Authoritative, live evidence freshness. Evidence Date is the customer
   confirmation date; updatedAt is intentionally not accepted by this API. */
const MS_PER_DAY=86400000;
const EVIDENCE_AGING_THRESHOLD=0.80;
const ROI_EVIDENCE_FRESHNESS_DAYS=Object.freeze({
  roi_value_case_validation:90,
  roi_executive_approval:90
});

function parseDateOnly(value){
  const text=String(value||'');
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if(!match)return null;
  const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
  const epoch=Date.UTC(year,month-1,day),date=new Date(epoch);
  if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return null;
  return {text,epoch};
}
function todayDateOnly(now=new Date()){
  if(typeof now==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(now))return parseDateOnly(now);
  const date=now instanceof Date?now:new Date(now);
  if(Number.isNaN(date.getTime()))return null;
  const text=`${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;
  return parseDateOnly(text);
}
function validateEvidenceDate(evidenceDate,{now=new Date()}={}){
  const parsed=parseDateOnly(evidenceDate),today=todayDateOnly(now);
  if(!parsed)return {valid:false,error:'Evidence Date must be a valid date in YYYY-MM-DD format.'};
  if(!today)return {valid:false,error:'The current date could not be determined.'};
  if(parsed.epoch>today.epoch)return {valid:false,error:'Evidence Date cannot be in the future. Use Timing or the Joint Project Plan for future customer commitments.'};
  return {valid:true,evidenceDate:parsed.text};
}
function evaluateEvidenceFreshness({evidenceDate,freshnessDays,now=new Date()}={}){
  const windowDays=Number(freshnessDays)>0?Number(freshnessDays):90;
  const agingAfterDays=Math.floor(windowDays*EVIDENCE_AGING_THRESHOLD);
  const parsed=parseDateOnly(evidenceDate),today=todayDateOnly(now);
  if(!parsed)return {status:'Needs Review',ageDays:null,freshnessDays:windowDays,agingAfterDays,evidenceDate:evidenceDate||null,reason:'The original customer evidence date is not recorded.'};
  if(!today||parsed.epoch>today.epoch)return {status:'Needs Review',ageDays:null,freshnessDays:windowDays,agingAfterDays,evidenceDate:parsed.text,reason:'The Evidence Date is invalid or in the future and must be reviewed.'};
  const ageDays=Math.floor((today.epoch-parsed.epoch)/MS_PER_DAY);
  const status=ageDays>windowDays?'Stale':ageDays>agingAfterDays?'Aging':'Current';
  const reason=status==='Stale'
    ?`Evidence is ${ageDays} days old and exceeds the allowed freshness window of ${windowDays} days.`
    :status==='Aging'
      ?`Evidence is ${ageDays} days old and is approaching its ${windowDays}-day revalidation window.`
      :`Evidence is ${ageDays} days old and is within the allowed freshness window of ${windowDays} days.`;
  return {status,ageDays,freshnessDays:windowDays,agingAfterDays,evidenceDate:parsed.text,reason};
}

module.exports={MS_PER_DAY,EVIDENCE_AGING_THRESHOLD,ROI_EVIDENCE_FRESHNESS_DAYS,parseDateOnly,todayDateOnly,validateEvidenceDate,evaluateEvidenceFreshness};

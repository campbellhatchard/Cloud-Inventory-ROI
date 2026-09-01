/* Authoritative BuyCycle stage boundaries and parsing for the governed ROI workflow. */
const BUYCYCLE_MIN_STAGE=2;
const BUYCYCLE_MAX_ACTIVE_STAGE=6;
const BUYCYCLE_CLOSED_STAGE=7;
const BUYCYCLE_MAX_STAGE=7;

const BUYCYCLE_STAGE_NAMES=Object.freeze({
  2:'Define Economic Consequences',
  3:'Commit Funding',
  4:'Define Decision Criteria',
  5:'Evaluate Alternatives',
  6:'Select Vendor Solution',
  7:'Closed'
});

function rawStage(value){
  if(typeof value==='number')return Number.isInteger(value)?value:null;
  const text=String(value??'').trim();
  if(!text)return null;
  const match=text.match(/^\d+$/)||text.match(/\bstage\s+(\d+)\b/i);
  return match?Number(match[1]??match[0]):null;
}
function isValidBuyCycleStage(value){const stage=rawStage(value);return stage>=BUYCYCLE_MIN_STAGE&&stage<=BUYCYCLE_MAX_STAGE;}
function parseBuyCycleStage(value,fallback=BUYCYCLE_MIN_STAGE){
  const stage=rawStage(value);
  if(stage>=BUYCYCLE_MIN_STAGE&&stage<=BUYCYCLE_MAX_STAGE)return stage;
  if(fallback===null)return null;
  const fallbackStage=rawStage(fallback);
  return fallbackStage>=BUYCYCLE_MIN_STAGE&&fallbackStage<=BUYCYCLE_MAX_STAGE?fallbackStage:BUYCYCLE_MIN_STAGE;
}
function isActiveBuyCycleStage(value){const stage=parseBuyCycleStage(value,null);return stage!==null&&stage<=BUYCYCLE_MAX_ACTIVE_STAGE;}
function isClosedBuyCycleStage(value){return parseBuyCycleStage(value,null)===BUYCYCLE_CLOSED_STAGE;}
function normalizeActiveBuyCycleStage(value,fallback=BUYCYCLE_MIN_STAGE){
  const stage=parseBuyCycleStage(value,null);
  if(isActiveBuyCycleStage(stage))return stage;
  const safeFallback=parseBuyCycleStage(fallback,BUYCYCLE_MIN_STAGE);
  return isActiveBuyCycleStage(safeFallback)?safeFallback:BUYCYCLE_MIN_STAGE;
}
function getBuyCycleStageLabel(value,configuredName){
  const stage=parseBuyCycleStage(value,null);
  if(stage===null)return null;
  return `Stage ${stage} — ${configuredName||BUYCYCLE_STAGE_NAMES[stage]}`;
}
function getNextActiveBuyCycleStage(value){
  const stage=parseBuyCycleStage(value,null);
  return stage!==null&&stage>=BUYCYCLE_MIN_STAGE&&stage<BUYCYCLE_MAX_ACTIVE_STAGE?stage+1:null;
}
function resolvePersistedBuyCycleStage({currentStage,dealStage,dataDealStage}={}){
  // R7: rep assessment is deliberately advisory and can never resolve the
  // official stage. Compatibility mirrors are read only when governance is
  // absent and only parse actual "Stage N"/numeric values (seller labels do
  // not parse and therefore safely initialize at Stage 2).
  return parseBuyCycleStage(currentStage,
    parseBuyCycleStage(dealStage,
      parseBuyCycleStage(dataDealStage,BUYCYCLE_MIN_STAGE)));
}

module.exports={BUYCYCLE_MIN_STAGE,BUYCYCLE_MAX_ACTIVE_STAGE,BUYCYCLE_CLOSED_STAGE,BUYCYCLE_MAX_STAGE,BUYCYCLE_STAGE_NAMES,parseBuyCycleStage,isValidBuyCycleStage,isActiveBuyCycleStage,isClosedBuyCycleStage,normalizeActiveBuyCycleStage,getBuyCycleStageLabel,getNextActiveBuyCycleStage,resolvePersistedBuyCycleStage};

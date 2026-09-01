const OPPORTUNITY_CURRENCIES = new Set(['USD','GBP','EUR','AUD','NZD']);

function parseOpportunityValue(value) {
  if (value === null || value === undefined || value === '') return null;
  if ((typeof value !== 'number' && typeof value !== 'string') ||
      (typeof value === 'string' && !/^\d+(?:\.\d+)?$/.test(value.trim()))) {
    throw Object.assign(new Error('Estimated Opportunity Value must be a valid non-negative number or blank.'), { status:400 });
  }
  const amount=Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > Number.MAX_SAFE_INTEGER) {
    throw Object.assign(new Error('Estimated Opportunity Value must be a finite non-negative amount.'), { status:400 });
  }
  return amount;
}

function validateOpportunityCurrency(value) {
  const currency=String(value||'USD').toUpperCase();
  if(!OPPORTUNITY_CURRENCIES.has(currency))throw Object.assign(new Error('Unsupported Opportunity Value currency.'),{status:400});
  return currency;
}

function buildOpportunityProfile({existing={},value,currency,userId,now=new Date().toISOString()}) {
  const amount=parseOpportunityValue(value),code=validateOpportunityCurrency(currency);
  const changed=amount!==existing.estimatedOpportunityValue||code!==existing.currency;
  return {...existing,estimatedOpportunityValue:amount,currency:code,
    opportunityValueUpdatedAt:changed?now:(existing.opportunityValueUpdatedAt||null),
    opportunityValueUpdatedBy:changed?userId:(existing.opportunityValueUpdatedBy||null)};
}

function snapshotOpportunityValue(profile={},fallbackCurrency='USD') {
  const amount=profile.estimatedOpportunityValue;
  if(amount===null||amount===undefined||!Number.isFinite(Number(amount))||Number(amount)<0)return null;
  return {amount:Number(amount),currency:validateOpportunityCurrency(profile.currency||fallbackCurrency)};
}

module.exports={OPPORTUNITY_CURRENCIES,parseOpportunityValue,validateOpportunityCurrency,buildOpportunityProfile,snapshotOpportunityValue};

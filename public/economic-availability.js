(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CIEconomicAvailability=api;})(typeof self!=='undefined'?self:this,function(){'use strict';
function hasEconomicValue(value){return value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));}
function percent(value,{missing='Not yet established',suffix='%'}={}){return hasEconomicValue(value)?Math.round(Number(value))+suffix:missing;}
function investmentEstablished(economics={}){if(typeof economics.investmentEstablished==='boolean')return economics.investmentEstablished;return hasEconomicValue(economics.totalContractInvestment)&&Number(economics.totalContractInvestment)>0;}
function paybackState(economics={}){const value=economics.payback??economics.paybackMonths;if(hasEconomicValue(value))return'established';return investmentEstablished(economics)?'not_achieved':'not_established';}
function paybackLabel(economics={}){const value=economics.payback??economics.paybackMonths,state=paybackState(economics);if(state==='established')return Number(value).toFixed(1)+' months';return state==='not_achieved'?'Payback not achieved within contract term':'Payback not yet established';}
return Object.freeze({hasEconomicValue,percent,investmentEstablished,paybackState,paybackLabel});});

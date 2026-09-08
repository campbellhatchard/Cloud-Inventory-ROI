(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else Object.assign(root,api);})(typeof self!=='undefined'?self:this,function(){'use strict';
/* Authoritative questionnaire-to-economic-input registry for ROI Model v2.8.
   Question wording lives with the visible questionnaire; this registry owns
   classification, canonical inputs, formulas, companions and overlap rules. */
const INPUTS=Object.freeze({
 userCount:['workforce_productivity','people','workforce_productivity'],laborCost:['workforce_productivity','currency_per_person_year','workforce_productivity'],labor:['workforce_productivity','currency_per_person_year','workforce_productivity'],laborWastePct:['workforce_productivity','percent','workforce_productivity'],
 currentAccuracy:['inventory_writeoff','percent','accuracy_calibration'],annualWriteOff:['inventory_writeoff','currency_per_year','central_inventory_loss'],inventoryValue:['inventory_carrying','currency','inventory_carrying'],
 invTurnsCurrent:['inventory_carrying','turns_per_year','inventory_carrying'],revenue:['service_revenue_margin','currency_per_year','service_revenue'],otifBaseline:['service_revenue_margin','percent','service_revenue'],otifTarget:['service_revenue_margin','percent','service_revenue'],
 contributionMarginPct:['service_revenue_margin','percent','service_revenue'],lostSalesYr:['service_revenue_margin','currency_per_year','service_revenue'],
 servicePenaltyCostYr:['service_penalties','currency_per_year','service_failure'],expediteSpendYr:['expedite_premium','currency_per_year','service_failure'],
 downtimeEventsYr:['downtime','events_per_year','service_failure'],downtimeHrsPerEvent:['downtime','hours','service_failure'],downtimeCostPerHr:['downtime','currency_per_hour','service_failure'],
 countDaysYr:['count_labor','days_per_year',null],countPeople:['count_labor','people',null],ordersPerYr:['order_error','orders_per_year','fulfillment_error'],orderErrorPct:['order_error','percent','fulfillment_error'],costPerError:['order_error','currency_per_error','fulfillment_error'],
 costPerOrder:['workforce_productivity','currency_per_order','workforce_productivity'],pickRateGainPct:['workforce_productivity','percent','workforce_productivity'],
 repeatVisitsYr:['first_time_fix','visits_per_year','field_service'],costPerTruckRoll:['first_time_fix','currency_per_visit','field_service'],
 fieldInvValue:['field_leakage','currency','field_inventory_loss'],fieldLeakageRate:['field_leakage','percent','field_inventory_loss'],fieldLocations:['field_reconciliation','locations',null],fieldReconcilePerYr:['field_reconciliation','counts_per_year',null],fieldReconcilePersonHours:['field_reconciliation','person_hours',null],
 itCost:['it_displacement','currency_per_year',null],discRate:['npv_support','percent',null]
});
const COMPANIONS=Object.freeze({
 laborWastePct:['userCount','laborCost'],currentAccuracy:['annualWriteOff or inventoryValue'],contributionMarginPct:['lostSalesYr or revenue + otifBaseline + otifTarget'],lostSalesYr:['contributionMarginPct'],servicePenaltyCostYr:[],expediteSpendYr:[],
 repeatVisitsYr:['costPerTruckRoll'],costPerTruckRoll:['repeatVisitsYr'],fieldLocations:['fieldReconcilePerYr','fieldReconcilePersonHours','laborCost'],fieldReconcilePerYr:['fieldLocations','fieldReconcilePersonHours','laborCost'],fieldReconcilePersonHours:['fieldLocations','fieldReconcilePerYr','laborCost'],orderErrorPct:['ordersPerYr','costPerError']
});
const CONVERSIONS=Object.freeze({hoursPerWeek:'hours_per_week_to_workforce_percentage'});
function classifyQuestion(question,{industry='default',section=''}={}){
 const ve=question.classification==='value_engineering'||/value-engineering/i.test(section),input=question.sync||null,definition=input&&INPUTS[input];
 const classification=ve?'value_engineering':input?'financial_input':'context';
 return{id:question.id,industry,section,text:question.text,type:question.type||'text',classification,canonicalInput:input,unit:definition?.[1]||null,conversion:question.syncConv||'identity',valueDriver:definition?.[0]||null,economicPool:definition?.[2]||null,formulaId:definition?.[0]||null,directRoiImpact:classification==='financial_input'&&definition?.[0]!=='npv_support',requiredCompanionInputs:COMPANIONS[input]||[],duplicateGroup:question.duplicateGroup||null,overlapGroup:definition?.[2]||null,provenanceTreatment:classification==='financial_input'?'prospect answer becomes confirmed_prospect; model-derived recovery remains assumption-derived':'context only; no ROI input'};
}
function buildQuestionnaireRoiRegistry(questionSets){const rows=[];for(const [industry,sections] of Object.entries(questionSets||{}))for(const section of sections||[])for(const q of section.questions||[])rows.push(classifyQuestion(q,{industry,section:section.section}));return rows;}
function validateRegistry(rows,formulaRegistry={}){
 const errors=[];for(const q of rows){if(q.classification==='financial_input'&&!q.canonicalInput)errors.push(q.id+': missing canonical input');if(q.classification==='financial_input'&&!INPUTS[q.canonicalInput])errors.push(q.id+': unknown canonical input '+q.canonicalInput);if(q.directRoiImpact&&q.formulaId!=='npv_support'&&!formulaRegistry[q.formulaId])errors.push(q.id+': formula not implemented '+q.formulaId);if(q.classification!=='financial_input'&&q.directRoiImpact)errors.push(q.id+': context unexpectedly impacts ROI');}return errors;}
return{INPUTS,COMPANIONS,CONVERSIONS,classifyQuestion,buildQuestionnaireRoiRegistry,validateRegistry};});

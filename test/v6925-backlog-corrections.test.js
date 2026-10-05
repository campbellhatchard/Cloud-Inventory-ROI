'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('scenario versions preserve canonical customer identity and repair historical mismatches',()=>{
  const route=read('src/routes/scenarios.js'),migration=read('migrations/038_repair_scenario_customer_identity.sql');
  assert.match(route,/sourceCustomerId = existing\[0\]\.customer_id/);
  assert.match(route,/sourceCustomerId \|\| await ensureCustomer\(effectiveOwnerId/);
  assert.match(migration,/canonical\.owner_id = s\.owner_id/);
  assert.match(migration,/s\.customer_id IS DISTINCT FROM canonical\.id/);
  assert.doesNotMatch(migration,/SET customer_id = canonical\.id,[\s\S]{0,80}updated_at/);
});

test('scenario list exposes contract comparison projections without full JSONB',()=>{
  const server=read('src/routes/scenarios.js'),client=read('public/app.js');
  for(const field of ['total_contract_benefit','total_contract_investment','total_contract_net_benefit','total_contract_roi','total_contract_npv','contract_payback','contract_months'])assert.match(server,new RegExp(field));
  assert.match(client,/totalContractBenefit: r\.total_contract_benefit/);
  assert.match(client,/inputs: \{[\s\S]*invest: r\.annual_subscription/);
});

test('repeated browser-print PDF blockers use authenticated server downloads',()=>{
  const deal=read('public/deal-export.js'),fit=read('public/solution-fit.js'),impact=read('public/impact-map.js'),server=read('server.js');
  assert.match(deal,/api\/maps\/.+\/export-pdf/);assert.match(deal,/api\/stakeholders\/export-pdf/);assert.match(deal,/api\/export\/battlecard-pdf/);
  assert.match(fit,/api\/handoffs\/.+\/export-pdf\?kind=/);assert.match(impact,/api\/export\/impact-map-pdf/);
  for(const route of ['impact-map-pdf','battlecard-pdf'])assert.match(server,new RegExp(route));
  assert.match(deal,/async function roiMethodologyPDF\(requestedScenarioId\)[\s\S]{0,160}requestedScenarioId\|\|window\._calcScenarioId/);
});

test('operational PDF builders produce branded non-empty PDF artifacts',()=>{
  const builders=require('../src/exports/operational-pdf');
  const outputs=[
    builders.buildJppPdf({company:'Acme',title:'Joint Project Plan',milestones:[{title:'Confirm scope',owner:'joint',dueDate:'2026-10-10',status:'pending'}]}),
    builders.buildStakeholderPdf({company:'Acme',stakeholders:[{name:'Pat Buyer',title:'CFO',role:'economic_buyer',influence:5,support:4,engaged:true}]}),
    builders.buildSolutionFitPdf({opportunity:{products:['CIP'],problem:'Inventory visibility',outcome:'Accurate inventory'},processes:[{name:'Cycle count',fit:'Full Fit'}]},{kind:'summary',customer:'Acme'}),
    builders.buildCompetitivePdf({product:'Competitor',version:2,findings:[{category:'Operations',claim:'Approved claim'}]}),
    builders.buildImpactMapPdf([{label:'Default',rows:[{question:'How many users?',classification:'financial_input',canonicalInput:'userCount',impact:'ROI input'}]}])
  ];
  for(const buffer of outputs){assert.equal(buffer.subarray(0,5).toString(),'%PDF-');assert.ok(buffer.length>800);}
});

test('proposal first-load save deadlock is removed and explicit save remains available',()=>{
  const source=read('public/proposal.js');
  assert.match(source,/onclick="proposalSave\(\)"/);assert.match(source,/async function flush\(\)\{return save\(!serverExists\);\}/);
  assert.match(source,/!window\.proposalDraft\|\|!serverExists/);assert.match(source,/serverExists,storyRevisionReviewed/);
});

test('evidence review, JPP validation, role display and analytics input regressions remain corrected',()=>{
  const discovery=read('public/discovery.js'),map=read('public/map.js'),api=read('public/src/client/api.js'),html=read('public/index.html'),css=read('public/style.css');
  assert.match(discovery,/hasWorking=[^;]*Object\.prototype\.hasOwnProperty/);assert.match(map,/Name each milestone before saving/);
  assert.match(api,/Solution Engineer/);assert.match(api,/normalizedRoles/);assert.match(html,/name="analytics-deal-question-x7"/);
  assert.match(css,/#prospectSyncModal \.modal-card/);
});

test('active output audit reads the server source before enforcing Proposal commercial-note safety',()=>{
  const audit=read('scripts/audit-active-output-paths.js');
  assert.match(audit,/server=fs\.readFileSync\(path\.join\(root,'server\.js'\),'utf8'\)/);
  assert.match(audit,/para\\\(proposal\\\.commercialTerms/);
});

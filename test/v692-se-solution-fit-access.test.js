'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const auth=require('../src/authorization');

const users={
  rep:{id:'rep-a',role:'rep',roleKeys:['rep']},
  manager:{id:'mgr-a',role:'sales_manager',roleKeys:['sales_manager']},
  se:{id:'se-a',role:'se',roleKeys:['se']},
  admin:{id:'admin-a',role:'admin',roleKeys:['admin']},
  multi:{id:'multi-a',role:'rep',roleKeys:['rep','se']}
};

test('v6.9.2 capability matrix grants cross-account Solution Fit only to SE/Admin roles',()=>{
  for(const key of ['se','admin','multi'])assert.equal(auth.hasPermission(users[key],'solution_fit_cross_account'),true,key);
  for(const key of ['rep','manager'])assert.equal(auth.hasPermission(users[key],'solution_fit_cross_account'),false,key);
  assert.equal(auth.resolveSolutionFitDecision(users.se,{},'view'),true);
  assert.equal(auth.resolveSolutionFitDecision(users.se,{},'edit'),true);
  assert.equal(auth.resolveSolutionFitDecision(users.rep,{},'view'),false);
  assert.equal(auth.resolveSolutionFitDecision(users.manager,{},'edit'),false);
});

test('SE capability does not confer general cross-account customer or scenario authority',()=>{
  assert.equal(auth.hasPermission(users.se,'view_all_customers'),false);
  assert.equal(auth.hasPermission(users.se,'edit_all_customers'),false);
  assert.equal(auth.resolveCustomerDecision(users.se,{owned:false,shared:false,teamScoped:false},'view'),false);
  assert.equal(auth.resolveCustomerDecision(users.se,{owned:false,shared:false,teamScoped:false},'edit'),false);
  for(const prohibited of ['view_team_dashboard','approve_stage_override','assign_solution_fit'])assert.equal(auth.hasPermission(users.se,prohibited),false,prohibited);
});

test('dedicated API is authenticated, paginated, minimal, cross-team and includes zero-scenario customers',()=>{
  const route=read('src/routes/solution-fit-customers.js'),server=read('server.js');
  assert.match(server,/\/api\/solution-fit\/customers/);assert.match(route,/router\.use\(requireAuth\)/);
  assert.match(route,/solution_fit_cross_account/);assert.match(route,/LIMIT \$4 OFFSET \$5/);assert.match(route,/Math\.min\(25/);
  assert.match(route,/FROM customers c/);assert.match(route,/LEFT JOIN handoffs/);assert.doesNotMatch(route,/JOIN scenarios s ON/);
  assert.match(route,/c\.deleted_at IS NULL/);assert.match(route,/c\.status,'active'/);
  for(const field of ['id:r.id','name:r.name','owner:','solutionFit:','actions:'])assert.ok(route.includes(field),field);
  for(const leak of ['scenario_data','opportunity_value','financial','proposalDraft','threeWhys'])assert.ok(!route.includes(leak),leak);
});

test('Solution Fit access is independently decided before general customer access',()=>{
  const source=read('src/authorization.js'),fn=source.slice(source.indexOf('async function solutionFitAccess'),source.indexOf('async function scenarioAccess'));
  assert.ok(fn.indexOf("hasPermission(user,'solution_fit_cross_account')")<fn.indexOf("customerAccess(user,customerId,'view',dataQuery)"));
  assert.match(fn,/c\.deleted_at IS NULL/);assert.match(fn,/c\.status,'active'/);
});

test('creation is explicit, preserves owner, assigns creating SE, and update cannot upsert',()=>{
  const route=read('src/routes/handoffs.js');
  assert.match(route,/router\.post\('\/:customerId'/);assert.match(route,/primary_se_id\) VALUES/);assert.match(route,/isSe\?req\.user\.id:null/);
  assert.match(route,/customerOwner:access\.customer\.ownerId/);assert.match(route,/primarySeId:result\.row\.primary_se_id/);
  assert.match(route,/SOLUTION_FIT_NOT_CREATED/);assert.doesNotMatch(route,/ON CONFLICT \(customer_id\) DO UPDATE/);
  assert.doesNotMatch(read('public/solution-fit.js'),/\/assignment'.*method:'PUT'/);
});

test('Solution Fit selector is searchable and offers explicit open/create actions',()=>{
  const ui=read('public/solution-fit.js'),picker=read('public/solution-fit-picker.js'),css=read('public/style.css');
  for(const text of ['Search any active customer to create or continue a Solution Fit.','Search customer or sales rep','/api/solution-fit/customers'])assert.ok(ui.includes(text),text);
  for(const text of ['Open existing Solution Fit','Create new Solution Fit'])assert.ok(picker.includes(text),text);
  for(const obsolete of ['No customers yet — save a scenario first','Pick one to begin, or open a scenario on the Calculator first.'])assert.ok(!ui.includes(obsolete),obsolete);
  assert.match(ui,/setTimeout\(\(\)=>loadCustomerPicker\(input\.value,false\),250\)/);assert.match(css,/sf-customer-result/);
});

test('active/inactive/deleted lifecycle and scenario independence are migration-locked',()=>{
  const migration=read('migrations/036_solution_fit_cross_account.sql'),route=read('src/routes/solution-fit-customers.js');
  assert.match(migration,/status VARCHAR\(20\).*DEFAULT 'active'/);assert.match(migration,/active','inactive'/);assert.match(route,/deleted_at IS NULL/);
  assert.doesNotMatch(route,/scenario_count|save a scenario/i);
});

test('Help and permanent governance state the isolated SE Solution Fit scope',()=>{
  const k=require('../config/application-knowledge.json'),contract=read('BUILD_GOVERNANCE_CONTRACT.md');
  assert.equal(k.knowledgeVersion,'1.0');assert.equal(k.applicationVersion,'6.9.20');
  assert.ok(k.solutionFitKnowledge.some(x=>x.includes('search across all active customers')));
  assert.ok(k.solutionFitKnowledge.some(x=>x.includes('does not automatically grant access')));
  assert.match(contract,/SE CROSS-ACCOUNT SOLUTION FIT INVARIANT/);assert.match(contract,/This does not confer general/);
});

test('cross-account Solution Fit never reuses a different customer scenario context',()=>{
  const ui=read('public/solution-fit.js');
  assert.match(ui,/sameScenarioCustomer=String\(window\.currentScenarioCustomerId/);
  assert.match(ui,/if\(sameScenarioCustomer\)add\('opportunity\.stage'/);
  assert.match(ui,/sameScenarioCustomer\?\(document\.getElementById\('why_act'\)/);
  assert.match(ui,/canUseSeChristie=String\(window\.currentScenarioCustomerId/);
});

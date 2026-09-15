'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {customerAccess,scenarioAccess,solutionFitAccess,hasPermission}=require('../src/authorization');

const customers={
  own:{id:'own',name:'Own Customer',owner_id:'rep',explicitly_shared:false,team_scoped:false,status:'active'},
  team:{id:'team',name:'Team Customer',owner_id:'team-rep',explicitly_shared:false,team_scoped:true,status:'active'},
  other:{id:'other',name:'Other Customer',owner_id:'other-rep',explicitly_shared:false,team_scoped:false,status:'active'},
  inactive:{id:'inactive',name:'Inactive Customer',owner_id:'other-rep',explicitly_shared:false,team_scoped:false,status:'inactive'},
  deleted:{id:'deleted',name:'Deleted Customer',owner_id:'other-rep',explicitly_shared:false,team_scoped:false,status:'active',deleted:true}
};
const scenarios={other:{id:'scenario-other',owner_id:'other-rep',customer_id:'other',shared_with:[]}};
function controlledQuery(sql,params){
  if(/SELECT c\.id,c\.name,c\.owner_id FROM customers c/.test(sql)){
    const c=customers[params[0]];return Promise.resolve({rows:c&&!c.deleted&&c.status==='active'?[c]:[]});
  }
  if(/SELECT c\.id,c\.name,c\.owner_id,/.test(sql)){
    const c=customers[params[1]];return Promise.resolve({rows:c&&!c.deleted?[c]:[]});
  }
  if(/SELECT primary_se_id,additional_se_ids,created_by FROM handoffs/.test(sql))return Promise.resolve({rows:[{primary_se_id:'assigned-se',additional_se_ids:[],created_by:'rep'}]});
  if(/SELECT id,owner_id,customer_id,shared_with FROM scenarios/.test(sql)){
    const s=Object.values(scenarios).find(x=>x.id===params[0]);return Promise.resolve({rows:s?[s]:[]});
  }
  throw new Error('Unexpected authorization query: '+sql.slice(0,80));
}
const users={
  se:{id:'se',role:'se',roleKeys:['se']},rep:{id:'rep',role:'rep',roleKeys:['rep']},
  manager:{id:'manager',role:'sales_manager',roleKeys:['sales_manager']},admin:{id:'admin',role:'admin',roleKeys:['admin']},
  multi:{id:'multi',role:'rep',roleKeys:['rep','se']}
};

test('SE executes real async authorization for unrelated active customer without gaining general access',async()=>{
  assert.equal((await solutionFitAccess(users.se,'other','view',controlledQuery)).allowed,true);
  assert.equal((await solutionFitAccess(users.se,'other','edit',controlledQuery)).allowed,true);
  assert.equal((await customerAccess(users.se,'other','view',controlledQuery)).allowed,false);
  assert.equal((await scenarioAccess(users.se,'scenario-other','view',controlledQuery)).allowed,false);
  assert.equal(hasPermission(users.se,'view_all_customers'),false);
});

test('Rep own and unrelated customer paths execute without exceptions',async()=>{
  assert.equal((await solutionFitAccess(users.rep,'own','view',controlledQuery)).allowed,true);
  assert.equal((await solutionFitAccess(users.rep,'own','edit',controlledQuery)).allowed,false);
  assert.equal((await customerAccess(users.rep,'own','view',controlledQuery)).allowed,true);
  assert.equal((await solutionFitAccess(users.rep,'other','view',controlledQuery)).allowed,false);
  assert.equal((await solutionFitAccess(users.rep,'other','edit',controlledQuery)).allowed,false);
  assert.equal((await customerAccess(users.rep,'other','view',controlledQuery)).allowed,false);
});

test('Sales Manager team and unrelated paths preserve approved behavior without exceptions',async()=>{
  assert.equal((await solutionFitAccess(users.manager,'team','view',controlledQuery)).allowed,true);
  assert.equal((await solutionFitAccess(users.manager,'team','edit',controlledQuery)).allowed,false);
  assert.equal((await customerAccess(users.manager,'team','view',controlledQuery)).allowed,true);
  assert.equal((await solutionFitAccess(users.manager,'other','view',controlledQuery)).allowed,false);
  assert.equal((await solutionFitAccess(users.manager,'other','edit',controlledQuery)).allowed,false);
  assert.equal((await customerAccess(users.manager,'other','view',controlledQuery)).allowed,false);
});

test('Admin and multi-role Rep+SE execute role-union Solution Fit access without manufactured global customer scope',async()=>{
  for(const mode of ['view','edit'])assert.equal((await solutionFitAccess(users.admin,'other',mode,controlledQuery)).allowed,true);
  assert.equal((await customerAccess(users.admin,'other','view',controlledQuery)).allowed,true);
  assert.equal((await solutionFitAccess(users.multi,'other','view',controlledQuery)).allowed,true);
  assert.equal((await solutionFitAccess(users.multi,'other','edit',controlledQuery)).allowed,true);
  assert.equal((await customerAccess(users.multi,'other','view',controlledQuery)).allowed,false);
  assert.equal(hasPermission(users.multi,'view_all_customers'),false);
});

test('SE cross-account path treats inactive and deleted customers as not found',async()=>{
  for(const id of ['inactive','deleted']){
    const result=await solutionFitAccess(users.se,id,'view',controlledQuery);
    assert.equal(result.exists,false,id);assert.equal(result.allowed,false,id);
  }
});

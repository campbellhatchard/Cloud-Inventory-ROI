'use strict';

/* Real HTTP + PostgreSQL certification for the v6.9.41 Solution Fit identity,
   assignment, persistence and authorization boundary. This suite is blocked,
   never passed, when a disposable DATABASE_URL is unavailable. */
const {describe,test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const HAS_DB=Boolean(process.env.DATABASE_URL);
const blocked=HAS_DB?false:'DATABASE_URL unavailable — v6.9.41 Solution Fit PostgreSQL integration is NOT TESTED';
let db,server,base,adminToken,seToken,repToken,ids={};

async function api(route,{method='GET',token=adminToken,body}={}){
  const headers={'Content-Type':'application/json'};if(token)headers.Authorization=`Bearer ${token}`;
  const response=await fetch(base+route,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  return{status:response.status,json:await response.json().catch(()=>null)};
}

if(!HAS_DB)test('v6.9.41 Solution Fit PostgreSQL identity, assignment and persistence gate',{skip:blocked},()=>{});
else describe('v6.9.41 Solution Fit stabilization against disposable PostgreSQL',{concurrency:false},()=>{
  const suffix=`${Date.now()}_${Math.random().toString(16).slice(2)}`,password=`Fit-${suffix}!`;
  before(async()=>{
    process.env.NODE_ENV='test';process.env.JWT_SECRET=process.env.JWT_SECRET||`fit-secret-${suffix}`;
    await require('../src/migrate').runMigrations();db=require('../src/db');
    const bcrypt=require('bcrypt'),hash=await bcrypt.hash(password,8);
    async function user(label,role,roles,isActive=true){
      return(await db.query(`INSERT INTO users(email,username,password_hash,role,roles,first_login,is_active) VALUES($1,$2,$3,$4,$5,FALSE,$6) RETURNING id,username`,[`${label}_${suffix}@example.invalid`,`${label}_${suffix}`,hash,role,roles,isActive])).rows[0];
    }
    ids.admin=await user('fit_admin','admin',['admin']);ids.se=await user('fit_se_multi','rep',['rep','se']);ids.rep=await user('fit_rep','rep',['rep']);ids.inactiveSe=await user('fit_inactive','se',['se'],false);
    ids.customer=(await db.query(`INSERT INTO customers(name,owner_id,created_by,status) VALUES($1,$2,$2,'active') RETURNING id,name`,[`Fit Customer ${suffix}`,ids.rep.id])).rows[0];
    const {app}=require('../server');server=await new Promise(resolve=>{const listener=app.listen(0,'127.0.0.1',()=>resolve(listener))});base=`http://127.0.0.1:${server.address().port}`;
    async function login(user){const result=await api('/api/auth/login',{method:'POST',token:null,body:{username:user.username,password}});assert.equal(result.status,200);return result.json.token;}
    adminToken=await login(ids.admin);seToken=await login(ids.se);repToken=await login(ids.rep);
  });
  after(async()=>{
    if(server)await new Promise(resolve=>server.close(resolve));
    if(db){await db.query('DELETE FROM customers WHERE id=$1',[ids.customer.id]);await db.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[[ids.admin.id,ids.se.id,ids.rep.id,ids.inactiveSe.id]]);await db.pool?.end?.();}
  });

  test('Admin creates an unassigned clean fit and is not silently made Primary SE',async()=>{
    const created=await api(`/api/handoffs/${ids.customer.id}`,{method:'POST',body:{data:{opportunity:{customer:ids.customer.name,products:['CIP']},solutionScope:{primaryProduct:'CIP',additionalProducts:[]},processes:[],gaps:[]}}});
    assert.equal(created.status,201);assert.equal(created.json.primary_se_id,null);ids.handoff=created.json.id;
    const row=(await db.query('SELECT primary_se_id,created_by,data FROM handoffs WHERE id=$1',[ids.handoff])).rows[0];
    assert.equal(row.primary_se_id,null);assert.equal(row.created_by,ids.admin.id);assert.deepEqual(row.data.processes,[]);
  });

  test('assignment rejects non-SE and inactive SE, then accepts an active multi-role SE',async()=>{
    for(const id of [ids.rep.id,ids.inactiveSe.id]){
      const denied=await api(`/api/handoffs/${ids.customer.id}/assignment`,{method:'PUT',body:{primarySeId:id,additionalSeIds:[]}});
      assert.equal(denied.status,400);assert.equal(denied.json.code,'INVALID_SOLUTION_ENGINEER');
    }
    const assigned=await api(`/api/handoffs/${ids.customer.id}/assignment`,{method:'PUT',body:{primarySeId:ids.se.id,additionalSeIds:[]}});
    assert.equal(assigned.status,200);assert.equal(assigned.json.primary_se_id,ids.se.id);assert.equal(assigned.json.primarySeName,ids.se.username);
    const row=(await db.query('SELECT primary_se_id,created_by FROM handoffs WHERE id=$1',[ids.handoff])).rows[0];
    assert.equal(row.primary_se_id,ids.se.id);assert.equal(row.created_by,ids.admin.id,'reassignment must not rewrite authorship');
  });

  test('stable process/gap IDs and authoritative ERP fields survive save, reload and login identity',async()=>{
    const data={
      opportunity:{customer:ids.customer.name,products:['CIP','MEP'],locations:'2',users:'20',problem:'Manual work',outcome:'Accurate inventory',solutionEngineer:'forged display'},
      solutionScope:{primaryProduct:'CIP',additionalProducts:['MEP'],erp:'JDE',erpVersion:'9.2'},architecture:{relationship:'Standalone',erp:'wrong client value',version:'wrong client value'},partner:{involved:'No'},
      processes:[{id:'APP-GOV-PERSISTED',product:'MEP',erp:'JDE',group:'JDE',name:'Cycle Count',source:'standard_app',selected:true,demoStatus:'Demonstrated',fit:'Partial fit',customerValidation:'Customer validated',notes:'Validated JDE behavior'}],
      gaps:[{id:'GAP-PERSISTED',processId:'APP-GOV-PERSISTED',process:'Cycle Count',product:'MEP',erp:'JDE',group:'JDE',mappingStatus:'mapped',need:'Blind count',gapDescription:'One exception',status:'Open'}]
    };
    const saved=await api(`/api/handoffs/${ids.customer.id}`,{method:'PUT',token:seToken,body:{data}});assert.equal(saved.status,200);
    const loaded=await api(`/api/handoffs/${ids.customer.id}`,{token:seToken});assert.equal(loaded.status,200);
    assert.equal(loaded.json.primarySeId,ids.se.id);assert.equal(loaded.json.primarySeName,ids.se.username);
    assert.equal(loaded.json.data.processes[0].id,'APP-GOV-PERSISTED');assert.equal(loaded.json.data.gaps[0].id,'GAP-PERSISTED');assert.equal(loaded.json.data.gaps[0].processId,'APP-GOV-PERSISTED');
    assert.equal(loaded.json.data.solutionScope.erp,'JDE');assert.equal(loaded.json.data.solutionScope.erpVersion,'9.2');assert.equal(loaded.json.data.architecture.erp,'JDE');assert.equal(loaded.json.data.architecture.version,'9.2');
    assert.equal(loaded.json.data.opportunity.solutionEngineer,undefined);assert.equal(loaded.json.data.opportunity.legacySolutionEngineerDisplay,'forged display');
  });

  test('renaming display text preserves the stable gap relationship and readiness uses assignment',async()=>{
    const loaded=await api(`/api/handoffs/${ids.customer.id}`,{token:seToken});const data=loaded.json.data;data.processes[0].name='Cycle Count — renamed';
    const saved=await api(`/api/handoffs/${ids.customer.id}`,{method:'PUT',token:seToken,body:{data}});assert.equal(saved.status,200);assert.ok(saved.json.readiness>0);
    const again=await api(`/api/handoffs/${ids.customer.id}`,{token:seToken});assert.equal(again.json.data.processes[0].id,'APP-GOV-PERSISTED');assert.equal(again.json.data.gaps[0].processId,'APP-GOV-PERSISTED');assert.equal(again.json.data.gaps[0].process,'Cycle Count — renamed');
  });

  test('cross-account SE access remains isolated from general Rep authority',async()=>{
    assert.equal((await api(`/api/handoffs/${ids.customer.id}`,{token:seToken})).status,200);
    assert.equal((await api(`/api/handoffs/${ids.customer.id}`,{token:repToken})).status,200,'customer owner remains read-only');
    const denied=await api(`/api/handoffs/${ids.customer.id}`,{method:'PUT',token:repToken,body:{data:{}}});assert.equal(denied.status,403);
  });
});

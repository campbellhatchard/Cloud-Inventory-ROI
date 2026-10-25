'use strict';
const {describe,test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {persistExecutiveNarrative}=require('../src/shared/executive-narrative');
const HAS_DB=Boolean(process.env.DATABASE_URL);
const blocked=HAS_DB?false:'DATABASE_URL unavailable — v6.9.47 PostgreSQL corrective integration is NOT TESTED';
let db,server,base,adminToken,seBToken,ids={};
async function api(route,{method='GET',token=adminToken,body}={}){const headers={'Content-Type':'application/json'};if(token)headers.Authorization=`Bearer ${token}`;const response=await fetch(base+route,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});return{status:response.status,json:await response.json().catch(()=>null)};}

if(!HAS_DB)test('v6.9.47 PostgreSQL corrective integration gate',{skip:blocked},()=>{});
else describe('v6.9.47 corrective persistence against disposable PostgreSQL',{concurrency:false},()=>{
 const suffix=`${Date.now()}_${Math.random().toString(16).slice(2)}`,password=`Corrective-${suffix}!`;
 before(async()=>{
  process.env.NODE_ENV='test';process.env.JWT_SECRET=process.env.JWT_SECRET||`corrective-secret-${suffix}`;
  await require('../src/migrate').runMigrations();db=require('../src/db');const bcrypt=require('bcrypt'),hash=await bcrypt.hash(password,8);
  async function user(label,role,roles){return(await db.query(`INSERT INTO users(email,username,password_hash,role,roles,first_login,is_active) VALUES($1,$2,$3,$4,$5,FALSE,TRUE) RETURNING id,username`,[`${label}_${suffix}@example.invalid`,`${label}_${suffix}`,hash,role,roles])).rows[0];}
  ids.admin=await user('corrective_admin','admin',['admin']);ids.rep=await user('corrective_rep','rep',['rep']);ids.seA=await user('corrective_se_a','se',['se']);ids.seB=await user('corrective_se_b','se',['se']);
  ids.customer=(await db.query(`INSERT INTO customers(name,owner_id,created_by,status) VALUES($1,$2,$2,'active') RETURNING id,name`,[`Corrective Customer ${suffix}`,ids.rep.id])).rows[0];
  const data=persistExecutiveNarrative({modelVersion:28,currency:'USD',users:5,labor:50000,mLabor:.2},{threeWhysAct:'A',threeWhysNow:'B',threeWhysCi:'C'},{});
  ids.scenario=(await db.query(`INSERT INTO scenarios(base_id,version,is_current,name,company,owner_id,customer_id,created_by,data) VALUES(gen_random_uuid(),1,TRUE,'Corrective Scenario',$1,$2,$3,$2,$4::jsonb) RETURNING id`,[ids.customer.name,ids.rep.id,ids.customer.id,JSON.stringify(data)])).rows[0];
  const {app}=require('../server');server=await new Promise(resolve=>{const listener=app.listen(0,'127.0.0.1',()=>resolve(listener))});base=`http://127.0.0.1:${server.address().port}`;
  async function login(user){const result=await api('/api/auth/login',{method:'POST',token:null,body:{username:user.username,password}});assert.equal(result.status,200);return result.json.token;}
  adminToken=await login(ids.admin);seBToken=await login(ids.seB);
 });
 after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));if(db){await db.query('DELETE FROM customers WHERE id=$1',[ids.customer.id]);await db.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[[ids.admin.id,ids.rep.id,ids.seA.id,ids.seB.id]]);await db.pool?.end?.();}});

 test('real narrative PATCH preserves omitted siblings, persists clear and supports restoration',async()=>{
  let response=await api(`/api/scenarios/${ids.scenario.id}/narrative`,{method:'PATCH',body:{threeWhysAct:'A2'}});assert.equal(response.status,200);
  let row=(await db.query('SELECT data FROM scenarios WHERE id=$1',[ids.scenario.id])).rows[0];assert.equal(row.data.threeWhysAct,'A2');assert.equal(row.data.threeWhysNow,'B');assert.equal(row.data.threeWhysCi,'C');
  response=await api(`/api/scenarios/${ids.scenario.id}/narrative`,{method:'PATCH',body:{threeWhysNow:null}});assert.equal(response.status,200);assert.equal(response.json.threeWhysNow,null);
  row=(await db.query('SELECT data FROM scenarios WHERE id=$1',[ids.scenario.id])).rows[0];assert.equal(row.data.executiveNarrative.threeWhys.whyNow.value,null);assert.equal(row.data.threeWhysNow,null);
  const story=await api(`/api/scenarios/${ids.scenario.id}/executive-value-story`);assert.equal(story.status,200);assert.equal(story.json.threeWhys.whyNow.value,'To validate');assert.equal(story.json.threeWhys.whyChange.value,'A2');assert.equal(story.json.threeWhys.whyCloudInventory.value,'C');
  response=await api(`/api/scenarios/${ids.scenario.id}/narrative`,{method:'PATCH',body:{threeWhysNow:'B2'}});assert.equal(response.status,200);
  row=(await db.query('SELECT data FROM scenarios WHERE id=$1',[ids.scenario.id])).rows[0];assert.equal(row.data.executiveNarrative.threeWhys.whyNow.value,'B2');
 });

 test('custom applications and Primary SE identity survive save/reload for another SE viewer',async()=>{
  const processes=Array.from({length:15},(_,index)=>({id:`APP-GOV-${index+1}`,product:'MEP',erp:'JDE',group:'JDE',name:`Package ${index+1}`,source:'standard_app',selected:true}));
  processes.push({id:'APP-CUSTOM-000001',product:'MEP',erp:'JDE',group:'Customer-specific',name:'QA Custom Application One',source:'non_standard',selected:true,demoStatus:'Demonstrated',fit:'Full fit',customerValidation:'Customer validated',notes:'Validated.'},{id:'APP-CUSTOM-000002',product:'MEP',erp:'JDE',group:'Customer-specific',name:'QA Custom Application Two',source:'non_standard',selected:true});
  const created=await api(`/api/handoffs/${ids.customer.id}`,{method:'POST',body:{data:{opportunity:{customer:ids.customer.name,products:['MEP']},solutionScope:{primaryProduct:'MEP',additionalProducts:[],erp:'JDE'},architecture:{erp:'JDE'},processes,gaps:[]}}});assert.equal(created.status,201);
  const assigned=await api(`/api/handoffs/${ids.customer.id}/assignment`,{method:'PUT',body:{primarySeId:ids.seA.id,additionalSeIds:[]}});assert.equal(assigned.status,200);
  const loaded=await api(`/api/handoffs/${ids.customer.id}`,{token:seBToken});assert.equal(loaded.status,200);assert.equal(loaded.json.primarySeId,ids.seA.id);assert.equal(loaded.json.primarySeName,ids.seA.username);
  assert.equal(loaded.json.data.processes.filter(item=>item.source==='standard_app').length,15);assert.equal(loaded.json.data.processes.filter(item=>item.source==='non_standard').length,2);assert.equal(loaded.json.data.processes.find(item=>item.id==='APP-CUSTOM-000001').notes,'Validated.');
 });
});

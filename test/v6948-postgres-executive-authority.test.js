'use strict';
const {describe,test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {persistExecutiveNarrative}=require('../src/shared/executive-narrative');
const HAS_DB=Boolean(process.env.DATABASE_URL),blocked=HAS_DB?false:'DATABASE_URL unavailable — v6.9.48 PostgreSQL Executive authority integration is NOT TESTED';
let db,server,base,token,ids={};
async function api(route,{method='GET',body}={}){const response=await fetch(base+route,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return{status:response.status,headers:response.headers,json:await response.json().catch(()=>null)};}

if(!HAS_DB)test('v6.9.48 PostgreSQL Executive authority integration gate',{skip:blocked},()=>{});
else describe('v6.9.48 Executive authority against disposable PostgreSQL',{concurrency:false},()=>{
 const suffix=`${Date.now()}_${Math.random().toString(16).slice(2)}`,password=`Narrative-${suffix}!`;
 before(async()=>{
  process.env.NODE_ENV='test';process.env.JWT_SECRET=process.env.JWT_SECRET||`narrative-secret-${suffix}`;
  await require('../src/migrate').runMigrations();db=require('../src/db');const bcrypt=require('bcrypt'),hash=await bcrypt.hash(password,8);
  ids.admin=(await db.query(`INSERT INTO users(email,username,password_hash,role,roles,first_login,is_active) VALUES($1,$2,$3,'admin',$4,FALSE,TRUE) RETURNING id,username`,[`narrative_${suffix}@example.invalid`,`narrative_${suffix}`,hash,['admin']])).rows[0];
  ids.customer=(await db.query(`INSERT INTO customers(name,owner_id,created_by,status) VALUES($1,$2,$2,'active') RETURNING id,name`,[`Narrative Authority ${suffix}`,ids.admin.id])).rows[0];
  const data=persistExecutiveNarrative({modelVersion:28,currency:'USD',contractMonths:36,invest:100000,revenue:50000000},{threeWhysAct:'A',threeWhysNow:'B',threeWhysCi:'C'},{});
  ids.scenario=(await db.query(`INSERT INTO scenarios(base_id,version,is_current,name,company,owner_id,customer_id,created_by,data) VALUES(gen_random_uuid(),1,TRUE,'Narrative Authority',$1,$2,$3,$2,$4::jsonb) RETURNING id`,[ids.customer.name,ids.admin.id,ids.customer.id,JSON.stringify(data)])).rows[0];
  const {app}=require('../server');server=await new Promise(resolve=>{const listener=app.listen(0,'127.0.0.1',()=>resolve(listener));});base=`http://127.0.0.1:${server.address().port}`;
  const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:ids.admin.username,password})});assert.equal(login.status,200);token=(await login.json()).token;
 });
 after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));if(db){await db.query('DELETE FROM customers WHERE id=$1',[ids.customer.id]);await db.query('DELETE FROM users WHERE id=$1',[ids.admin.id]);await db.pool?.end?.();}});

 test('save response and canonical model agree after explicit clear and restore',async()=>{
  const cleared=await api(`/api/scenarios/${ids.scenario.id}/narrative`,{method:'PATCH',body:{threeWhysNow:null}});assert.equal(cleared.status,200);assert.equal(cleared.json.threeWhysNow,null);assert.equal(cleared.json.canonicalNarrative.whyNow.explicitlyCleared,true);assert.ok(cleared.json.narrativeRevision);assert.ok(cleared.json.modelRevision);
  const model=await api(`/api/scenarios/${ids.scenario.id}/executive-output-model?output=executive_view`);assert.equal(model.status,200);assert.match(model.headers.get('cache-control'),/no-store/);assert.equal(model.headers.get('x-executive-model-revision'),model.json.revision.modelRevision);assert.equal(model.json.revision.narrativeRevision,cleared.json.narrativeRevision);assert.equal(model.json.canonicalNarrative.whyNow.value,null);assert.equal(model.json.story.threeWhys.whyNow.value,'To validate');
  const restored=await api(`/api/scenarios/${ids.scenario.id}/narrative`,{method:'PATCH',body:{threeWhysNow:'B2'}});assert.equal(restored.status,200);assert.notEqual(restored.json.narrativeRevision,cleared.json.narrativeRevision);const next=await api(`/api/scenarios/${ids.scenario.id}/executive-output-model?output=executive_view`);assert.equal(next.json.story.threeWhys.whyNow.value,'B2');assert.equal(next.json.revision.narrativeRevision,restored.json.narrativeRevision);
 });
});

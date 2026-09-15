'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createController}=require('../public/solution-fit-picker');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function recorder(){const events=[];return{events,view:{loading:x=>events.push(['loading',x]),results:x=>events.push(['results',x]),empty:x=>events.push(['empty',x]),error:x=>events.push(['error',x]),pagination:x=>events.push(['pagination',x])}};}
const item=(id,name,owner,extra={})=>({id,name,owner:{id:'owner-'+id,name:owner},teams:extra.teams||[],erp:null,solutionFit:{exists:!!extra.exists,status:extra.exists?'conditional':'not_started',readiness:extra.exists?62:null,primarySe:null},actions:{canOpen:!!extra.exists,canCreate:!extra.exists}});

test('successful response behavior renders normal, zero-scenario, and cross-team customer cards',async()=>{
  const r=recorder(),customers=[item('alpha','Alpha','Rep A',{exists:true}),item('charlie','Charlie','Rep C'),item('bravo','Bravo','Rep B',{teams:['Team B']})];
  const controller=createController({request:async()=>({items:customers,total:3}),view:r.view});
  await controller.load('',false);
  assert.equal(r.events[0][0],'loading');const rendered=r.events.find(x=>x[0]==='results')[1];
  for(const name of ['Alpha','Charlie','Bravo','Rep A','Rep B','Rep C'])assert.match(rendered.html,new RegExp(name));
  assert.match(rendered.html,/Open existing Solution Fit/);assert.match(rendered.html,/Create new Solution Fit/);
  assert.equal(rendered.items[1].id,'charlie','zero-scenario customer remains a first-class result');
});

test('empty states distinguish search-empty from system-empty',async()=>{
  const search=recorder(),system=recorder();
  await createController({request:async()=>({items:[],total:0}),view:search.view}).load('missing',false);
  await createController({request:async()=>({items:[],total:0}),view:system.view}).load('',false);
  assert.equal(search.events.find(x=>x[0]==='empty')[1].kind,'search');
  assert.equal(system.events.find(x=>x[0]==='empty')[1].kind,'system');
});

test('failed request exposes retry and successful retry replaces error with results',async()=>{
  const r=recorder();let calls=0,queries=[];
  const controller=createController({request:async q=>{queries.push(q);calls++;if(calls===1)throw new Error('offline');return{items:[item('bravo','Bravo','Rep B')],total:1};},view:r.view});
  await controller.load('bravo',false);
  const failure=r.events.find(x=>x[0]==='error');assert.ok(failure);assert.equal(calls,1);
  await failure[1].retry();
  assert.equal(calls,2);assert.equal(queries[0].search,'bravo');assert.equal(queries[1].search,'bravo');
  assert.match(r.events.filter(x=>x[0]==='results').at(-1)[1].html,/Bravo/);
});

test('pagination retains results and advances the server offset',async()=>{
  const r=recorder(),queries=[];const controller=createController({limit:1,request:async q=>{queries.push(q);return{items:[item(String(q.offset),'Customer '+q.offset,'Rep')],total:2};},view:r.view});
  await controller.load('',false);await controller.load('',true);
  assert.deepEqual(queries.map(x=>x.offset),[0,1]);assert.equal(r.events.filter(x=>x[0]==='results')[1][1].append,true);
});

test('active UI uses only the dedicated Solution Fit endpoint and retains governed state copy',()=>{
  const ui=read('public/solution-fit.js');
  assert.match(ui,/Customers could not be loaded/);assert.match(ui,/We couldn\\'t load the Solution Fit customer list\./);assert.match(ui,/No active customers match this search\./);assert.match(ui,/No active customers are currently available\./);assert.match(ui,/Loading active customers…/);assert.match(ui,/sfCustomerRetry/);
  assert.match(ui,/\/api\/solution-fit\/customers/);assert.doesNotMatch(ui,/apiFetch\('\/api\/customers/);
  assert.doesNotMatch(ui,/No customers yet — save a scenario first/);
});

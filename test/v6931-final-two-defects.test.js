'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const authority=require('../public/sales-manager-opportunity-authority');

function deal({id,baseId,version=1,updatedAt='2026-10-05T12:00:00Z',name='Opportunity A',company='Example Co',repId='rep-1',stage=3,value=1000000,children={}}){
  return {id,baseId,version,updatedAt,name,company,repId,stageGovernance:{currentStage:stage},commercial:{opportunityValue:value,currency:'USD'},...children};
}

test('one canonical opportunity survives repeated child, version and authorization rows',()=>{
  const rows=[
    deal({id:'a-v1',baseId:'A',version:1,updatedAt:'2026-10-01',children:{stakeholderRecords:[{id:'s1'}]}}),
    deal({id:'a-v2-team',baseId:'A',version:2,updatedAt:'2026-10-02',children:{visibilityPath:'team',stakeholderRecords:[{id:'s1'},{id:'s2'}]}}),
    deal({id:'a-v2-owner',baseId:'A',version:2,updatedAt:'2026-10-02',children:{visibilityPath:'owner',planRecord:{milestones:[{id:'m1'},{id:'m2'}]}}}),
    deal({id:'b-v1',baseId:'B',name:'Opportunity B',value:2000000})
  ];
  const projected=authority.dedupeCurrentScenarioRows(rows);
  assert.equal(projected.length,2);
  assert.equal(projected.filter(row=>row.baseId==='A').length,1);
  assert.equal(projected.find(row=>row.baseId==='A').version,2);
  assert.deepEqual(new Set(projected.map(row=>row.baseId)),new Set(['A','B']));
});

test('manager count and value use canonical identity while identical labels with different identities remain separate',()=>{
  const rows=[
    deal({id:'a-1',baseId:'A'}),
    deal({id:'a-join-repeat',baseId:'A',children:{solutionFit:{history:[1,2]},actions:[1,2],evidence:[1,2]}}),
    deal({id:'b-1',baseId:'B',name:'Opportunity B',value:2000000}),
    deal({id:'c-1',baseId:'C'})
  ];
  const projected=authority.dedupeCurrentScenarioRows(rows);
  const summary=authority.summarizeOpportunityValues(rows);
  assert.equal(projected.length,3,'C must remain because its canonical identity differs from A');
  assert.equal(summary.totalCount,3);
  assert.equal(summary.knownValueCount,3);
  assert.equal(summary.totals.USD,4000000);
});

test('team, rep, stage, filter and repeated-refresh projections reconcile to the same canonical set',()=>{
  const payload=[
    deal({id:'a',baseId:'A',repId:'rep-1',stage:3}),
    deal({id:'a-repeat',baseId:'A',repId:'rep-1',stage:3}),
    deal({id:'b',baseId:'B',name:'Opportunity B',repId:'rep-2',stage:4,value:2000000}),
    deal({id:'c',baseId:'C',repId:'rep-1',stage:3})
  ];
  const first=authority.dedupeCurrentScenarioRows(payload);
  const refreshed=authority.dedupeCurrentScenarioRows(payload);
  assert.deepEqual(refreshed.map(row=>row.baseId),first.map(row=>row.baseId),'refresh must replace with the same canonical projection');
  assert.equal(first.length,3);
  assert.equal(first.filter(row=>row.repId==='rep-1').length,2);
  assert.equal(first.filter(row=>row.stageGovernance.currentStage===3).length,2);
  assert.equal(first.filter(row=>row.repId==='rep-1'&&row.stageGovernance.currentStage===3).length,2);
});

test('server and browser consume the same opportunity authority before manager aggregates and rendering',()=>{
  const shared=read('src/shared/sales-manager-deals.js');
  const route=read('src/routes/sales-manager.js');
  const client=read('public/sales-manager.js');
  const html=read('public/index.html');
  assert.match(shared,/public\/sales-manager-opportunity-authority/);
  assert.ok(route.indexOf('dedupeCurrentScenarioRows(scenarios.rows)')<route.indexOf('evaluateLiveStageReadinessBatch(currentScenarios)'));
  assert.ok(route.indexOf('dedupeCurrentScenarioRows(scenarios.rows)')<route.indexOf('const deals = currentScenarios.map'));
  assert.match(client,/summarizeOpportunityValues\(xs\)/);
  assert.match(client,/const canonicalDeals=opportunityAuthority\.dedupeCurrentScenarioRows\(next\.deals\)/);
  assert.match(client,/model=\{\.\.\.next,deals:canonicalDeals\}/);
  assert.doesNotMatch(client,/model\.deals\s*=\s*model\.deals\.concat|model\.deals\.push/);
  assert.match(client,/\$\{viewSummary\(xs\)\}/,'team, rep and stage views must use the same filtered canonical projection');
  assert.doesNotMatch(client,/viewSummary\(view==='team'\?xs:active\)/,'grouped views must not bypass search or other filters');
  assert.ok(html.indexOf('sales-manager-opportunity-authority.js')<html.indexOf('sales-manager.js'));
  const migration=read('migrations/041_single_current_scenario.sql');
  assert.match(migration,/CREATE UNIQUE INDEX[\s\S]*ON scenarios\s*\(base_id\)[\s\S]*WHERE is_current = TRUE AND deleted_at IS NULL/);
});

test('Competitive Product Search has labeled non-credential search semantics and no initial value',()=>{
  const html=read('public/index.html');
  const match=html.match(/<input id="compProductSearch"[\s\S]*?>/);
  assert.ok(match,'Product Search input must be rendered statically');
  const input=match[0];
  assert.match(input,/type="search"/);
  assert.match(input,/name="ci-competitive-product-query"/);
  assert.match(input,/autocomplete="off"/);
  assert.match(input,/autocorrect="off"/);
  assert.match(input,/autocapitalize="off"/);
  assert.match(input,/spellcheck="false"/);
  assert.match(input,/aria-controls="compSelect"/);
  assert.doesNotMatch(input,/\bvalue\s*=/);
  assert.doesNotMatch(input,/name="(?:user|username|email|login|password|account)/i);
  assert.match(html,/<label for="compProductSearch">Product search<\/label>/);
});

test('Competitive Product Search preserves legitimate text and sends it only as a transient GET query',async()=>{
  const attributes={};
  const search={id:'compProductSearch',value:'RF-SMART',dataset:{},classList:{add(){}},setAttribute(k,v){attributes[k]=String(v);},getAttribute(k){return attributes[k]||null;}};
  const select={id:'compSelect',value:'',innerHTML:'',parentNode:{insertBefore(){throw new Error('static search input should be reused');}}};
  const solution={id:'compSolutionFilter',value:'cip'};
  const competitor={id:'competitor',value:''};
  const elements={compProductSearch:search,compSelect:select,compSolutionFilter:solution,competitor};
  let readyHandler=null;
  const calls=[];
  const document={
    getElementById:id=>elements[id]||null,
    addEventListener:(event,handler)=>{if(event==='DOMContentLoaded')readyHandler=handler;},
    querySelectorAll:()=>[],
    createElement:()=>({dataset:{},classList:{add(){}},setAttribute(){}})
  };
  const context={
    document,
    console:{error(){},warn(){}},
    clearTimeout(){},
    setTimeout(fn){fn();return 1;},
    encodeURIComponent,
    apiFetch:async(url,options={})=>{calls.push({url,method:options.method||'GET'});return{ok:true,json:async()=>({products:[]})};},
    CICompetitiveContext:{beginRequest:()=>({isCurrent:()=>true,signal:null})},
    savedScenarios:[]
  };
  context.window=context;
  vm.runInNewContext(read('public/competitive-intelligence-v662.js'),context,{filename:'competitive-intelligence-v662.js'});
  assert.equal(typeof readyHandler,'function');
  await readyHandler();
  assert.equal(search.value,'RF-SMART','initialization must not clear a legitimate query');
  assert.equal(search.type,'search');
  assert.equal(search.name,'ci-competitive-product-query');
  assert.equal(attributes.autocomplete,'off');
  assert.equal(attributes['aria-label'],'Search competitive products');
  assert.equal(typeof search.oninput,'function');
  search.value='RFgen';
  await search.oninput();
  await new Promise(resolve=>setImmediate(resolve));
  assert.ok(calls.some(call=>call.method==='GET'&&call.url.includes('q=RFgen')),'typed search must query the product list');
  assert.equal(calls.some(call=>call.method!=='GET'),false,'search entry must not persist or link governed records');
  assert.equal(search.value,'RFgen','normal typing must remain intact');
  assert.equal(search.onpaste,undefined,'paste must not be blocked');
  assert.equal(search.disabled,undefined);
  assert.equal(search.readOnly,undefined);
});

test('Competitive Product Search fallback receives the same semantics without clearing user text',()=>{
  const source=read('public/competitive-intelligence-v662.js');
  for(const required of ["input.type='search'","input.name='ci-competitive-product-query'","setAttribute('autocomplete','off')","setAttribute('aria-label','Search competitive products')"]){
    assert.ok(source.includes(required),required);
  }
  assert.doesNotMatch(source,/compProductSearch[^\n]{0,180}\.value\s*=\s*['"]{2}/);
  assert.doesNotMatch(source,/setInterval|MutationObserver/);
  assert.match(source,/products\?ciProduct=.*&q=/);
  assert.doesNotMatch(source,/body:JSON\.stringify\([^)]*compProductSearch/);
});

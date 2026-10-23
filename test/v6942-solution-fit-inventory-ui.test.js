'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const model=require('../public/solution-fit-state');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const EXPECTED_ITEMS=[
  'Lot Numbers','FIFO, LIFO, FEFO, etc.','Serial Numbers','LPNs / Handling Units / Packing Units',
  'Zones','Specialized Storage Areas','Defined Pick Sequence','Job','Ownership','Country of Origin'
];
const EXPECTED_ANSWERS=['Not answered','Yes','No','Unknown / To confirm','Not applicable'];

function deterministicFixture(){
  const state=model.migrateState({
    opportunity:{customer:'Northstar Industrial',products:['CIP','MEP']},
    solutionScope:{primaryProduct:'CIP',additionalProducts:['MEP'],erp:'JDE',erpVersion:'9.2'}
  });
  const answers=['Yes','Unknown / To confirm','No','Yes','Not applicable','Not answered','Yes','No','Unknown / To confirm','Yes'];
  EXPECTED_ITEMS.forEach((name,index)=>{state.inventoryConfiguration[name].answer=answers[index];});
  state.inventoryConfiguration['Lot Numbers'].note='Customer tracks lot-controlled inventory.';
  state.inventoryConfiguration['Ownership'].note='Confirm consigned inventory treatment during design.';
  Object.assign(state.lpnConfiguration,{Inbound:'Yes',Internal:'Unknown / To confirm',Outbound:'No',Nested:'Not applicable'});
  return state;
}

test('inventory questions and answer values remain the exact governed state contract',()=>{
  assert.deepEqual([...model.INVENTORY_ITEMS],EXPECTED_ITEMS);
  assert.deepEqual([...model.ANSWERS],EXPECTED_ANSWERS);
  assert.deepEqual([...model.LPN_ITEMS],['Inbound','Internal','Outbound','Nested']);
});

test('deterministic inventory fixture survives server-payload JSON round trip without loss',()=>{
  const fixture=deterministicFixture();
  assert.deepEqual(model.inventoryStats(fixture),{applicable:true,total:10,answered:9,pct:90});
  const reloaded=model.migrateState(JSON.parse(JSON.stringify(fixture)));
  assert.deepEqual(reloaded.inventoryConfiguration,fixture.inventoryConfiguration);
  assert.deepEqual(reloaded.lpnConfiguration,fixture.lpnConfiguration);
  assert.equal(reloaded.inventoryConfiguration['Lot Numbers'].note,'Customer tracks lot-controlled inventory.');
  assert.equal(reloaded.inventoryConfiguration['Ownership'].note,'Confirm consigned inventory treatment during design.');
  assert.deepEqual(model.inventoryStats(reloaded),{applicable:true,total:10,answered:9,pct:90});
});

test('refined inventory renderer keeps native controls, explicit labels, notes and conditional LPN detail',()=>{
  const source=read('public/solution-fit.js');
  const section=source.slice(source.indexOf('const LPN_INVENTORY_LABEL'),source.indexOf('function productCatalog'));
  assert.match(section,/data-answer-state=/);
  assert.match(section,/<label class="sf-config-question" for="\$\{answerId\}">/);
  assert.match(section,/<select id="\$\{answerId\}" data-sfinventory=/);
  assert.match(section,/Design or handoff note/);
  assert.match(section,/data-sfinventory-note=/);
  assert.match(section,/Use <strong>Unknown \/ To confirm<\/strong> when the customer has not decided\.<br>Add notes only where they improve the design or handoff\./);
  assert.match(section,/if\(S\.inventoryConfiguration\[LPN_INVENTORY_LABEL\]\?\.answer!==['"]Yes['"]\)return['"]{2}/);
  assert.match(section,/data-sflpn-region/);
  assert.match(section,/<label for="sfLpnAnswer\$\{index\}">/);
  assert.doesNotMatch(section,/role="listbox"|contenteditable|custom-select/i);
});

test('answer updates preserve focus and expanded note state by avoiding a full section rerender',()=>{
  const source=read('public/solution-fit.js');
  const handler=source.slice(source.indexOf("document.querySelectorAll('[data-sfinventory]')"),source.indexOf("document.querySelectorAll('[data-sfprinting]')"));
  assert.match(handler,/refreshInventoryPresentation\(el\)/);
  assert.match(handler,/rerenderLpnConfiguration\(\)/);
  assert.doesNotMatch(handler,/rerenderConfiguration\(\)/);
  assert.match(source,/data-sfinventory-count="heading" aria-live="polite"/);
  assert.match(source,/data-sfinventory-count="summary" aria-live="polite"/);
  assert.match(source,/summary\.textContent=el\.value\.trim\(\)\?'Edit note':'\+ Add note'/);
});

test('inventory presentation is two-column desktop, one-column mobile, readable and keyboard focused',()=>{
  const css=read('public/style.css');
  const section=css.slice(css.indexOf('/* v6.9.42 — General Inventory Configuration presentation refinement */'));
  assert.match(section,/\.sf-config-grid\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(section,/@media\(max-width:720px\)[\s\S]*?\.sf-config-grid\{grid-template-columns:1fr/);
  assert.match(section,/\.sf-config-item\{[^}]*padding:18px/);
  assert.match(section,/\.sf-config-question\{[^}]*font-size:15px/);
  assert.match(section,/\.sf-config-answer\{[^}]*width:195px/);
  assert.match(section,/\.sf-config-answer select,[^\{]+\{[^}]*min-height:44px/);
  assert.match(section,/:focus-visible[^\{]*\{[^}]*outline:3px solid/);
  assert.match(section,/\.sf-config-note summary\{[^}]*min-height:44px/);
});

test('focused UI refinement adds no browser storage, file upload, evidence or attachment behavior',()=>{
  const source=read('public/solution-fit.js');
  const section=source.slice(source.indexOf('const LPN_INVENTORY_LABEL'),source.indexOf('function productCatalog'));
  assert.doesNotMatch(section,/localStorage|sessionStorage|type="file"|upload|attachment|photo|Add evidence/i);
});

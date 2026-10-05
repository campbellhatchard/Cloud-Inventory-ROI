'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const {buildSnapshotRows}=require('../src/shared/value-history');
const {calcROI}=require('../src/shared/roi-engine');

test('saved scenario snapshots use the calculator storage keys for canonical inputs',()=>{
  const rows=buildSnapshotRows({inventory:10000000,users:24,labor:85000,currency:'USD'});
  const byId=Object.fromEntries(rows.map(row=>[row.canonicalInput,row]));
  assert.equal(byId.inventoryValue.normalizedValue,10000000);
  assert.equal(byId.userCount.normalizedValue,24);
  assert.equal(byId.laborCost.normalizedValue,85000);
});

test('field inventory value is opt-in and reconciliation person-hours persist',()=>{
  const input={modelVersion:28,hasFieldInventory:false,fieldLocations:10,fieldReconcilePerYr:12,fieldReconcilePersonHours:5,labor:83200,mFieldCount:.5,invest:100000,contractMonths:36};
  const off=calcROI(input),on=calcROI({...input,hasFieldInventory:true});
  assert.equal(off.fiCountSav,0);
  assert.ok(on.fiCountSav>0);
  const features=read('public/features.js');
  assert.match(features,/fieldReconcilePersonHours/);
});

test('prospect-applied values are server-persisted and no longer depend on a navigation-only browser draft',()=>{
  const features=read('public/features.js'),route=read('src/routes/scenarios.js'),service=read('src/shared/roi-value-application.js');
  assert.match(features,/a\.persisted!==true/);
  assert.doesNotMatch(features.slice(features.indexOf('async function applyValueEvent'),features.indexOf('function renderConfidence')),/_appliedValueDrafts|markCalcDirty/);
  assert.match(route,/transaction\(client=>applyRoiValueEvent/);
  assert.match(service,/UPDATE scenarios SET data=\$2::jsonb/);
  assert.match(service,/INSERT INTO roi_value_applications/);
});

test('scenario saves preserve Three Whys and wait for field-inventory authority',()=>{
  const versioning=read('public/versioning.js'),index=read('public/index.html');
  for(const key of ['threeWhysAct','threeWhysCi','threeWhysNow','threeWhysMeta'])assert.ok(versioning.includes(key),key);
  assert.match(versioning,/await window\._fieldInventorySavePromise/);
  assert.match(versioning,/window\._fieldInventorySaveFailed/);
  assert.match(index,/window\._fieldInventorySavePromise = apiFetch/);
  assert.match(index,/if \(window\._scenarioLoaded && typeof recalc === 'function'\) recalc\(\)/);
});

test('scenario and sensitivity surfaces use governed contract-period labels',()=>{
  const versioning=read('public/versioning.js'),app=read('public/app.js'),index=read('public/index.html');
  assert.match(versioning,/Contract ROI/);
  assert.match(versioning,/Contract NPV/);
  assert.match(app,/contract ROI · Contract NPV/);
  assert.match(index,/contract-term NPV/);
  assert.doesNotMatch(versioning,/NPV 5yr|NPV5:|label:'Year 1 ROI'/);
});

test('AI enhancement distinguishes service availability while preserving seller content',()=>{
  const narrative=read('public/narrative.js');
  assert.match(narrative,/if\(!resp\.ok\)/);
  assert.match(narrative,/status:e&&e\.status/);
  assert.match(narrative,/your content was preserved/);
});

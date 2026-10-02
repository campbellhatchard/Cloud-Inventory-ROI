'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Competitive research carries the explicitly selected CIP or MEP product into its governed source',()=>{
  const src=read('public/comp-research.js');
  assert.match(src,/_cr\.ciSource = _curatedProductSource\(ctx\)/);
  assert.match(src,/ciProduct=' \+ encodeURIComponent\(ctx\.solutionKey\)/);
  assert.match(src,/solutionKey:ctx\.solutionKey/);
  assert.match(src,/type === 'canonical' && _cr\.ciSource\.solutionKey !== ctx\.solutionKey/);
});

test('Discovery answers refresh the visible progress counters without rerendering the form',()=>{
  const src=read('public/discovery.js');
  for(const id of ['discAnsweredCount','discRemainingCount','discSyncedCount','discProgressFill','discProgressPct'])assert.ok(src.includes(id),id);
  assert.match(src,/function handleDiscInput[\s\S]*setDiscoveryAnswer\(id, value[\s\S]*updateDiscoveryProgress\(\)/);
  assert.match(src,/function updateDiscoveryProgress\(\)[\s\S]*answered\/total\*100/);
});

test('Stakeholder Map inherits only a saved authorized scenario customer and search results are keyboard controls',()=>{
  const src=read('public/stakeholders.js');
  assert.match(src,/window\._calcScenarioId&&String\(\(document\.getElementById\('companyName'\)/);
  assert.match(src,/getCompanies\(\)\.some/);
  assert.match(src,/<button type="button" class="cs-result" onclick="setStakeCompanyFromSearch/);
  assert.doesNotMatch(src,/<div class="cs-result" onmousedown=/);
});

test('Sensitivity uses authoritative selected-contract NPV instead of a hard-coded five-year metric',()=>{
  const src=read('public/features.js'),fn=src.slice(src.indexOf('function renderSensitivity()'),src.indexOf('function handleLogoUpload'));
  assert.match(fn,/totalContractNpv/);
  assert.match(fn,/contractMonths/);
  assert.match(fn,/contractLabel/);
  assert.doesNotMatch(fn,/5-yr NPV|5-year NPV/);
});

test('AI Help maps active panes to Application Knowledge workspace identifiers',()=>{
  const src=read('public/assistant.js');
  assert.match(src,/'tab-solfit':'solution-fit'/);
  assert.match(src,/screen:WORKSPACE_IDS\[pane\]|WORKSPACE_IDS\[paneId\]/);
});

test('Risk Ledger saves first and then uses the governed server PDF download',()=>{
  const src=read('public/solution-fit.js'),start=src.indexOf('async function printRiskLedger()'),fn=src.slice(start,src.indexOf("document.addEventListener('keydown'",start));
  const saved=fn.indexOf('await flushSolutionFitSave()'),download=fn.indexOf('return window.deServerDownload');
  assert.ok(saved>=0&&download>saved,{saved,download});
  const active=fn.slice(0,fn.indexOf('    const company',download));
  assert.match(active,/\/api\/handoffs\/\$\{encodeURIComponent\(customerId\)\}\/export-pdf\?kind=risk/);
  assert.doesNotMatch(active,/window\.open|CISolutionFitOutputBuilders\.buildRiskHtml/);
});

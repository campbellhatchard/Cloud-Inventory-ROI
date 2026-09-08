const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const registry=require('../src/shared/questionnaire-roi-registry');const {ROI_FORMULA_REGISTRY}=require('../src/shared/roi-engine');
test('canonical input registry has valid formulas and companion fields',()=>{
  const rows=[registry.classifyQuestion({id:'margin',sync:'contributionMarginPct',text:'Margin'}),registry.classifyQuestion({id:'recon',sync:'fieldReconcilePersonHours',text:'Hours'})];
  assert.deepEqual(registry.validateRegistry(rows,ROI_FORMULA_REGISTRY),[]);
  assert.equal(registry.INPUTS.contributionMarginPct[0],'service_revenue_margin');
  assert.equal(registry.INPUTS.fieldReconcilePersonHours[0],'field_reconciliation');
});
test('value-engineering and context questions never calculate ROI',()=>{
  assert.equal(registry.classifyQuestion({id:'ve_1',text:'Why now?',classification:'value_engineering'}).directRoiImpact,false);
  assert.equal(registry.classifyQuestion({id:'ctx_1',text:'Describe the workflow'}).directRoiImpact,false);
});
test('prospect experience contains no fabricated investment placeholder',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../public/prospect.html'),'utf8');
  assert.ok(!/invest\s*:\s*90000/.test(html));
  assert.match(html,/modelVersion:\s*28/);
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('SE empty Calculator state provides a Solution Fit action without broadening customer access',()=>{
  const ui=read('public/customer-switcher.js');
  assert.match(ui,/isSolutionFitOnlyUser\(\)/);
  assert.match(ui,/No ROI customer workspaces are assigned to you/);
  assert.match(ui,/Create or Continue Solution Fit/);
  assert.match(ui,/openSolutionFitWorkspace\(\)/);
  assert.match(ui,/switchTab\?\.\('solfit'\)/);
  assert.match(ui,/fetch\('\/api\/customers'/);
  assert.doesNotMatch(ui,/solution_fit_cross_account.*\/api\/customers/s);
});

test('SE onboarding directs the user to the dedicated cross-account Solution Fit selector',()=>{
  const ux=read('public/ux-enhancements.js');
  assert.match(ux,/Welcome — start with Solution Fit/);
  assert.match(ux,/Find an existing customer/);
  assert.match(ux,/search any active customer or sales rep/);
  assert.match(ux,/switchTab\(solutionFitOnly\?'solfit':'calc'\)/);
  assert.match(ux,/!solutionFitOnly&&typeof showCustomerGate/);
  assert.match(ux,/\['rep','admin','sales_manager','sales_leader'\]/);
});

test('Solution Fit customer results cannot horizontally clip the create action',()=>{
  const css=read('public/style.css');
  assert.match(css,/\.sf-customer-results\{[^}]*overflow-y:auto;overflow-x:hidden/);
  assert.match(css,/\.sf-customer-result\{[^}]*grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css,/@media\(max-width:980px\)\{\.sf-customer-result/);
  assert.match(css,/\.sf-customer-result-actions \.btn\{white-space:normal;text-align:center\}/);
});

test('SE cross-account authority remains isolated from general customer permissions',()=>{
  const auth=require('../src/authorization');
  const se={id:'se-a',role:'se',roleKeys:['se']};
  assert.equal(auth.hasPermission(se,'solution_fit_cross_account'),true);
  assert.equal(auth.hasPermission(se,'view_all_customers'),false);
  assert.equal(auth.hasPermission(se,'edit_all_customers'),false);
  assert.equal(auth.resolveCustomerDecision(se,{owned:false,shared:false,teamScoped:false},'view'),false);
});

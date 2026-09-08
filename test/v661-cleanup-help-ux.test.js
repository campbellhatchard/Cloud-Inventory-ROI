const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('v6.6+ releases remain consistent and ROI Model v2.8 remains authoritative',()=>{
  const release=require(path.join(root,'package.json')).version;
  assert.match(release,/^6\.(?:6|7|8|9)\./);
  assert.match(read('public/index.html'),new RegExp(`APP_VERSION="${release.replace(/\./g,'\\.')}`));
  assert.match(read('public/version-history.js'),new RegExp(`version: '${release.replace(/\./g,'\\.')}'`));
  assert.match(read('ROI_METHODOLOGY.md'),/ROI Model v2\.8 formulas are unchanged/);
});

test('cleanup uses an immutable explicit preview and recoverable governed removal',()=>{
  const server=read('server.js'),migration=read('migrations/031_cleanup_recovery.sql');
  assert.match(migration,/CREATE TABLE IF NOT EXISTS admin_cleanup_previews/);
  assert.match(migration,/resolved_records JSONB/);
  assert.match(server,/\/api\/admin\/cleanup\/preview/);
  assert.match(server,/previewId/);
  assert.match(server,/Selection is not part of the authorized preview/);
  assert.match(server,/admin\.cleanup_removed/);
  assert.match(server,/admin\.cleanup_restored/);
  assert.match(server,/is_active=FALSE/);
  assert.match(server,/ORDER BY version DESC,updated_at DESC,id DESC LIMIT 1/);
  const execute=server.slice(server.indexOf("app.post('/api/admin/cleanup/execute'"),server.indexOf('/* ── Cleanup: list recently',server.indexOf("app.post('/api/admin/cleanup/execute'")));
  assert.doesNotMatch(execute,/DELETE\s+FROM\s+(buyer_evidence|stage_history|prospect_submission|scenario_value)/i);
});

test('cleanup UI previews dependencies, supports recovery, and avoids native confirmation',()=>{
  const html=read('public/index.html'),ui=read('public/admin-cleanup-v661.js');
  for(const phrase of ['Data Cleanup & Recovery','Find & Remove','Recently Removed','Search customer, opportunity, or rep']) assert.match(html,new RegExp(phrase.replace(/[&]/g,'&amp;?'),'i'));
  for(const phrase of ['Removal preview','Evidence protection','Remove Selected','Remove All Search Results','Cleanup reason','Solution Fits','Prospect sessions','Restore']) assert.ok(ui.includes(phrase),phrase);
  assert.doesNotMatch(ui,/\bconfirm\s*\(/);
  assert.match(ui,/role="dialog"/);
  assert.match(ui,/dialogKeys/);
});

test('current Help is task-oriented and coverage includes every major workspace',()=>{
  const help=read('public/help-v6.js'),coverage=JSON.parse(read('public/help-coverage-v661.json'));
  assert.doesNotMatch(help,/What.?s New/i);
  for(const phrase of ['ROI Model v2.8','Prospect draft','Prospect submitted','Value History','Customer revalidated','Executive Output Readiness','Ready to Share','Review Before Sharing','Draft Only','Sales Manager','Data Cleanup & Recovery','CRM-independent workflow']) assert.ok(help.includes(phrase),phrase);
  for(const key of ['customerScenario','roiCalculator','discoveryProspectLink','buyerEvidence','stakeholders','solutionFit','jointProjectPlan','dealCoach','executiveOutputs','salesManager','administration']) assert.ok(coverage.workspaces[key]?.length,key);
});

test('active markup uses semantic action classes; legacy CTA remains compatibility-only',()=>{
  const files=[];for(const name of fs.readdirSync(path.join(root,'public'))){if(/\.(js|html)$/.test(name)&&name!=='ui-v4.js')files.push(name)}
  for(const name of files)assert.doesNotMatch(read('public/'+name),/btn-cta/,name);
  const guide=read('public/style-guide.html');
  for(const cls of ['btn-primary','btn-secondary','btn-tertiary','btn-danger'])assert.ok(guide.includes(cls),cls);
});

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const manager=read('public/sales-manager.js');
const css=read('public/style.css');
const html=read('public/index.html');
const discovery=read('public/discovery.js');
const assistant=read('public/assistant.js');
const help=read('public/help-v6.js');

test('Sales Manager opens to Entire Team and Active without silent rep or stage selection',()=>{
  assert.match(manager,/view='team'/);
  assert.match(manager,/state:'active'/);
  assert.doesNotMatch(manager,/model\.reps\[0\]|model\.stages\[0\]/);
  assert.match(manager,/\['team','Entire Team'\]/);
  assert.match(manager,/\['rep','By Rep'\]/);
  assert.match(manager,/\['stage','By Buying Stage'\]/);
});

test('manager portfolio is exception-first, explainable, and does not calculate ROI',()=>{
  assert.match(manager,/priorityOrder/);
  assert.match(manager,/plan\.overdue/);
  assert.match(manager,/stageGovernance\?\.stageGap/);
  assert.match(manager,/primaryReason\(d\)/);
  assert.match(manager,/recommended\(d\)/);
  assert.match(manager,/Derived from current saved opportunity data/);
  assert.doesNotMatch(manager,/calcROI|calculateROI|roiEngine/);
});

test('manager renders five KPIs, five visible filters, summaries, and eight queue columns',()=>{
  for(const label of ['Active Opportunity Value','Needs Attention','At Risk / Stalled','Stage Alignment Gaps','Past-Due Customer Commitments'])assert.match(manager,new RegExp(label.replace(/[ /-]/g,'.*')));
  for(const label of ['Search','Rep','Buying Stage','Attention / Health','Queue'])assert.match(manager,new RegExp(label.replace(/[ /]/g,'.*')));
  assert.match(manager,/function repSummary/);
  assert.match(manager,/function stageSummary/);
  const header=manager.match(/<thead><tr>(.*?)<\/tr><\/thead>/s)?.[1]||'';
  assert.equal((header.match(/<th>/g)||[]).length,8);
});

test('search is debounced and restores caret; advanced filters use removable chips',()=>{
  assert.match(manager,/setTimeout\(\(\)=>\{render\(\);const next=\$\('smSearch'\)/);
  assert.match(manager,/setSelectionRange\(pos,pos\)/);
  assert.match(manager,/smToggleAdvanced/);
  assert.match(manager,/sm-filter-chips/);
  assert.match(manager,/onclick="smFilter\('\$\{k\}',''\)"/);
});

test('drawer leads with manager focus and separates governed work areas',()=>{
  for(const label of ['Primary reason','Next customer commitment','Buying Progress','Value Case','Risk &amp; Execution','Joint Project Plan','Stakeholders','Solution Fit'])assert.match(manager,new RegExp(label));
  assert.match(manager,/e\.key==='Escape'/);
  assert.match(manager,/e\.key!=='Tab'/);
  assert.match(manager,/lastTrigger\?\.focus/);
  assert.match(manager,/apiFetch\(id\?'\/api\/sales-manager\/actions\/'\+id:'\/api\/sales-manager\/actions'/);
  assert.match(manager,/method:id\?'PATCH':'POST'/);
  assert.match(manager,/method:'DELETE'/);
});

test('manager layout is responsive without a 1580px table dependency',()=>{
  assert.doesNotMatch(css,/min-width:\s*1580px/);
  assert.match(css,/@media\(max-width:1024px\).*?\.sm-table-wrap\{display:none\}.*?\.sm-mobile-list\{display:grid/s);
  assert.match(css,/@media\(max-width:768px\).*?\.sm-drawer\{width:100%;height:100%/s);
  assert.match(css,/@media\(max-width:390px\)/);
});

test('navigation hierarchy and action semantics are explicit',()=>{
  const order=['Value Case','Analyze &amp; Coach','Portfolio','Administration / Support'].map(x=>html.indexOf(x));
  assert.ok(order.every(x=>x>=0));
  assert.deepEqual([...order].sort((a,b)=>a-b),order);
  assert.doesNotMatch(html,/nav-step/);
  assert.match(html,/Executive Outputs/);
  assert.match(css,/\.btn-secondary/);
  assert.match(css,/\.btn-tertiary/);
});

test('static markup has unique IDs, including one ROI model upgrade control',()=>{
  const ids=[...html.matchAll(/\sid=["']([^"']+)["']/g)].map(m=>m[1]);
  const duplicates=[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
  assert.deepEqual(duplicates,[]);
  assert.equal(ids.filter(x=>x==='roiModelUpgradeBtn').length,1);
});

test('portfolio screens hide model context and Prospect evidence states are unambiguous',()=>{
  assert.match(read('public/ui-v4.js'),/CONTEXT_TABS/);
  assert.match(css,/body\.context-off \.context-header\{display:none!important\}/);
  assert.match(discovery,/Prospect draft/);
  assert.match(discovery,/Not yet submitted/);
  assert.match(discovery,/Prospect submitted/);
  assert.match(discovery,/Review Prospect Answers/);
});

test('Help and AI Help explain manager semantics and prospect submission integrity',()=>{
  for(const text of ['Management Priority','Deal Health','By Rep','Buying Stage','manager actions'])assert.match((help+'\n'+assistant),new RegExp(text,'i'));
  assert.match(assistant,/tab-manager/);
  assert.match(read('config/application-knowledge.json'),/Prospect draft is not submitted evidence/);
  assert.match(help,/Review Prospect Answers/);
});

test('v6.6+ releases remain consistent and ROI Model remains 2.8',()=>{
  const release=require(path.join(root,'package.json')).version;
  assert.match(release,/^6\.(?:6|7|8)\./);
  assert.match(html,new RegExp(`APP_VERSION="${release.replace(/\./g,'\\.')}`));
  assert.match(read('public/version-history.js'),new RegExp(`version: '${release.replace(/\./g,'\\.')}'`));
  assert.match(read('ROI_METHODOLOGY.md'),/Model v2\.8/);
  assert.match(read('ROI_METHODOLOGY.md'),/ROI Model v2\.8 formulas are unchanged/);
});

'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {spawn}=require('node:child_process');
const os=require('node:os');
const SF=require('../public/solution-fit-state');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
const packageNames=['Cycle Count - Directed','Inventory Transfer','Inventory Inquiry','Inventory Issue','Inventory Reclassification','Inventory Adjustment Negative','Inventory Adjustment Positive','Lot Status Update','Pack Confirmation','Pick Confirmation','Purchase Order Receipt','Receipt Routing','RMA Returns','Ship Confirmation','Inventory Cart Transfer'];
function state(){return SF.migrateState({opportunity:{products:['MEP']},solutionScope:{primaryProduct:'MEP',additionalProducts:[],erp:'JDE',erpVersion:'9.2',packageMode:'standard'},architecture:{erp:'JDE'},processes:[],gaps:[],interfaces:[],inventoryConfiguration:{},turnover:{}});}

test('SOLFIT-6949-01 one scope selector drives ERP and application-count semantics',()=>{
  const value=state();
  SF.applyStandardPackage(value,{erp:'JDE',names:packageNames,catalogVersion:'2026-08'});
  const one=SF.createCustomProcess(value,{product:'MEP',erp:'JDE',name:'Custom One',selected:true});
  SF.createCustomProcess(value,{product:'MEP',erp:'JDE',name:'Custom Two',selected:true});
  let view=SF.scopePresentation(value);
  assert.equal(view.erp,'JDE');assert.equal(view.applicationCount,17);assert.equal(new Set(view.applicationIds).size,17);
  one.selected=false;view=SF.scopePresentation(value);assert.equal(view.applicationCount,16);
  const reloaded=SF.migrateState(clone(value));assert.deepEqual(SF.scopePresentation(reloaded),view);
});

test('SOLFIT-6949-02 save response returns normalized authoritative Solution Fit data',()=>{
  const route=read('src/routes/handoffs.js');
  assert.match(route,/RETURNING id, customer_id, data, readiness, status, updated_at/);
  assert.match(route,/data: normalizeHandoffData\(rows\[0\]\.data \|\| \{\}\)/);
});

test('SOLFIT-6949-03 production UI reconciles one model after server success and rolls back on failure',()=>{
  const ui=read('public/solution-fit.js');
  assert.match(ui,/const authoritative=hydrateAuthoritativeState\(result\.data\|\|payload\)/);
  assert.match(ui,/lastSavedState=cloneState\(authoritative\)/);
  assert.match(ui,/reconcileSolutionFitPresentations\(\)/);
  assert.match(ui,/restoreLastSavedState/);
  assert.match(ui,/while\(canWrite&&customerId&&dirty&&generation===saveRunGeneration\)/);
  assert.doesNotMatch(ui,/window\.location\.reload\s*\(/);
  assert.equal((ui.match(/id="sfScopeSummary"/g)||[]).length,1);
});

function browserPath(){
  const candidates=[process.env.CHROME_PATH,process.env.EDGE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe','/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
  return candidates.find(candidate=>fs.existsSync(candidate));
}
function serveFile(request,response){
  let requested=new URL(request.url,'http://127.0.0.1').pathname;
  if(requested==='/handoff-readiness.js')requested='/src/shared/handoff-readiness.js';
  const file=path.resolve(root,'.'+requested);
  if(!file.startsWith(root)||!fs.existsSync(file)||!fs.statSync(file).isFile()){response.writeHead(404);response.end('Not found');return;}
  response.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8','Cache-Control':'no-store'});fs.createReadStream(file).pipe(response);
}
function runBrowser(executable,url,userDataDir){return new Promise((resolve,reject)=>{const child=spawn(executable,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-crash-reporter','--disable-background-networking','--disable-component-update','--no-first-run',`--user-data-dir=${userDataDir}`,'--dump-dom','--virtual-time-budget=12000',url],{stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);child.on('error',reject);child.on('close',code=>resolve({code,stdout,stderr}));});}

test('SOLFIT-6949-04 actual browser renders immediate header/body/progress parity and failure rollback',{timeout:90000},async()=>{
  const executable=browserPath();assert.ok(executable,'Chrome or Edge is required for the permanent Solution Fit browser regression.');
  const server=http.createServer(serveFile);await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const userDataDir=fs.mkdtempSync(path.join(os.tmpdir(),'ci-v6949-browser-'));
  try{
    const address=server.address(),url=`http://127.0.0.1:${address.port}/test/browser/v6949-solution-fit-header-sync.html`,result=await runBrowser(executable,url,userDataDir);
    assert.equal(result.code,0,result.stderr.slice(-2000));
    assert.match(result.stdout,/PASS v6\.9\.49 Solution Fit header synchronization/);
    assert.match(result.stdout,/Standard Package 15\/15\/15: PASS/);
    assert.match(result.stdout,/Save failure rollback: PASS/);
  }finally{await new Promise(resolve=>server.close(resolve));await new Promise(resolve=>setTimeout(resolve,250));try{fs.rmSync(userDataDir,{recursive:true,force:true});}catch(_){/* Browser profile cleanup can lag behind process exit on Windows. */}}
});

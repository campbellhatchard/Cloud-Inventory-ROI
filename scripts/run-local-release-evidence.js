'use strict';

/* Local evidence runner used when the desktop runtime does not include npm.
   It executes the exact Node commands declared by the package scripts and
   records missing npm/PostgreSQL gates as NOT TESTED, never PASS. CI continues
   to use run-release-gates.js with npm and disposable PostgreSQL 16. */
const {spawnSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),pkg=require('../package.json'),lineage=require('../release-lineage.json');

function parse(output=''){
  const sum=label=>[...output.matchAll(new RegExp(`^(?:#|ℹ) ${label} (\\d+)$`,'gm'))].reduce((n,m)=>n+Number(m[1]),0);
  const legacy=[...output.matchAll(/🟢 (\d+) passed, 0 failed/g)].reduce((n,m)=>n+Number(m[1]),0);
  return{passed:sum('pass'),failed:sum('fail'),skipped:sum('skipped'),legacyAssertionChecksPassed:legacy};
}
function tokens(command){return command.match(/"[^"]*"|'[^']*'|\S+/g).map(x=>x.replace(/^(['"])(.*)\1$/,'$2'));}
function runNodeCommand(command){const parts=tokens(command);if(parts.shift()!=='node')throw Error(`Unsupported local gate command: ${command}`);return spawnSync(process.execPath,parts,{cwd:root,encoding:'utf8',env:process.env,maxBuffer:64*1024*1024,shell:false});}
function runPackageScript(name){const started=Date.now();let output='',exitCode=0;for(const command of pkg.scripts[name].split(/\s*&&\s*/)){const p=runNodeCommand(command);output+=String(p.stdout||'')+String(p.stderr||'');if(p.status!==0){exitCode=Number.isInteger(p.status)?p.status:1;break;}}return{...parse(output),executed:true,exitCode,durationMs:Date.now()-started,result:exitCode===0?'PASS':'FAIL'};}
function run(command){const started=Date.now(),p=runNodeCommand(command),output=String(p.stdout||'')+String(p.stderr||''),exitCode=Number.isInteger(p.status)?p.status:1;return{...parse(output),executed:true,exitCode,durationMs:Date.now()-started,result:exitCode===0?'PASS':'FAIL'};}
function npmVersion(){for(const bin of ['npm.cmd','npm']){const p=spawnSync(bin,['--version'],{encoding:'utf8',shell:false});if(p.status===0)return String(p.stdout).trim();}return null;}
function main(){
  const generatedAt=new Date().toISOString(),npm=npmVersion(),hasDatabase=Boolean(process.env.DATABASE_URL);
  const notTested=(name,command,count=1,reason='Required local dependency is unavailable.')=>({name,command,executed:false,exitCode:null,passed:0,failed:0,skipped:0,notTested:count,durationMs:0,result:'NOT TESTED',reason});
  const gates=[];
  gates.push(npm?notTested('production-dependencies','npm ci --omit=dev --no-audit --no-fund',1,'Dependency installation is reserved for the clean CI checkout.'):notTested('production-dependencies','npm ci --omit=dev --no-audit --no-fund',1,'npm is not installed in the local desktop runtime.'));
  gates.push(hasDatabase?notTested('postgres-integration','npm run test:postgres',5,'Use the disposable PostgreSQL certification workflow.'):notTested('postgres-integration','npm run test:postgres',5,'No safe disposable DATABASE_URL is available.'));
  gates.push({name:'full-test-suite',command:'npm test (exact package script executed command-by-command)',notTested:0,...runPackageScript('test')});
  gates.push({name:'production-locks',command:'npm run test:production-locks (exact package script executed command-by-command)',notTested:0,...runPackageScript('test:production-locks')});
  const routes=runPackageScript('test:routes');gates.push({name:'routes',command:'npm run test:routes',notTested:hasDatabase?0:1,...routes,result:hasDatabase?routes.result:'NOT TESTED'});
  gates.push({name:'brand-tests',command:'npm run test:brand',notTested:0,...runPackageScript('test:brand')});
  for(const [name,command] of [['lineage','node scripts/check-release-lineage.js'],['active-output-audit','node scripts/audit-active-output-paths.js'],['brand-assets','node scripts/generate-brand-assets.js --check'],['application-knowledge','node scripts/generate-application-knowledge.js --check'],['active-output-runtime-matrix','node --test test/output-runtime-matrix.test.js']])gates.push({name,command,notTested:0,...run(command)});
  const postgres={release:pkg.version,generatedAt,databaseUrlPresent:hasDatabase,databaseName:null,postgresqlVersion:'NOT TESTED',node:process.version,migration:{executed:false,exitCode:null,result:'NOT TESTED'},command:'npm run test:postgres',suites:['test/routes.test.js','test/v653-postgres-integration.test.js','test/v663-postgres-authorization.test.js','test/v664-postgres-product-identity.test.js','test/v6930-postgres-value-application.test.js'],passed:0,failed:0,skipped:0,notTested:5,durationMs:0,result:'NOT TESTED',reason:'No safe disposable DATABASE_URL was available; CI PostgreSQL 16 certification remains mandatory.'};
  fs.writeFileSync(path.join(root,`POSTGRES_INTEGRATION_RESULTS_v${pkg.version}.json`),JSON.stringify(postgres,null,2)+'\n');
  const result={release:pkg.version,baseline:{archive:lineage.parentArchive,sha256:lineage.parentSha256},generatedAt,environment:{node:process.version,npm:npm||'NOT TESTED',platform:`${process.platform}-${process.arch}`,databaseAvailable:hasDatabase,databaseIntegrationRequired:false,nodeEnv:process.env.NODE_ENV||'test'},gates,postgresIntegration:postgres,summary:{executedGatesPassed:gates.filter(x=>x.executed).every(x=>x.exitCode===0),failedGates:gates.filter(x=>x.executed&&x.exitCode!==0).map(x=>x.name),databaseDependentTests:'NOT TESTED',dependencyInstall:npm?'NOT TESTED — clean CI only':'NOT TESTED — npm unavailable',productionClassification:'UNASSIGNED — Product Owner decision after CI and Render validation'}};
  fs.writeFileSync(path.join(root,`RELEASE_GATE_RESULTS_v${pkg.version}.json`),JSON.stringify(result,null,2)+'\n');
  if(!result.summary.executedGatesPassed)process.exitCode=1;
}
main();

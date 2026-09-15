'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),json=f=>JSON.parse(read(f));
const lineage=json('release-lineage.json'),policy=json('config/product-owner-baseline.json'),pkg=json('package.json'),permanent=json('config/permanent-release-tests.json');
const failures=[];
const check=(condition,message)=>{if(!condition)failures.push(message);};
check(lineage.applicationVersion===pkg.version,'package version and release-lineage applicationVersion disagree');
for(const key of ['parentVersion','parentArchive','parentSha256'])check(String(lineage[key]).toLowerCase()===String(policy[key]).toLowerCase(),`declared ${key} does not match the Product Owner baseline`);
check(lineage.roiModelVersion===28,'ROI model lineage must remain 28');
const manifest=`RELEASE_MANIFEST_v${pkg.version}.md`;check(fs.existsSync(path.join(root,manifest)),`missing ${manifest}`);
if(fs.existsSync(path.join(root,manifest))){const m=read(manifest);check(m.includes(lineage.parentArchive),'release manifest parent archive disagrees with lineage');check(m.toLowerCase().includes(lineage.parentSha256.toLowerCase()),'release manifest parent SHA disagrees with lineage');}
const contract=read('BUILD_GOVERNANCE_CONTRACT.md');
check(!/ONLY authorized source package[\s\S]{0,120}v\d+\.\d+\.\d+/i.test(contract),'permanent governance contract contains a hard-coded historical baseline');
for(const entry of permanent.tests||[])check(fs.existsSync(path.join(root,entry.path)),`permanent regression test missing: ${entry.invariant} (${entry.path})`);
for(const required of ['migrations/036_solution_fit_cross_account.sql','src/routes/solution-fit-customers.js','public/solution-fit-picker.js','scripts/production-output-dependencies.js','test/solution-fit-authorization-behavior.test.js','test/v694-executive-narrative-governance.test.js','test/v696-rep-confirmed.test.js'])check(fs.existsSync(path.join(root,required)),`required inherited invariant missing: ${required}`);
const allScripts=Object.values(pkg.scripts||{}).join(' ');for(const entry of permanent.tests||[])check(allScripts.includes(entry.path),`permanent test is not wired into a package gate: ${entry.path}`);
if(failures.length){for(const f of failures)console.error('FAIL',f);process.exit(1);}console.log(`Release lineage ${pkg.version} verified; ${permanent.tests.length} permanent protections registered.`);

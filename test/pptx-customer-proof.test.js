'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','public','pptx-export.js'),'utf8');
const projection=fs.readFileSync(path.join(__dirname,'..','src','shared','pptx-context.js'),'utf8');
test('legacy customer stories remain removed',()=>{['Womble Company','Old Dutch Foods','Domtar','Tracked 57K miles of pipe with zero loss','Hundreds of thousands saved in TCO'].forEach(x=>assert.equal(source.includes(x),false,x));});
test('PowerPoint obtains proof through customer-safe scenario projection',()=>{assert.match(source,/pptx-context/);assert.match(projection,/resolveApproved/);assert.match(projection,/customerProof:proof/);assert.doesNotMatch(source,/selectedCustomerProofRecords|useLegacyStories/);});
test('proof slide is conditional, capped, and uses safe fields',()=>{assert.match(source,/customerProof\|\|\[\]\)\.length/);assert.match(source,/customerProof\.slice\(0,3\)/);['displayName','headline','result','metric','sourceDisplay'].forEach(k=>assert.match(source,new RegExp('p\\.'+k)));});
test('deck metadata preserves proof ids and revisions',()=>{assert.match(source,/pptx\.subject/);assert.match(source,/p\.id\+' @ revision '\+p\.revision/);});
test('proof does not enter ROI or Buyer Evidence calculations',()=>{for(const f of ['src/shared/roi-engine.js','src/shared/criterion-evidence.js','src/shared/roi-maturity.js','src/shared/buyer-commitment.js'])assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),/approvedProof|Customer Proof slide/);});

'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'public','discovery.js'),'utf8');
const summaryAuthority=require('../public/prospect-evidence-summary');

function row(index,status,currentValue=index,submittedValue=index){
  return {
    canonicalInput:'input'+index,
    status,
    currentValue,
    event:{id:'event'+index,normalized_value:submittedValue}
  };
}

test('server-owned review status produces one count even when equal values still need provenance application',()=>{
  const rows=[];
  for(let index=1;index<=7;index+=1)rows.push(row(index,'APPLIED'));
  for(let index=8;index<=22;index+=1)rows.push(row(index,'AVAILABLE',index,index+100));
  rows.push(row(23,'AVAILABLE',125000,125000));
  rows.push(row(24,'AVAILABLE',10,10));
  const summary=summaryAuthority.summarize({rows});
  assert.deepEqual(summary,{
    mappedCount:24,
    appliedCount:7,
    pendingReviewCount:17,
    pendingCanonicalInputs:Array.from({length:17},(_,offset)=>'input'+(offset+8))
  });
  assert.equal(summaryAuthority.pendingMessage(summary),'17 prospect-verified values have not been applied to this working business case.');
});

test('missing review data and non-actionable rows do not create false pending warnings',()=>{
  assert.deepEqual(summaryAuthority.summarize(null),{mappedCount:0,appliedCount:0,pendingReviewCount:0,pendingCanonicalInputs:[]});
  const summary=summaryAuthority.summarize({rows:[row(1,'NO_VERIFIED_EVENT'),row(2,'CONFLICT'),row(3,'READ_ONLY'),row(4,'PREVIOUSLY_APPLIED')]});
  assert.equal(summary.pendingReviewCount,0);
  assert.equal(summaryAuthority.pendingMessage(summary),'');
});

test('Discovery and Calculator warnings consume the same summary and wording authority',()=>{
  assert.equal((source.match(/prospectEvidenceReviewSummary\(\)/g)||[]).length,3,'one definition and exactly two presentation calls are expected');
  assert.equal((source.match(/CIProspectEvidenceSummary\.pendingMessage/g)||[]).length,2,'both warning surfaces must use the same wording authority');
  assert.doesNotMatch(source,/Object\.keys\(latestSubmittedEvidence\.byInput/,'Discovery must not reconstruct pending status from a second browser-side join');
  assert.doesNotMatch(source,/mapped value[^\n]+not been applied/,'legacy count wording must not remain');
  const html=fs.readFileSync(path.join(root,'public','index.html'),'utf8');
  assert.ok(html.indexOf('<script src="prospect-evidence-summary.js"')<html.indexOf('<script src="discovery.js"'),'summary authority must load before its consumers');
});

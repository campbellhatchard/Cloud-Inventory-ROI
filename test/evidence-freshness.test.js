const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {EVIDENCE_AGING_THRESHOLD,evaluateEvidenceFreshness,validateEvidenceDate}=require('../src/shared/evidence-freshness');

const now='2026-08-30';
test('evidenceDate wins over a recent updatedAt timestamp',()=>{
  const result=evaluateEvidenceFreshness({evidenceDate:'2026-05-22',freshnessDays:60,now,updatedAt:'2026-08-30T12:00:00Z'});
  assert.equal(result.ageDays,100);assert.equal(result.status,'Stale');
});
test('recent evidence remains Current despite an old edit timestamp',()=>{
  const result=evaluateEvidenceFreshness({evidenceDate:'2026-08-20',freshnessDays:60,now,updatedAt:'2026-05-22T12:00:00Z'});
  assert.equal(result.ageDays,10);assert.equal(result.status,'Current');
});
test('editing stale evidence without changing Evidence Date does not refresh it',()=>{
  const before=evaluateEvidenceFreshness({evidenceDate:'2026-05-22',freshnessDays:60,now});
  const after=evaluateEvidenceFreshness({evidenceDate:'2026-05-22',freshnessDays:60,now,updatedAt:'2026-08-30T23:59:59Z'});
  assert.equal(before.status,'Stale');assert.equal(after.status,'Stale');assert.equal(after.ageDays,100);
});
test('intentional customer revalidation with a new Evidence Date refreshes evidence',()=>{
  assert.equal(evaluateEvidenceFreshness({evidenceDate:'2026-05-22',freshnessDays:60,now}).status,'Stale');
  assert.equal(evaluateEvidenceFreshness({evidenceDate:now,freshnessDays:60,now}).status,'Current');
});
test('Aging begins after the centralized final-20-percent threshold',()=>{
  assert.equal(EVIDENCE_AGING_THRESHOLD,.8);
  const result=evaluateEvidenceFreshness({evidenceDate:'2026-07-12',freshnessDays:60,now});
  assert.equal(result.ageDays,49);assert.equal(result.agingAfterDays,48);assert.equal(result.status,'Aging');
});
test('legacy saved evidence without Evidence Date needs review and never uses updatedAt',()=>{
  const result=evaluateEvidenceFreshness({freshnessDays:60,now,updatedAt:'2026-08-30T12:00:00Z'});
  assert.equal(result.status,'Needs Review');assert.equal(result.ageDays,null);assert.match(result.reason,/not recorded/);
});
test('future and malformed Evidence Dates are rejected server-side',()=>{
  assert.match(validateEvidenceDate('2026-08-31',{now}).error,/cannot be in the future/);
  for(const value of ['abc','2026-99-99','August 30','2026-02-30'])assert.match(validateEvidenceDate(value,{now}).error,/valid date/);
});
test('date-only age calculation is timezone-independent and exact at boundaries',()=>{
  assert.equal(evaluateEvidenceFreshness({evidenceDate:'2026-06-01',freshnessDays:60,now:'2026-07-01'}).ageDays,30);
  assert.equal(evaluateEvidenceFreshness({evidenceDate:'2026-06-01',freshnessDays:60,now:new Date('2026-07-01T23:59:59Z')}).ageDays,30);
});
test('stage readiness exposes rich details and blocks Stale and Needs Review saved evidence',()=>{
  const readiness=fs.readFileSync(path.join(__dirname,'..','src','shared','stage-readiness-service.js'),'utf8');
  const service=fs.readFileSync(path.join(__dirname,'..','src','shared','criterion-evidence.js'),'utf8');
  assert.match(readiness,/evaluateCriterionEvidence/);assert.match(service,/evidenceAgeDays:s\.freshness\.ageDays/);assert.match(service,/freshnessReason:s\.freshness\.reason/);
  assert.match(service,/freshness\.status==='Stale'&&'Evidence is stale\.'/);assert.match(service,/freshness\.status==='Needs Review'&&'Evidence Date needs review\.'/);
  assert.doesNotMatch(readiness+service,/saved\.updatedAt\?Math\.floor/);
});

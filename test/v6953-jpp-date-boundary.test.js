'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const JSZip = require('jszip');

const root = path.join(__dirname, '..');
const dateOnly = require('../src/shared/date-only');
const browserDateOnly = require('../public/jpp-date-only');
const { buildJppPdf } = require('../src/exports/operational-pdf');
const { buildJppPptx } = require('../src/exports/operational-pptx');

const plan = {
  id: 'v6953-plan', company: 'Date Boundary Customer', title: 'Date Boundary Plan',
  target_close_date: '2027-03-31', groups: [{ id: 'g1', name: 'Validate' }],
  milestones: Array.from({ length: 14 }, (_, index) => ({
    id: `m${index + 1}`, groupId: 'g1', phase: 'Validate', title: `Milestone ${index + 1}`,
    owner: index % 2 ? 'joint' : 'rep', status: index < 3 ? 'done' : 'pending',
    dueDate: index === 0 ? '2027-03-14' : `2027-04-${String(index + 1).padStart(2, '0')}`
  }))
};

function nodeProbe(source, timeZone = 'UTC') {
  const result = spawnSync(process.execPath, ['-e', source], {
    cwd: root, encoding: 'utf8', env: { ...process.env, TZ: timeZone }
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
}

test('actual pg default fixture is Date-shaped before the application boundary correction', () => {
  const observed = nodeProbe("const{types}=require('pg');const v=types.getTypeParser(1082)('2027-03-31');console.log(JSON.stringify({isDate:v instanceof Date,json:JSON.stringify(v)}));", 'America/Chicago');
  assert.equal(observed.isDate, true);
  assert.match(observed.json, /T05:00:00\.000Z/);
  assert.equal(dateOnly.normalizeDateOnly(new Date('2027-03-31T05:00:00.000Z')), null, 'strict domain normalizer must not hide a Date-object boundary defect');
});

test('application pg DATE parser returns the exact calendar string and never a Date instance', () => {
  const observed = nodeProbe("require('./src/db');const{types}=require('pg');const v=types.getTypeParser(1082)('2027-03-31');console.log(JSON.stringify({oid:types.builtins.DATE,isDate:v instanceof Date,value:v}));");
  assert.deepEqual(observed, { oid: 1082, isDate: false, value: '2027-03-31' });
  assert.equal(dateOnly.normalizeDateOnly(observed.value), '2027-03-31');
});

test('shared server and browser date-only contracts are calendar-safe across edge cases', () => {
  const cases = new Map([
    ['2027-03-31', 'Mar 31, 2027'], ['2027-03-14', 'Mar 14, 2027'],
    ['2027-11-07', 'Nov 7, 2027'], ['2027-01-01', 'Jan 1, 2027'],
    ['2027-12-31', 'Dec 31, 2027'], ['2028-02-29', 'Feb 29, 2028']
  ]);
  for (const [input, expected] of cases) {
    assert.equal(dateOnly.normalizeDateOnly(input), input);
    assert.equal(dateOnly.formatDateOnlyDisplay(input), expected);
    assert.equal(browserDateOnly.normalizeDateOnly(input), input);
    assert.equal(browserDateOnly.formatDateOnly(input), expected);
  }
  for (const invalid of [null, undefined, '', '2027-02-29', '2027-02-31', '2027-03-31T00:00:00.000Z', new Date()]) {
    assert.equal(dateOnly.normalizeDateOnly(invalid), null, String(invalid));
    assert.equal(dateOnly.formatDateOnlyDisplay(invalid), '', String(invalid));
  }
});

test('date-only display is identical in the required timezone matrix', () => {
  const script = "const d=require('./src/shared/date-only');console.log(JSON.stringify({value:d.formatDateOnlyDisplay('2027-03-31'),dstStart:d.formatDateOnlyDisplay('2027-03-14'),dstEnd:d.formatDateOnlyDisplay('2027-11-07')}));";
  for (const zone of ['UTC', 'America/Chicago', 'America/Los_Angeles', 'America/New_York']) {
    assert.deepEqual(nodeProbe(script, zone), { value: 'Mar 31, 2027', dstStart: 'Mar 14, 2027', dstEnd: 'Nov 7, 2027' }, zone);
  }
});

test('actual internal and customer PDFs contain the governed date and no timestamp leak', () => {
  for (const audience of ['internal', 'customer']) {
    const pdf = buildJppPdf(plan, { audience });
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    const text = pdf.toString('latin1');
    assert.match(text, /Target close date: Mar 31, 2027/, audience);
    assert.match(text, /Milestone 1 \| rep \| Mar 14, 2027/, audience);
    assert.doesNotMatch(text, /2027-03-31T|Wed Mar|GMT|UTC|Mar 30, 2027/, audience);
  }
});

test('actual internal and customer PPTX OOXML contain the governed date with year', async () => {
  for (const audience of ['internal', 'customer']) {
    const pptx = await buildJppPptx(plan, { audience });
    assert.equal(pptx.subarray(0, 2).toString(), 'PK');
    const zip = await JSZip.loadAsync(pptx);
    const slides = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    const xml = (await Promise.all(slides.map(name => zip.file(name).async('string')))).join('\n');
    assert.match(xml, /Target close Mar 31, 2027/, audience);
    assert.match(xml, /Mar 14, 2027/, audience);
    assert.doesNotMatch(xml, /2027-03-31T|Wed Mar 31|Mar 30, 2027/, audience);
  }
});

test('JPP production consumers use canonical date-only contracts without masking or truncation', () => {
  const map = fs.readFileSync(path.join(root, 'public/map.js'), 'utf8');
  const publicPlan = fs.readFileSync(path.join(root, 'public/prospect-map.html'), 'utf8');
  const print = fs.readFileSync(path.join(root, 'public/deal-export.js'), 'utf8');
  const pdf = fs.readFileSync(path.join(root, 'src/exports/operational-pdf.js'), 'utf8');
  const pptx = fs.readFileSync(path.join(root, 'src/exports/operational-pptx.js'), 'utf8');
  assert.doesNotMatch(map, /target_close_date\s*\?\s*String\([^)]*target_close_date[^)]*\)\.split/);
  assert.doesNotMatch(publicPlan, /String\(m\.dueDate\)\.split/);
  assert.match(print, /CIJppDateOnly\.formatDateOnly/);
  assert.match(pdf, /formatDateOnlyDisplay\(plan\.target_close_date\)/);
  assert.match(pptx, /formatDateOnlyDisplay\(plan\.target_close_date\)/);
  assert.doesNotMatch(pptx, /String\(plan\.target_close_date\)\.slice/);
});

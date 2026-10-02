'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');

const source=fs.readFileSync(path.join(__dirname,'..','public','executive-story.js'),'utf8');

test('Executive readiness modal is visibly opened',()=>{
  assert.match(source,/m\.className='modal-overlay open'/);
  assert.doesNotMatch(source,/m\.className='modal-overlay';/);
});

test('Executive readiness modal closes an existing workflow before opening another',()=>{
  const showStart=source.indexOf('function show(');
  const guardStart=source.indexOf('async function guard(',showStart);
  const showBlock=source.slice(showStart,guardStart);
  assert.match(showBlock,/close\(false\);window\._executiveReadinessResolve=resolve/);
  assert.ok(showBlock.indexOf('close(false)') < showBlock.indexOf("m.id='executiveReadinessModal'"));
});

test('Executive export deadline remains downstream of readiness choice',()=>{
  const adapters=fs.readFileSync(path.join(__dirname,'..','public','executive-output-adapters.js'),'utf8');
  for(const [owner,label,next] of [
    ['window.exportToPowerPoint=async function','PowerPoint','window.downloadPDF=async function'],
    ['window.downloadPDF=async function','PDF','window.exportExecutiveWord=async function']
  ]){
    const start=adapters.indexOf(owner),end=adapters.indexOf(next,start),block=adapters.slice(start,end);
    assert.ok(block.indexOf('guardExecutiveOutput(') < block.indexOf(`withExecutiveExportDeadline('${label}'`));
  }
});

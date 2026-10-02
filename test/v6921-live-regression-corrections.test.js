'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const JSZip=require('jszip');
const {buildJppPptx}=require('../src/exports/operational-pptx');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('Executive export deadline begins after governed readiness choice',()=>{
  const src=read('public/executive-output-adapters.js');
  for(const [name,deadline] of [['pptx','PowerPoint'],['pdf','PDF']]){
    const start=src.indexOf(name==='pptx'?'window.exportToPowerPoint=async function':'window.downloadPDF=async function');
    const end=src.indexOf(name==='pptx'?'window.downloadPDF=async function':'window.exportExecutiveWord=async function',start);
    const block=src.slice(start,end);
    assert.ok(block.indexOf(`guardExecutiveOutput('${name}'`) < block.indexOf(`withExecutiveExportDeadline('${deadline}'`));
  }
});

test('Stakeholder Map trusts the selected authorized scenario customer',()=>{
  const src=read('public/stakeholders.js');
  assert.match(src,/if\(activeScenarioCompany\)_stakeCompany=activeScenarioCompany/);
  assert.doesNotMatch(src,/activeScenarioCompany&&getCompanies\(\)\.some/);
});

test('Christie recommends an action rather than claiming an unmet champion is complete',()=>{
  const src=read('public/deal-coach.js');
  assert.match(src,/'A champion is mapped':'Map and validate a champion'/);
  assert.match(src,/mandatory criteria incomplete/);
});

test('legacy default plan names render as Joint Project Plan in browser and PPTX',async()=>{
  const map=read('public/map.js'),print=read('public/deal-export.js');
  assert.match(map,/replace\(\/\^Mutual Action Plan\\b\/i, 'Joint Project Plan'\)/);
  assert.match(print,/replace\(\/\^Mutual Action Plan\\b\/i,'Joint Project Plan'\)/);
  const buffer=await buildJppPptx({company:'Acme',title:'Mutual Action Plan — Acme',milestones:[]},{audience:'customer'});
  const zip=await JSZip.loadAsync(buffer);
  const xml=(await Promise.all(Object.keys(zip.files).filter(x=>/^ppt\/slides\/slide\d+\.xml$/.test(x)).map(x=>zip.file(x).async('string')))).join('\n');
  assert.match(xml,/Joint Project Plan/);
  assert.doesNotMatch(xml,/Mutual Action Plan/);
});

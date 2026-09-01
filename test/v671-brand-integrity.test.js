'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const brand=require('../src/shared/brand-system');

test('v6.7.1+ extends Brand System v1.0 without changing ROI Model v2.8',()=>{
  assert.match(require('../package.json').version,/^6\.(?:7\.[1-9]\d*|8\.\d+)$/);
  assert.equal(brand.brandVersion,'1.0');
  assert.equal(brand.document.logoRole,'logoOfficeHighResolution');
  assert.equal(brand.logos.logoOfficeHighResolution.intrinsicWidth,1000);
  assert.equal(brand.logos.logoOfficeHighResolution.intrinsicHeight,349);
  assert.equal(brand.typography.officePrimary,'Inter');
  assert.equal(brand.typography.officeFallback,'Arial');
  assert.ok(brand.colors.neutral.neutral800);
  assert.match(read('src/shared/roi-engine.js'),/modelVersion\s*>=\s*28/);
});

test('Word battlecard and proposal routes use shared document roles',()=>{
  const src=read('server.js');
  for(const marker of ["brand.documentTheme('internal')","brand.documentTheme('customer')",'ImageRun','wordBrand.footer','wordBrand.logoAspect']) assert.match(src,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  const relevant=src.slice(src.indexOf("'/api/competitive/export-word'"),src.indexOf("'/api/proposals/:scenarioId/export/docx'"));
  assert.doesNotMatch(relevant,/Calibri|Aptos|#00A9CC|#00AECF|#1E2931/);
});

test('browser documents, Solution Fit and email consume shared themes',()=>{
  assert.match(read('public/deal-export.js'),/CIBrand\.documentTheme|CIBrand\.documentCss/);
  assert.match(read('public/solution-fit.js'),/CIBrand\.documentTheme|CIBrand\.documentCss/);
  assert.doesNotMatch(read('public/solution-fit.js'),/Aptos|Calibri|#00AECF/);
  assert.match(read('src/email.js'),/brand\.emailTheme\(\)/);
  assert.doesNotMatch(read('src/email.js'),/#00AECF|#00A9CC|#1E2931|font-family:\s*Arial/);
});

test('active UI and output code contains no direct governed logo filenames',()=>{
  const files=[];
  function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(?:html|js)$/.test(e.name)&&e.name!=='brand-system.js')files.push(p);}}
  walk(path.join(root,'public'));
  const hits=files.filter(f=>/ci-logo-(?:negative|full-color|pptx)\.png|ci-logo\.png/.test(fs.readFileSync(f,'utf8')));
  assert.deepEqual(hits.map(f=>path.relative(root,f)),[]);
});

test('standalone pages cannot shadow canonical brand variables with literals',()=>{
  const pages=['login','reset-password','change-password','business-case','prospect','prospect-map','print'];
  for(const name of pages){const src=read(`public/${name}.html`);assert.match(src,/brand-tokens\.css/);assert.match(src,/brand-system\.js/);assert.doesNotMatch(src,/--(?:navy|cyan|green|red|font)\s*:\s*(?:#|'Inter')/i,name);}
});

test('customer and internal audience labels remain exact and centralized',()=>{
  assert.equal(brand.audiences.customer.confidentiality,'Confidential and Proprietary');
  assert.equal(brand.audiences.internal.confidentiality,'Confidential - Internal Use Only');
  assert.match(read('public/print.html'),/CIBrand\.audience\('customer'\)/);
  assert.match(read('public/deal-export.js'),/theme\.footer/);
});

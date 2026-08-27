const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'style.css'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const pptxExport = fs.readFileSync(path.join(root, 'public', 'pptx-export.js'), 'utf8');
const dealExport = fs.readFileSync(path.join(root, 'public', 'deal-export.js'), 'utf8');
const solutionFit = fs.readFileSync(path.join(root, 'public', 'solution-fit.js'), 'utf8');
const compResearch = fs.readFileSync(path.join(root, 'public', 'comp-research.js'), 'utf8');
const prospect = fs.readFileSync(path.join(root, 'public', 'prospect.html'), 'utf8');
const { readiness } = require(path.join(root, 'src', 'shared', 'handoff-readiness.js'));
const { calcROI } = require(path.join(root, 'src', 'shared', 'roi-engine.js'));

test('all inline application scripts parse', () => {
  const scripts = [...index.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length > 0, 'expected inline scripts in index.html');
  scripts.forEach((match, i) => {
    assert.doesNotThrow(() => new vm.Script(match[1], { filename: `index-inline-${i + 1}.js` }));
  });
});


test('all inline prospect-link scripts parse', () => {
  const scripts = [...prospect.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length > 0, 'expected inline scripts in prospect.html');
  scripts.forEach((match, i) => {
    assert.doesNotThrow(() => new vm.Script(match[1], { filename: `prospect-inline-${i + 1}.js` }));
  });
});

test('recovered UI components retain their base styles', () => {
  for (const selector of ['.conf-header', '.conf-bar-track', '.conf-chip', '.sens-chart', '.stage-filter-btn', '.analytics-card', '.scenario-mode-bar']) {
    assert.ok(css.includes(selector), `missing ${selector} styles`);
  }
  assert.match(css, /\.analytics-grid\{display:grid;/);
  assert.match(css, /\.sidebar\.open\{transform:translateX\(0\)/);
  assert.match(css, /\.lb-cell-secondary\{display:none;/);
  assert.doesNotMatch(css, /^\s*--livebar-h:/m, 'custom property must be scoped to a selector');
});

test('confidence card is explicitly identified in calculator markup', () => {
  assert.match(index, /class="card confidence-card"[\s\S]*?id="confidencePanel"/);
});

test('PowerPoint runtime loads JSZip first and normalizes the browser constructor', () => {
  assert.ok(index.indexOf('<script src="/jszip.min.js">') < index.indexOf('<script src="/pptxgen.min.js">'));
  assert.match(server, /app\.get\('\/jszip\.min\.js'/);
  assert.match(pptxExport, /window\.PptxGenJS/);
  assert.match(pptxExport, /window\.pptxgen = window\.PptxGenJS/);
  assert.match(pptxExport, /async function ensurePptxReady\(\)/);
  assert.match(pptxExport, /if \(!\(await ensurePptxReady\(\)\)\) return;/);
  assert.match(dealExport, /await ensurePptxReady\(\)/);
});

test('PowerPoint-only colors use PptxGenJS hex values', () => {
  assert.doesNotMatch(dealExport, /color:'rgba\(255,255,255/);
  assert.doesNotMatch(dealExport, /color:'#(?:FFFFFF|0089A6|2E7D32|45688A|6A4C93|1E2931|FFF0EB|C24A1E)'/);
  assert.match(pptxExport, /GRAY_LT:\s+'E0E4E8'/);
});

test('narrative action labels contain real icons, not escaped code text', () => {
  assert.match(index, />↺ Reset<\/button>/);
  assert.match(index, />✨ AI enhance<\/button>/);
  assert.doesNotMatch(index, /\\u21ba|\\u2728/);
});

test('Solution Fit provides rapid-entry defaults and exception controls', () => {
  assert.match(solutionFit, /SOLUTION_TEMPLATES/);
  assert.match(solutionFit, /Refresh known data/);
  assert.match(solutionFit, /Show missing only/);
  assert.match(solutionFit, /data-sfownerselect/);
  assert.match(solutionFit, /sf-process-table/);
  assert.match(solutionFit, /bulkDemo/);
  assert.match(solutionFit, /e\.key\.toLowerCase\(\)==='s'/);
  assert.match(solutionFit, /opportunity\.locations/);
});

test('Solution Fit readiness rejects an empty products array and accepts entered locations', () => {
  const state = {
    opportunity: { customer:'Acme', solutionEngineer:'SE', products:[], locations:'3 sites', users:'25', problem:'Manual work', outcome:'Real-time visibility' },
    architecture: { relationship:'Standalone', erp:'SAP', version:'S/4' },
    partner: { involved:'No' },
    processes: [{ name:'Receiving', selected:true, demoStatus:'Demonstrated', fit:'Full fit' }],
    gaps: []
  };
  const result = readiness(state);
  assert.ok(result.miss.some(x => x.label === 'Cloud Inventory product(s)'));
  assert.ok(!result.miss.some(x => x.label === 'Locations / operating scope'));
});

test('AI competitive research carries the selected product and competitor from Battlecard', () => {
  assert.match(compResearch, /_syncBattlecardResearchContext\(\)/);
  assert.match(compResearch, /Mobile Enterprise Platform \(MEP\)/);
  assert.match(compResearch, /type: 'battlecard'/);
  assert.match(compResearch, /_researchCompetitorOptions\(\)/);
  assert.match(compResearch, /key === ctx\.competitorKey \? ' selected'/);
  assert.match(compResearch, /ciSourceOverride:\s+ciOverride/);
  assert.match(compResearch, /mep_rfgen:'https:\/\/www\.rfgen\.com\/'/);
});


test('protected server routes cannot reference requireAuth before initialization', () => {
  const decl = "const { requireAuth } = require('./src/middleware/auth');";
  const declPos = server.indexOf(decl);
  assert.ok(declPos >= 0, 'missing canonical requireAuth declaration');
  assert.equal((server.match(/const \{ requireAuth \} = require\('\.\/src\/middleware\/auth'\);/g) || []).length, 1,
    'requireAuth must be declared exactly once');
  assert.doesNotMatch(server, /_reqAuthCompanies/, 'legacy auth alias must not reappear');
  const routeUse = /app\.(?:get|post|put|patch|delete)\([^\r\n]*requireAuth/g;
  for (const match of server.matchAll(routeUse)) {
    assert.ok(match.index > declPos, `protected route references requireAuth before declaration: ${match[0]}`);
  }
});

test('ROI output surfaces preserve explicit zero ramps and field-inventory property names', () => {
  const printHtml = fs.readFileSync(path.join(root, 'public', 'print.html'), 'utf8');
  const execInfographics = fs.readFileSync(path.join(root, 'public', 'exec-infographics.js'), 'utf8');
  assert.match(printHtml, /const normalizeRamp=\(val,dflt\)=>/);
  assert.doesNotMatch(printHtml, /healRamp/);
  assert.match(dealExport, /v\.ramp1 \?\? 0\.4/);
  assert.doesNotMatch(dealExport, /v\.ramp1\|\|0\.4/);
  assert.match(execInfographics, /r\.fieldInvSav/);
  assert.doesNotMatch(execInfographics, /fieldLeverSav/);
});

test('turns savings are not mislabeled as balance-sheet working capital', () => {
  const printHtml = fs.readFileSync(path.join(root, 'public', 'print.html'), 'utf8');
  assert.match(dealExport, /Inventory turns — annual carrying savings/);
  assert.match(pptxExport, /Turns Carrying Savings/);
  assert.match(printHtml, /Turns carrying savings/);
  assert.match(prospect, /label:'Inventory carrying \/ turns',\s+sav:'inventoryCarrySav'/);
  assert.doesNotMatch(prospect, /label:'Working capital freed',\s+sav:'turnsSav'/);
});

test('Medical Devices / Life Sciences remains customer-input-only', () => {
  const prospect = fs.readFileSync(path.join(root, 'public', 'prospect.html'), 'utf8');
  const industryData = fs.readFileSync(path.join(root, 'public', 'industry-data.js'), 'utf8');
  const provenance = fs.readFileSync(path.join(root, 'public', 'benchmark-provenance.js'), 'utf8');
  assert.match(industryData, /retail:\s+\{ labor:0,shrinkage:0,carrying:0,otif:0,it:0/);
  assert.match(prospect, /retail:\s+\{ revenue:0, users:0, labor:0, inventory:0/);
  assert.match(provenance, /Customer inputs required\./);
  assert.doesNotMatch(prospect, /retail:\s+\{ revenue:60e6/);
});

test('prospect live ROI excludes unsupported benchmark dollars and labels coverage accurately', () => {
  assert.match(prospect, /users:\s+answered\.userCount\s+\|\| 0/);
  assert.match(prospect, /inventory:\s+answered\.inventoryValue\s+\|\| 0/);
  assert.match(prospect, /revenue:\s+answered\.revenue\s+\|\| 0/);
  assert.match(prospect, /otifRisk:\s+0/);
  assert.match(prospect, /q\.syncConv === 'hoursPerWeek'/);
  assert.match(prospect, /laborWastePct:\s+\(answered\.laborWastePct \|\| 0\) \/ 100/);
  assert.match(prospect, /sav:'inventoryCarrySav'/);
  assert.match(prospect, />Data coverage</);
  assert.doesNotMatch(prospect, /More answers narrow the range/);

  const baseInput = {
    modelVersion:27, users:10, labor:52000, mLabor:.20, laborWastePct:0,
    effectiveShrinkBase:0, mShrinkage:.30, inventory:0, mCarrying:.20,
    carryRate:.25, invTurnsCurrent:0, invTurnsBenchmark:10,
    revenue:0, otifBaseline:0, otifTarget:0, mOtif:.10, otifRisk:0,
    itCost:0, mIt:.50, downtimeEventsYr:0, downtimeHrsPerEvent:0,
    downtimeCostPerHr:0, mDowntime:.30, expediteSpendYr:0, mExpedite:.25,
    countDaysYr:0, countPeople:0, mCount:.50, ordersPerYr:0,
    costPerOrder:0, pickRateGainPct:0, mThroughput:.30,
    orderErrorPct:0, costPerError:0, mAccuracy:.35,
    hasFieldInventory:false, fieldInvValue:0, fieldLeakageRate:0,
    fieldLocations:0, fieldReconcileCost:0, fieldReconcilePerYr:1,
    mFieldLeakage:.30, mFieldCount:.50, invest:90000, otc:0,
    discRate:.10, implMonths:3, ramp1:.40, ramp2:.75, ramp3:1
  };
  const base = calcROI(baseInput);
  const conservative = calcROI({...baseInput, mLabor:.14, mShrinkage:.21, mCarrying:.14, mOtif:.07, mIt:.35, mDowntime:.21, mExpedite:.175, mCount:.35, mThroughput:.21, mAccuracy:.245, mFieldLeakage:.21, mFieldCount:.35});
  assert.equal(base.annualBenefit, 104000);
  assert.equal(conservative.annualBenefit, 72800);
});

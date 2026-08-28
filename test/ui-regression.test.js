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
const mapEditor = fs.readFileSync(path.join(root, 'public', 'map.js'), 'utf8');
const prospectMap = fs.readFileSync(path.join(root, 'public', 'prospect-map.html'), 'utf8');
const mapRoutes = fs.readFileSync(path.join(root, 'src', 'routes', 'maps.js'), 'utf8');
const proposal = fs.readFileSync(path.join(root, 'public', 'proposal.js'), 'utf8');
const dealCoach = fs.readFileSync(path.join(root, 'public', 'deal-coach.js'), 'utf8');
const aiSession = fs.readFileSync(path.join(root, 'public', 'ai-session.js'), 'utf8');
const assistant = fs.readFileSync(path.join(root, 'public', 'assistant.js'), 'utf8');
const prospectAssistant = fs.readFileSync(path.join(root, 'public', 'prospect-assistant.js'), 'utf8');
const apiClient = fs.readFileSync(path.join(root, 'public', 'src', 'client', 'api.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const companies = fs.readFileSync(path.join(root, 'public', 'companies.js'), 'utf8');
const customerGate = fs.readFileSync(path.join(root, 'public', 'customer-gate.js'), 'utf8');
const ux = fs.readFileSync(path.join(root, 'public', 'ux-enhancements.js'), 'utf8');
const printView = fs.readFileSync(path.join(root, 'public', 'print.html'), 'utf8');
const narrative = fs.readFileSync(path.join(root, 'public', 'narrative.js'), 'utf8');
const scenarioRoutes = fs.readFileSync(path.join(root, 'src', 'routes', 'scenarios.js'), 'utf8');
const ciWorkflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'ci.yml'), 'utf8');
const mapMigration = fs.readFileSync(path.join(root, 'migrations', '023_map_groups.sql'), 'utf8');
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

test('all inline executive print scripts parse', () => {
  const scripts = [...printView.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length > 0, 'expected inline scripts in print.html');
  scripts.forEach((match, i) => {
    assert.doesNotThrow(() => new vm.Script(match[1], { filename: `print-inline-${i + 1}.js` }));
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


test('Joint Project Plans support ordered custom groupings and customer-ready value messaging', () => {
  assert.match(mapEditor, /function addMapGroup\(/);
  assert.match(mapEditor, /function removeMapGroup\(/);
  assert.match(mapEditor, /function moveMapGroup\(/);
  assert.match(mapEditor, /function moveMilestone\(/);
  assert.match(mapEditor, /function moveMilestoneToGroup\(/);
  assert.match(mapEditor, /id="mapAddGroup"/);
  assert.match(mapEditor, /id="mapAddPosition"/);
  assert.match(mapEditor, /groups:\s+_mapCurrent\.groups/);
  assert.match(mapRoutes, /m\.milestones, m\.groups/);
  assert.match(mapRoutes, /groups = COALESCE/);
  assert.match(dealExport, /deMapGroups\(m, ms\)/);
  assert.match(dealExport, /Joint Project Plan/);
  assert.match(dealExport, /Why we are sharing this plan/);
  assert.match(dealExport, /rowsPerSlide = 11/);
  assert.doesNotMatch(dealExport, /One slide per phase/);
  assert.match(prospectMap, /function planGroups\(ms\)/);
  assert.match(prospectMap, /Joint Project Plan/);
  assert.match(prospectMap, /Why we are sharing this plan/);
  assert.match(prospectMap, /Confidential and proprietary/);
  assert.match(prospectMap, /actions for your team/);
  assert.match(prospectMap, /aria-label=/);

  const start = prospectMap.indexOf('<script>') + '<script>'.length;
  const end = prospectMap.lastIndexOf('</script>');
  assert.doesNotThrow(() => new vm.Script(prospectMap.slice(start, end), { filename:'prospect-map-inline.js' }));
});

test('MAP grouping migration is additive and backwards-compatible', () => {
  assert.match(mapMigration, /ALTER TABLE mutual_action_plans/i);
  assert.match(mapMigration, /ADD COLUMN IF NOT EXISTS groups JSONB NOT NULL DEFAULT '\[\]'::jsonb/i);
  assert.doesNotMatch(mapMigration, /\bDROP\b/i);
  assert.doesNotMatch(mapMigration, /\bDELETE\b/i);
  assert.doesNotMatch(mapMigration, /\bTRUNCATE\b/i);
});

test('customer MAP attribute escaping handles quotes safely', () => {
  assert.match(prospectMap, /replace\(\/"\/g,'&quot;'\)/);
  assert.match(prospectMap, /replace\(\/'\/g,'&#39;'\)/);
});


test('Joint Project Plan customer purpose survives the live render and quote escaping stays safe', () => {
  const renderStart = prospectMap.indexOf("document.getElementById('content').innerHTML = `");
  assert.ok(renderStart >= 0, 'customer plan render template missing');
  const renderBlock = prospectMap.slice(renderStart, prospectMap.indexOf('`;', renderStart) + 2);
  assert.match(renderBlock, /Why we are sharing this plan/);
  assert.match(prospectMap, /replace\(\/"\/g,'&quot;'\)/);
  assert.match(prospectMap, /replace\(\/'\/g,'&#39;'\)/);
});

test('v5.6.10 confidentiality footers do not weaken ROI output semantics', () => {
  assert.match(dealExport, /Confidential and proprietary/);
  assert.match(pptxExport, /function pptConfidentialFooter\(/);
  assert.match(dealExport, /Inventory turns — annual carrying savings/);
  assert.match(pptxExport, /Turns Carrying Savings/);
  assert.match(dealExport, /v\.ramp1 \?\? 0\.4/);
});

test('CI retains UI and startup regression execution', () => {
  assert.match(ciWorkflow, /UI and startup regression tests/);
  assert.match(ciWorkflow, /node --test test\/ui-regression\.test\.js/);
});


test('v5.6.11 Executive Proposal uses authenticated AI and Word export contracts', () => {
  assert.match(index, /id="tab-proposal"/);
  assert.match(index, /<script src="proposal\.js"><\/script>/);
  assert.match(proposal, /apiFetch\('\/api\/enhance'/);
  assert.match(proposal, /messages:\s*\[\{\s*role:'user',\s*content:/);
  assert.doesNotMatch(proposal, /fetch\('\/api\/enhance'/);
  assert.match(proposal, /apiFetch\('\/api\/export\/proposal-docx'/);
  assert.doesNotMatch(proposal, /fetch\('\/api\/export\/proposal-docx'/);
  assert.match(proposal, /window\.proposalHasDraft/);
  assert.match(server, /app\.post\('\/api\/export\/proposal-docx', requireAuth,/);
  assert.match(server, /Executive-Proposal-\$\{safe\}\.docx/);
  assert.match(server, /Confidential and proprietary/);
});

test('v5.6.12 Deal Coach refreshes buyer context and opens Proposal safely', () => {
  assert.match(index, /id="nav-coach"/);
  assert.match(index, /id="tab-coach"/);
  assert.match(index, /<script src="deal-coach\.js"><\/script>/);
  assert.match(dealCoach, /async function refreshContext\(v\)/);
  assert.match(dealCoach, /apiFetch\('\/api\/maps\?all=true'\)/);
  assert.match(dealCoach, /\/api\/stakeholders/);
  assert.match(dealCoach, /function proposalReady\(\)/);
  assert.match(dealCoach, /n\.go==='proposal'\?'openProposal\(\)'/);
  assert.doesNotMatch(dealCoach, /n\.go==='proposal'\?'render\(\)'/);
  assert.match(dealCoach, /const safeCompany=esc\(company\), safeBenefit=esc\(money\(e\.benefit\)\), safeCost=esc\(money\(e\.cost\)\), safeNet=esc\(money\(e\.net\)\), safeRep=esc/);
  assert.doesNotMatch(dealCoach, /<textarea[^]*\$\{company\}/);
  assert.match(dealCoach, /\$\{safeCompany\} is evaluating Cloud Inventory/);
});

test('v5.6.11-v5.6.13 feature files preserve locked customer and ROI controls', () => {
  assert.match(index, /APP_VERSION="5\.7\.6"/);
  assert.match(proposal, /contractTerm:\s*\(v\.contractMonths \|\| 36\) \+ ' months'/);
  assert.match(proposal, /addDays\(30\)/);
  assert.match(dealCoach, /Joint Project Plan/);
  assert.match(dealCoach, /Champion kit/);
  assert.match(ciWorkflow, /UI and startup regression tests/);
  assert.match(prospectMap, /replace\(\/"\/g,'&quot;'\)/);
  assert.match(prospectMap, /replace\(\/'\/g,'&#39;'\)/);
});

test('v5.6.13 Christie AI Deal Coach uses authenticated deal context safely', () => {
  assert.match(dealCoach, /Christie, your AI Deal Coach/);
  assert.match(dealCoach, /async function ask\(question\)/);
  assert.match(dealCoach, /apiFetch\('\/api\/enhance'/);
  assert.doesNotMatch(dealCoach, /fetch\('\/api\/enhance'/);
  assert.match(dealCoach, /messages:prior\.concat\(\[\{role:'user',content:prompt\}\]\)/);
  assert.match(dealCoach, /proposalPrepared:proposalReady\(\)/);
  assert.match(dealCoach, /await refreshContext\(v\)/);
  assert.match(dealCoach, /Challenge assumptions and never manufacture facts/);
  assert.match(dealCoach, /never manufacture facts/i);
  assert.match(dealCoach, /esc\(state\.lastResponse\)\.replace\(\/\\n\/g,'<br>'\)/);
  assert.match(css, /\.coach-christie\{/);
});


test('v5.7.3 Deal Context Bar stays compact, customer-focused, and in document flow', () => {
  const ux = fs.readFileSync(path.join(root, 'public', 'ux-enhancements.js'), 'utf8');
  assert.match(ux, /Customer workspace/);
  assert.match(ux, /Search and switch customer/);
  assert.match(css, /\.context-header\{[^}]*position:relative;[^}]*z-index:1/);
  assert.doesNotMatch(css, /\.context-header\{[^}]*position:sticky/);
  assert.match(css, /\.context-header \.ctx-label/);
  assert.match(css, /\.context-header \.ctx-switch/);
});

test('v5.6.15 Deal Coach uses contract-term economics without weakening persisted context', () => {
  assert.match(dealCoach, /function contractMonths\(\)/);
  assert.match(dealCoach, /function contractEconomics\(v, r\)/);
  assert.match(dealCoach, /paybackWithinTerm/);
  assert.match(dealCoach, /contract economics are positive with payback in term/);
  assert.match(dealCoach, /async function refreshContext\(v\)/);
  assert.match(dealCoach, /async function render\(\)[^{]*\{[^}]*await refreshContext\(v\)/s);
  assert.match(dealCoach, /const v=values\(\);\s*await refreshContext\(v\);/);
  assert.match(dealCoach, /proposalPrepared:proposalReady\(\)/);
  assert.doesNotMatch(dealCoach, /proposalPrepared:!!window\.proposalDraft/);
  assert.match(dealCoach, /Toronto-based consultant/);
  assert.match(dealCoach, /Contract-term economics.not Year 1 ROI.drive economic health/s);
  assert.match(dealCoach, /safeCompany=esc\(company\)/);
  assert.match(dealCoach, /safeBenefit=esc\(money\(e\.benefit\)\)/);
  assert.match(dealCoach, /safeCost=esc\(money\(e\.cost\)\)/);
  assert.match(dealCoach, /safeNet=esc\(money\(e\.net\)\)/);
});


test('v5.6.16 customer and scenario switching refreshes authoritative server context', () => {
  assert.match(customerGate, /async function showCustomerGate\(\)/);
  assert.match(customerGate, /await loadCompanies\(\)/);
  assert.match(customerGate, /await fetchScenarios\(\)/);
  assert.match(companies, /always[\s\S]*refresh rather than trusting an earlier in-memory list/);
  assert.match(companies, /await fetchScenarios\(\)/);
  assert.match(app, /const resp = await apiFetch\('\/api\/scenarios\/' \+ id\)/);
  assert.match(app, /await fetchScenarios\(\)/);
  assert.match(ux, /onCalcScenarioPick\(this\.value\)/);
  assert.match(ux, /openCurrentVersionHistory\(\)/);
});

test('v5.7.0 contract term drives annual cumulative and total-contract economics', () => {
  assert.match(index, /id="contractMonths" value="36"/);
  assert.match(index, /id="contractEconomics"/);
  assert.match(app, /Total .*month contract ROI/);
  assert.match(app, /Annual economics/);
  assert.match(app, /Cumulative economics/);
  assert.match(app, /totalContractNetBenefit/);
  assert.match(printView, /Total .*month ROI/);
  assert.match(printView, /Annual, cumulative, and total-contract economics/);
  assert.match(pptxExport, /totalContractRoi/);
  assert.match(dealExport, /Total contract ROI/);
  const c18 = calcROI({ modelVersion:27, contractMonths:18, users:10, labor:50000, mLabor:.2,
    effectiveShrinkBase:0,mShrinkage:0,inventory:0,mCarrying:0,carryRate:.25,invTurnsCurrent:0,invTurnsBenchmark:10,
    revenue:0,otifBaseline:0,otifTarget:0,mOtif:0,otifRisk:0,itCost:0,mIt:0,discRate:.1,invest:12000,otc:6000,
    implMonths:0,ramp1:1,ramp2:1,ramp3:1 });
  assert.equal(c18.contractYears.length, 2);
  assert.equal(c18.contractYears[1].months, 6);
  assert.equal(c18.totalContractInvestment, 24000);
});

test('v5.7.1 Christie challenges BuyCycle position from buyer evidence without treating CRM as authority', () => {
  assert.match(dealCoach, /Stated BuyCycle position/);
  assert.match(dealCoach, /Buyer evidence and commitments observed/);
  assert.match(dealCoach, /crmStageForReferenceOnly/);
  assert.match(dealCoach, /CRM BOUNDARY/);
  assert.match(dealCoach, /Seller activity alone never proves advancement/);
  assert.match(dealCoach, /Next 3 Buying-Progress Actions/);
  assert.match(dealCoach, /Customer Commitment Sought/);
  assert.match(dealCoach, /The available information is insufficient to validate the stated BuyCycle position/);
  assert.match(dealCoach, /CUSTOMER-FACING EXCEPTION/);
  assert.doesNotMatch(dealCoach, /The CRM stage is wrong/);
});

test('v5.7.2 AI experiences preserve isolated session state and clear it on logout or expiry', () => {
  assert.ok(index.indexOf('ai-session.js') < index.indexOf('assistant.js'));
  assert.ok(prospect.indexOf('ai-session.js') < prospect.indexOf('prospect-assistant.js'));
  for (const scope of ['assistant','internal_help','coach','prospect_help']) {
    assert.match(aiSession + assistant + dealCoach + prospectAssistant, new RegExp(`["']${scope}["']`));
  }
  assert.match(aiSession, /sessionStorage\.setItem/);
  assert.match(aiSession, /function identity\(kind, explicit\)/);
  assert.match(aiSession, /kind==='prospect_help'/);
  assert.match(aiSession, /clearAll/);
  assert.match(apiClient, /CIAIState\.clearAll/);
  assert.match(assistant, /Information used for this AI response has changed/);
  assert.match(dealCoach, /coachSavedHtml/);
  assert.match(dealCoach, /coachClearAI/);
});

test('v5.7.2 internal Assistant uses the authenticated AI proxy', () => {
  assert.match(assistant, /apiFetch\('\/api\/enhance'/);
  assert.doesNotMatch(assistant, /fetch\('\/api\/enhance'/);
});

test('v5.7.2 Prospect-Link Help uses a validated token and server-side prospect-safe allow-list', () => {
  assert.match(prospectAssistant, /fieldContext/);
  assert.match(prospectAssistant, /relevantPriorInputs/);
  assert.match(prospectAssistant, /contextClassification:'Prospect-Safe'/);
  assert.match(prospectAssistant, /state\.fields\[id\]/);
  assert.match(server, /app\.post\('\/api\/prospect-assist', aiLimiter/);
  assert.match(server, /isValidDiscoveryToken\(token\)/);
  assert.match(server, /Prospect-safe architecture boundary/);
  assert.match(server, /contextClassification: 'Prospect-Safe'/);
  assert.match(server, /fieldContext\.relevantPriorInputs/);
  assert.match(server, /const safeField = fieldContext[\s\S]*?audience: 'Prospect'/);
  assert.match(server, /You have no access to internal strategy, coaching, risk, champion, economic-buyer/);
});

test('v5.7.2 keeps locked JPP, Proposal, Deal Coach and financial semantics while adding AI persistence', () => {
  assert.match(index, /APP_VERSION="5\.7\.6"/);
  assert.match(dealCoach, /async function refreshContext\(v\)/);
  assert.match(dealCoach, /proposalPrepared:proposalReady\(\)/);
  assert.match(dealCoach, /await refreshContext\(v\)/);
  assert.match(dealCoach, /\$\{safeCompany\} is evaluating Cloud Inventory/);
  assert.match(prospectMap, /replace\(\/"\/g,'&quot;'\)/);
  assert.match(prospectMap, /replace\(\/'\/g,'&#39;'\)/);
  assert.match(ciWorkflow, /UI and startup regression tests/);
});


test('v5.7 contract-term metrics remain server-authoritative when scenarios are saved', () => {
  for (const field of ['contractMonths','contractYears','totalContractBenefit','totalContractInvestment','totalContractNetBenefit','totalContractRoi','totalContractNpv','contractPayback']) {
    assert.match(scenarioRoutes, new RegExp(field.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + ':'));
  }
  assert.match(scenarioRoutes, /const r = calcROI\(data\)/);
  assert.match(scenarioRoutes, /const dataWithMetrics = \{ \.\.\.data, \.\.\.metrics \}/);
});

test('all authenticated internal AI surfaces use apiFetch rather than bare fetch', () => {
  assert.match(assistant, /apiFetch\('\/api\/enhance'/);
  assert.match(proposal, /apiFetch\('\/api\/enhance'/);
  assert.match(narrative, /apiFetch\('\/api\/enhance'/);
  assert.doesNotMatch(assistant, /fetch\('\/api\/enhance'/);
  assert.doesNotMatch(proposal, /fetch\('\/api\/enhance'/);
  assert.doesNotMatch(narrative, /fetch\('\/api\/enhance'/);
});

test('prospect AI message history is role-normalized and size-bounded server-side', () => {
  assert.match(server, /const safeMessages = messages\.slice\(-8\)\.map/);
  assert.match(server, /role: m && m\.role === 'assistant' \? 'assistant' : 'user'/);
  assert.match(server, /content: allowedText\(m && m\.content, 2000\)/);
  assert.match(server, /messages: safeMessages/);
});


test('pre-v5.7 shared business cases receive contract metrics without rewriting history', () => {
  assert.match(server, /const \{ calcROI: calcROIShared \} = require\('\.\/src\/shared\/roi-engine'\)/);
  assert.match(server, /Backwards compatibility for shares created from pre-v5\.7 scenarios/);
  assert.match(server, /const r = calcROIShared\(shareData\)/);
  assert.match(server, /totalContractRoi: r\.totalContractRoi/);
  assert.match(server, /res\.json\(\{ company: rows\[0\]\.company, title: rows\[0\]\.title, data: shareData \}\)/);
});

/* v5.7.3-v5.7.4 regression coverage */

test('solution selection is presentation-only and cannot change ROI inputs', () => {
  const start = app.indexOf('function applySolutionEmphasis()');
  const end = app.indexOf('\nfunction clearForm()', start);
  const fn = app.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(fn, /recalc\s*\(/);
  assert.doesNotMatch(fn, /_hasFieldInventory\s*=/);
  assert.match(app, /await loadFieldInventoryFlag\(cid\)/);
  assert.ok(app.indexOf('await loadFieldInventoryFlag(cid)') < app.indexOf("loadFromObject(inputs)"));
});

test('executive Three Whys autosave to the active scenario and AI output saves immediately', () => {
  assert.match(narrative, /setTimeout\(persistThreeWhys, 700\)/);
  assert.match(narrative, /\/api\/scenarios\/.*\/narrative/);
  assert.match(narrative, /await persistThreeWhys\(\)/);
  assert.match(app, /await persistThreeWhys\(\)/);
  assert.match(apiClient, /await window\.persistThreeWhys\(\)/);
  assert.match(scenarioRoutes, /router\.patch\('\/:id\/narrative'/);
  assert.match(scenarioRoutes, /SET data = s\.data \|\| \$1::jsonb, updated_at = NOW\(\)/);
});

test('Customer Workspace remains in document flow and cannot cover page actions', () => {
  assert.match(css, /\.context-header\{[^}]*position:relative;[^}]*z-index:1;/);
  assert.doesNotMatch(css, /\.context-header\{[^}]*position:sticky;/);
  assert.doesNotMatch(css, /\.context-header\{[^}]*top:calc\(var\(--topbar-h\)/);
  assert.ok(index.indexOf('id="contextHeader"') < index.indexOf('id="tab-calc"'));
});

test('v5.7.5 Champion Pack expands objection handling without weakening financial semantics', () => {
  assert.match(index, /id="championPackBtn"[\s\S]*4-slide internal deck/);
  for (const question of [
    'Are these numbers credible?', 'How conservative is the business case?',
    'Are benefits being counted twice?', 'What does delaying the decision cost?',
    'Why not use our ERP or current tools?', 'How disruptive will implementation be?',
    'How do we address security and governance?', 'Will frontline teams adopt it?',
    'How will we prove value after go-live?'
  ]) assert.match(dealExport, new RegExp(question.replace(/[?]/g, '\\?')));
  assert.match(dealExport, /Inventory turns — annual carrying savings/);
  assert.match(dealExport, /v\.ramp1 \?\? 0\.4/);
  assert.doesNotMatch(dealExport, /Exit is a subscription cancellation/);
});

test('v5.7.5-v5.7.6 Executive View saves against the current scenario version', () => {
  assert.match(index, /id="saveExecutiveViewBtn"/);
  assert.match(narrative, /async function saveExecutiveView\(\)/);
  assert.match(narrative, /const result = await resp\.json\(\)/);
  assert.match(narrative, /window\._calcScenarioId = result\.id/);
  assert.match(narrative, /window\.persistThreeWhys = persistThreeWhys/);
  assert.match(narrative, /apiFetch\('\/api\/enhance'/);
  assert.doesNotMatch(narrative, /fetch\('\/api\/enhance'/);

  const saveStart = app.indexOf('async function _doSave');
  const loadStart = app.indexOf('async function loadScenario', saveStart);
  const saveFn = app.slice(saveStart, loadStart);
  assert.match(saveFn, /window\._calcScenarioId = saved\.id/);
  assert.ok(saveFn.indexOf('window._calcScenarioId = saved.id') < saveFn.indexOf('await fetchScenarios()'));
  assert.match(saveFn, /refreshCalcScenarioPicker/);

  assert.match(scenarioRoutes, /router\.patch\('\/:id\/narrative'/);
  assert.match(scenarioRoutes, /current_target AS/);
  assert.match(scenarioRoutes, /WHERE s\.is_current = TRUE/);
  assert.match(scenarioRoutes, /RETURNING s\.id, s\.updated_at/);
  assert.match(scenarioRoutes, /totalContractRoi:\s+r\.totalContractRoi/);
});

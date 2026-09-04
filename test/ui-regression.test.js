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
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const narrative = fs.readFileSync(path.join(root, 'public', 'narrative.js'), 'utf8');
const scenarioRoutes = fs.readFileSync(path.join(root, 'src', 'routes', 'scenarios.js'), 'utf8');
const dealCoach = fs.readFileSync(path.join(root, 'public', 'deal-coach.js'), 'utf8');
const aiSession = fs.readFileSync(path.join(root, 'public', 'ai-session.js'), 'utf8');
const assistant = fs.readFileSync(path.join(root, 'public', 'assistant.js'), 'utf8');
const prospectAssistant = fs.readFileSync(path.join(root, 'public', 'prospect-assistant.js'), 'utf8');
const clientApi = fs.readFileSync(path.join(root, 'public', 'src', 'client', 'api.js'), 'utf8');
const printView = fs.readFileSync(path.join(root, 'public', 'print.html'), 'utf8');
const { readiness } = require(path.join(root, 'src', 'shared', 'handoff-readiness.js'));
const { calcROI } = require(path.join(root, 'src', 'shared', 'roi-engine.js'));

test('all inline application scripts parse', () => {
  const scripts = [...index.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length > 0, 'expected inline scripts in index.html');
  scripts.forEach((match, i) => {
    assert.doesNotThrow(() => new vm.Script(match[1], { filename: `index-inline-${i + 1}.js` }));
  });
});

test('buyer evidence governance is persisted, hard-gated, and visible to Christie and managers', () => {
  const migration = fs.readFileSync(path.join(root,'migrations','025_buyer_evidence_governance.sql'),'utf8');
  const route = fs.readFileSync(path.join(root,'src','routes','stage-readiness.js'),'utf8');
  const coach = fs.readFileSync(path.join(root,'public','deal-coach.js'),'utf8');
  const manager = fs.readFileSync(path.join(root,'public','sales-manager.js'),'utf8');
  assert.match(migration, /scenario_stage_governance/);
  assert.match(migration, /scenario_stage_history/);
  assert.match(migration, /stage_manager_overrides/);
  assert.match(route, /Stage Advancement Blocked/);
  assert.match(route, /Rep certification is required/);
  assert.match(route, /transaction\(async client/);
  assert.match(coach, /Current BuyCycle Stage/);
  assert.match(coach, /Rep Assessment/);
  assert.match(coach, /Evidence-Supported Stage/);
  assert.match(coach, /deterministicAssessment/);
  assert.match(manager, /Evidence-Supported Stage/);
  assert.match(manager, /Buyer evidence/);
});

test('evidence freshness is visible, actionable, and never offers a one-click current status',()=>{
  const ui=fs.readFileSync(path.join(root,'public','buyer-readiness.js'),'utf8'),help=fs.readFileSync(path.join(root,'public','help-v6.js'),'utf8');
  assert.match(ui,/Evidence date needed/);assert.match(ui,/Revalidate Evidence/);assert.match(ui,/Evidence is stale/);assert.match(ui,/days old/);
  assert.doesNotMatch(ui,/Mark Current/);assert.match(css,/br-freshness\.stale/);assert.match(css,/br-freshness\.aging/);
  assert.match(help,/Editing does not refresh customer evidence/);assert.match(fs.readFileSync(path.join(root,'config','application-knowledge.json'),'utf8'),/Current, Aging and Stale describe evidence freshness/);
});

test('Buyer Commitment is explainable without turning the summary into a checklist',()=>{
  const ui=fs.readFileSync(path.join(root,'public','buyer-readiness.js'),'utf8'),help=fs.readFileSync(path.join(root,'public','help-v6.js'),'utf8');
  assert.match(ui,/Why this level\?/);assert.match(ui,/openCommitmentDrawer/);assert.match(ui,/Active customer commitments/);assert.match(ui,/Overdue commitments/);assert.match(ui,/dated milestone alone does not prove strong purchase intent/);
  assert.match(help,/Buyer Commitment measures what the customer has committed/);assert.match(help,/funding, evaluation, value, or procurement behavior/);
});

test('Customer Workspace displays official stage while Deal Coach edits only Rep Assessment', () => {
  const ux = fs.readFileSync(path.join(root,'public','ux-enhancements.js'),'utf8');
  const coach = fs.readFileSync(path.join(root,'public','deal-coach.js'),'utf8');
  const route = fs.readFileSync(path.join(root,'src','routes','stage-readiness.js'),'utf8');
  assert.doesNotMatch(ux, /contextDealStage|changeRepSelectedStage/);
  assert.match(ux, /Current BuyCycle stage/);
  assert.match(ux, /Evidence supports Stage/);
  assert.match(coach, /Update Rep Assessment/);
  assert.match(coach, /does not advance or regress the official Current BuyCycle Stage/);
  assert.match(coach, /evidence not captured elsewhere/);
  const start=route.indexOf("router.put('/:id',async"),end=route.indexOf("router.post('/:id/advance'",start);
  assert.doesNotMatch(route.slice(start,end),/UPDATE scenarios SET deal_stage/);
});

test('BuyCycle 2-7 workspace captures critical evidence and supports governed outcomes', () => {
  const migration = fs.readFileSync(path.join(root,'migrations','026_buycycle_stages_2_7.sql'),'utf8');
  const ui = fs.readFileSync(path.join(root,'public','buyer-readiness.js'),'utf8');
  const route = fs.readFileSync(path.join(root,'src','routes','stage-readiness.js'),'utf8');
  assert.match(migration, /Stage 3|Commit Funding/);
  assert.match(migration, /Funding status confirmed/);
  assert.match(migration, /stage_at_loss/);
  assert.match(ui, /Buyer Evidence &amp; Stage Readiness/);
  assert.match(ui, /Evidence strength/);
  assert.match(ui, /Validating stakeholder/);
  assert.match(ui, /Advance stage/);
  assert.match(route, /advance-stage/);
  assert.match(route, /closed_won/);
  assert.match(route, /closed_lost/);
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
  assert.match(pptxExport, /CIBrand\.officeTheme\(\)/);
});

test('narrative action labels contain real icons, not escaped code text', () => {
  assert.match(index, />↺ Reset<\/button>/);
  assert.match(index, />✨ AI enhance<\/button>/);
  assert.doesNotMatch(index, /\\u21ba|\\u2728/);
});

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
  assert.match(clientApi, /await window\.persistThreeWhys\(\)/);
  assert.match(scenarioRoutes, /router\.patch\('\/:id\/narrative'/);
  assert.match(scenarioRoutes, /current_target AS/);
  assert.match(scenarioRoutes, /SET data = s\.data \|\| \$1::jsonb, updated_at = NOW\(\)/);
  assert.match(narrative, /window\._calcScenarioId = result\.id/);
  assert.match(index, /id="saveExecutiveViewBtn"/);
  assert.match(narrative, /async function saveExecutiveView\(\)/);
  const saveStart = app.indexOf('async function _doSave');
  const loadStart = app.indexOf('async function loadScenario', saveStart);
  const saveFn = app.slice(saveStart, loadStart);
  assert.match(saveFn, /window\._calcScenarioId = saved\.id/);
  assert.ok(saveFn.indexOf('window._calcScenarioId = saved.id') < saveFn.indexOf('await fetchScenarios()'));
});

test('Champion Pack is safely deactivated until governed conversion',()=>{assert.match(index,/id="championPackBtn" disabled/);const active=dealExport.slice(dealExport.indexOf('function buildChampionPack'),dealExport.indexOf('window.buildChampionPack'));assert.doesNotMatch(active,/calcROI|annualBenefit|addSlide/);assert.match(active,/INTERNAL USE ONLY/);});

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
  assert.match(prospectMap, /CIBrand\.audience\('customer'\)/);
  assert.match(prospectMap, /actions for your team/);
  assert.match(prospectMap, /aria-label=/);

  const start = prospectMap.indexOf('<script>') + '<script>'.length;
  const end = prospectMap.lastIndexOf('</script>');
  assert.doesNotThrow(() => new vm.Script(prospectMap.slice(start, end), { filename:'prospect-map-inline.js' }));
});

test('contract term drives simultaneous annual, cumulative, and total-contract presentation', () => {
  assert.match(index, /id="contractMonths" value="36"/);
  assert.match(index, /id="contractEconomics"/);
  assert.match(app, /Total .*month contract ROI/);
  assert.match(app, /Annual economics/);
  assert.match(app, /Cumulative economics/);
  assert.match(app, /totalContractNetBenefit/);
  assert.match(fs.readFileSync(path.join(root,'src/shared/customer-roi-report.js'),'utf8'), /contractRoi: roi.totalContractRoi/);
  assert.match(fs.readFileSync(path.join(root,'src/shared/customer-roi-report.js'),'utf8'), /cumulativeRoi: row.cumulativeRoi/);
  assert.match(pptxExport, /totalContractRoi/);
  assert.match(dealExport, /Total contract ROI/);
});

test('Christie challenges governed stage alignment without creating a fourth stage', () => {
  const christieServer=fs.readFileSync(path.join(root,'src','shared','christie-context.js'),'utf8');
  assert.match(dealCoach, /Current BuyCycle Stage/);
  assert.match(dealCoach, /Rep Assessment/);
  assert.match(dealCoach, /Evidence-Supported Stage/);
  assert.match(dealCoach, /Buyer evidence and commitments observed/);
  assert.doesNotMatch(dealCoach, /repSelectedDealStage|statedBuyCyclePosition|stageExitEvidence/);
  assert.match(christieServer, /buyerEvidence/);
  assert.match(christieServer, /Customer commitment sought/i);
  assert.match(christieServer, /evidenceToCapture/);
  assert.match(dealCoach, /contractEconomics/);
  assert.match(server, /\/api\/scenarios\/:id\/christie/);
  assert.match(server, /scenarioAccess\(req\.user,scenarioId,'view'\)/);
});

test('AI experiences preserve isolated session state and clear it on logout or expiry', () => {
  assert.ok(index.indexOf('ai-session.js') < index.indexOf('assistant.js'));
  assert.ok(prospect.indexOf('ai-session.js') < prospect.indexOf('prospect-assistant.js'));
  for (const scope of ['assistant','internal_help','coach','prospect_help']) {
    assert.match(aiSession + assistant + dealCoach + prospectAssistant, new RegExp(`["']${scope}["']`));
  }
  assert.match(aiSession, /sessionStorage\.setItem/);
  assert.match(aiSession, /clearAll/);
  assert.match(fs.readFileSync(path.join(root,'public','src','client','api.js'),'utf8'), /CIAIState\.clearAll/);
  assert.match(assistant, /Information used for this AI response has changed/);
  assert.match(dealCoach, /coachSavedHtml/);
  assert.match(dealCoach, /coachClearAI/);
});

test('Prospect-Link Help sends minimal field context through a server allow-list', () => {
  assert.match(prospectAssistant, /questionId:id/);
  assert.match(prospectAssistant, /state\.fields\[id\]/);
  assert.match(server, /Resolve the exact governed question server-side/);
  assert.match(server, /contextClassification: 'Prospect-Safe'/);
  assert.match(server, /discovery_session_questions/);
  assert.match(server, /const safeField = \{[\s\S]*?audience: 'Prospect'/);
  assert.doesNotMatch(prospectAssistant, /fieldContext:ctx/);
});

test('task-oriented Help covers current buyer-evidence workflow and AI boundaries', () => {
  const help = fs.readFileSync(path.join(root, 'public', 'help-v6.js'), 'utf8');
  const helpIndex = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  assert.match(help, /New Opportunity — What Do I Do/);
  assert.match(help, /BuyCycle stages 2–7/);
  assert.match(help, /Why is advancement blocked/);
  assert.match(help, /CRM-independent workflow/);
  assert.match(help, /Ask AI Help[\s\S]*Christie/);
  assert.match(help, /startHelpTour/);
  assert.match(help, /MutationObserver[\s\S]*Why is this blocking me/);
  assert.match(helpIndex, /help-v6\.css/);
  assert.match(helpIndex, /help-v6\.js/);
});

test('Customer Workspace remains in document flow and cannot cover page actions', () => {
  assert.match(css, /\.context-header\{[^}]*position:relative;[^}]*z-index:1;/);
  assert.doesNotMatch(css, /\.context-header\{[^}]*position:sticky;/);
  assert.doesNotMatch(css, /\.context-header\{[^}]*top:calc\(var\(--topbar-h\)/);
  assert.ok(index.indexOf('id="contextHeader"') < index.indexOf('id="tab-calc"'));
});

test('Sales Manager dashboard is integrated, role-gated, and does not recalculate ROI', () => {
  const manager = fs.readFileSync(path.join(root,'public','sales-manager.js'),'utf8');
  const route = fs.readFileSync(path.join(root,'src','routes','sales-manager.js'),'utf8');
  const migration = fs.readFileSync(path.join(root,'migrations','024_sales_manager_dashboard.sql'),'utf8');
  assert.match(index, /id="nav-manager" style="display:none;"/);
  assert.match(index, /u\.roles\.includes\('Sales Manager'\)/);
  assert.match(app, /'manager'/);
  assert.match(manager, /Entire Team/);
  assert.match(manager, /Individual Rep/);
  assert.match(manager, /Buying Stage/);
  assert.match(manager, /Past due \/ missing only/);
  assert.match(manager, /Internal (manager )?action plan/);
  assert.match(manager, /class="sm-view-switch"/);
  assert.match(manager, /class="sm-overview"/);
  assert.match(manager, /Next customer commitment/);
  assert.match(manager, /Evidence of recovery/);
  assert.match(route, /requireAnyRole\('sales_manager', 'admin'\)/);
  assert.match(route, /sales_manager_actions/);
  assert.doesNotMatch(route, /calcROI|roi-engine/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS roles TEXT\[\]/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS sales_manager_actions/);
  assert.doesNotThrow(() => new vm.Script(manager, { filename:'sales-manager.js' }));
});

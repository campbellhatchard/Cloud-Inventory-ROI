'use strict';
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..'),files=require('./production-output-dependencies');
const patterns=[
 [/THREE_WHYS_LIBRARY|buildNarrativeSections\s*\(|calcRiskOfInaction\s*\(/,'generic/legacy narrative engine'],
 [/function\s+renderExec\s*\(/,'legacy Executive renderer'],
 [/annualBenefit\s*\/\s*(12|4|52)\b|annualBenefit\s*\*\s*(0?\.7|1\.3)\b/,'output-side economic derivation'],
 [/Every month of delay costs|Foregone value per period of inaction|Risk of inaction\s*[—-]\s*the cost of delay/i,'cost-of-delay customer claim'],
 [/Reset to industry defaults|generic narrative template/i,'generic narrative injection']
];
const failures=[];
for(const f of files){const full=path.join(root,f);if(!fs.existsSync(full)){failures.push(`${f}: registered production dependency is missing`);continue;}const source=fs.readFileSync(full,'utf8');for(const [p,label] of patterns)if(p.test(source))failures.push(`${f}: ${label}`);}
const publicRoute=fs.readFileSync(path.join(root,'src/routes/business-case-shares.js'),'utf8');if(/SELECT[^`]*\bs\.data\b|JOIN scenarios|is_current/.test(publicRoute))failures.push('Public Business Case must read frozen customer-safe payload only');
const index=fs.readFileSync(path.join(root,'public/index.html'),'utf8');if(/id="scenarioModeBar"|print\.html#data|Reset to industry defaults|execInactionCard/.test(index))failures.push('Retired Executive control/path is active');
const registry=require('../src/shared/output-registry');
const dependencySet=new Set(files);
for(const output of registry.OUTPUTS.filter(x=>x.active&&x.audience==='customer')){
 if(!dependencySet.has(output.ownerModule))failures.push(`${output.outputId}: active customer owner is absent from production dependency registry`);
 if(!output.authoritativeDataSource)failures.push(`${output.outputId}: missing declared authority`);
}
const prospect=fs.readFileSync(path.join(root,'public/prospect.html'),'utf8');
if(/calcROI\s*\(|\*\s*0?\.7\b|70%[–-]100%|Per month without Cloud Inventory|recoverable value foregone|annualBenefit\s*\/\s*(12|4|52)\b/.test(prospect))failures.push('Prospect Link contains browser economics, arbitrary sensitivity, or derived delay value');
const features=fs.readFileSync(path.join(root,'public/features.js'),'utf8'),emailStart=features.indexOf('async function generateEmail'),emailEnd=features.indexOf('function copyEmail'),email=emailStart>=0&&emailEnd>emailStart?features.slice(emailStart,emailEnd):'';
if(!email||/calcROI\s*\(|getVals\s*\(|under 12 months|30-minute technical discovery|live demo focused|I've attached a full executive presentation|Cloud Inventory\s+[—-]\s+a Nextworld Company/.test(email))failures.push('Customer email contains local economics, unsafe payback, generic commitments, attachment, or retired branding');
const adapters=fs.readFileSync(path.join(root,'public/executive-output-adapters.js'),'utf8'),ppt=fs.readFileSync(path.join(root,'public/pptx-export.js'),'utf8');
if(/_forceExecutiveDraft|corePpt/.test(adapters)||/pptLocalContext|calcROI\s*\(/.test(ppt))failures.push('Executive PowerPoint retains an unsaved browser economic fallback');
const scenarioRoutes=fs.readFileSync(path.join(root,'src/routes/scenarios.js'),'utf8'),executiveImplementations=(adapters.match(/window\.exportToPowerPoint\s*=/g)||[]).length+(ppt.match(/(?:window\.)?exportToPowerPoint\s*=/g)||[]).length+(ppt.match(/function\s+exportToPowerPoint\s*\(/g)||[]).length;
if(executiveImplementations!==1)failures.push(`Executive PowerPoint must have exactly one active client adapter; found ${executiveImplementations}`);
if(/pptx-context/.test(scenarioRoutes)||/pptx-context|function\s+(?:addCover|summary|financial|conclusion)\s*\(/.test(ppt))failures.push('Retired Executive browser generator or context route remains active');
if(!/id="pptxExportBtn"[^>]*disabled[^>]*aria-disabled="true"/.test(index)||!/authoritativePptButton[\s\S]*disabled=false/.test(adapters))failures.push('Executive PowerPoint does not fail closed before the authoritative adapter initializes');
const champion=registry.getOutput('deal-coach-champion-kit');if(champion.active)failures.push('Deal Coach Champion Kit must remain inactive until governed conversion is complete');
if(!/Champion Kit — unavailable[\s\S]*Pending governed customer-message conversion/.test(fs.readFileSync(path.join(root,'public/deal-coach.js'),'utf8')))failures.push('Inactive Champion Kit registry and UI disagree');
const customerFormatters=['public/executive-output-adapters.js','public/proposal.js','public/customer-email.js','public/business-case.js','src/exports/executive-pdf.js','src/exports/executive-docx.js','src/exports/executive-pptx.js','server.js'];
for(const file of customerFormatters){const source=fs.readFileSync(path.join(root,file),'utf8');if(/Number\.isFinite\(Number\((?:e\.)?(?:contractRoi|cumulativeRoi|payback)\)\)|Math\.round\((?:story\.economics\.)?contractRoi\)|Number\((?:e\.)?(?:annualBenefit|totalContractBenefit|totalContractInvestment|netEconomicBenefit|contractRoi|cumulativeRoi|npv|payback)\)\s*\|\|\s*0/.test(source))failures.push(`${file}: nullable customer economic formatter can coerce missing to zero`);}
if(/id="emailBody"|AI personalize/.test(index)||!/Governed Value Story — read only/.test(index))failures.push('Customer email exposes governed facts through an editable full-body field');
const proposal=fs.readFileSync(path.join(root,'public/proposal.js'),'utf8');if(/Return JSON only with keys[^\n]*(?:outcome|whyAct|whyCloud|whyNow)/.test(proposal))failures.push('Proposal AI may rewrite governed facts');
const dealExport=fs.readFileSync(path.join(root,'public/deal-export.js'),'utf8'),mapSource=fs.readFileSync(path.join(root,'public/map.js'),'utf8'),solutionFit=fs.readFileSync(path.join(root,'public/solution-fit.js'),'utf8');
if(/pptConfidentialFooter|legacyPptActionPlan/.test(dealExport))failures.push('Obsolete PowerPoint footer or JPP compatibility generator remains active');
if(/window\.proposalPrint=print|window\.proposalExportWord=word|\/api\/enhance/.test(proposal))failures.push('Proposal retains a local customer generator or free-form AI rewriter');
if(!/getSavedMapForOutput/.test(mapSource)||!/_mapDirty/.test(mapSource)||!/getSavedMapForOutput/.test(dealExport))failures.push('JPP customer output can bypass saved-state authority');
if(!/flushSolutionFitSave/.test(solutionFit)||!/(?:printHandoffDoc|printRiskLedger)[\s\S]{0,160}await flushSolutionFitSave/.test(solutionFit))failures.push('Solution Fit customer output can bypass save flush');
for(const file of ['public/index.html','public/login.html']){const active=fs.readFileSync(path.join(root,file),'utf8');if(/Nextworld Company|Cloud Inventory · Nextworld/.test(active))failures.push(`${file}: legacy active Nextworld branding`);}
const coverage=require('../config/output-runtime-tests.json'),activeIds=registry.OUTPUTS.filter(x=>x.active).map(x=>x.outputId).sort(),covered=[...(coverage.activeOutputIds||[])].sort();if(JSON.stringify(activeIds)!==JSON.stringify(covered))failures.push('Executable output coverage manifest does not exactly match active Output Registry IDs');if(!coverage.runner||!fs.existsSync(path.join(root,coverage.runner)))failures.push('Executable output coverage runner is missing');
const sourceLoader=fs.readFileSync(path.join(root,'src/shared/executive-source.js'),'utf8'),proposalService=fs.readFileSync(path.join(root,'src/exports/proposal-export-service.js'),'utf8'),server=fs.readFileSync(path.join(root,'server.js'),'utf8');if(!/discovery_submission_answers/.test(sourceLoader)||/discovery_answers a/.test(proposalService)||!/loadExecutiveSource\(user,scenarioId\)/.test(proposalService))failures.push('Proposal/Executive source authority may use mutable Discovery drafts');
if(/legacyPptStakeholderMap/.test(dealExport))failures.push('Stakeholder PowerPoint legacy fallback remains active');
if(/p\.commercialTerms|proposal\.commercialTerms/.test(adapters)||/para\(proposal\.commercialTerms/.test(server))failures.push('Customer Proposal may expose internal commercial notes');
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}else console.log(`Active output prohibited-pattern audit passed (${files.length} registered production modules).`);

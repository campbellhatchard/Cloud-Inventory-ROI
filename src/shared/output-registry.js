'use strict';
/* Authoritative inventory of active polished outputs. CSV/admin extracts are
   intentionally excluded because they are data interchange, not documents. */
const OUTPUTS=[
 ['executive-web','Executive Business Case — Web','customer',['html'],'Executive Value Story','browser-print','public/executive-output-adapters.js',true,true],
 ['executive-pdf','Executive Business Case — PDF','customer',['pdf'],'Executive Value Story','server','src/exports/executive-pdf.js',true,true],
 ['executive-docx','Executive Business Case — Word','customer',['docx'],'Executive Value Story','server','src/exports/executive-docx.js',true,true],
 ['executive-pptx','Executive Business Case — PowerPoint','customer',['pptx'],'Executive Value Story','server','src/exports/executive-pptx.js',true,true],
 ['proposal-preview','Executive Proposal — Preview','customer',['html'],'Saved Proposal + Executive Value Story','browser-print','public/proposal-output-builder.js',true,true],
 ['proposal-pdf','Executive Proposal — PDF','customer',['pdf'],'Saved Proposal + Executive Value Story','server','src/exports/proposal-pdf.js',true,true],
 ['proposal-docx','Executive Proposal — Word','customer',['docx'],'Saved Proposal + Executive Value Story','server','src/exports/proposal-docx.js',true,true],
 ['jpp-customer-pdf','Joint Project Plan — Customer PDF','customer',['pdf'],'Saved Joint Project Plan','browser-print','public/deal-export.js',false,true],
 ['jpp-customer-pptx','Joint Project Plan — Customer PowerPoint','customer',['pptx'],'Saved Joint Project Plan','server','src/exports/operational-pptx.js',false,true],
 ['jpp-internal-pdf','Joint Project Plan — Internal PDF','internal',['pdf'],'Saved Joint Project Plan','browser-print','public/deal-export.js',false,false],
 ['jpp-internal-pptx','Joint Project Plan — Internal PowerPoint','internal',['pptx'],'Saved Joint Project Plan','server','src/exports/operational-pptx.js',false,false],
 ['stakeholder-pdf','Stakeholder Map — PDF','internal',['pdf'],'Saved Stakeholder Map','browser-print','public/deal-export.js',false,false],
 ['stakeholder-pptx','Stakeholder Map — PowerPoint','internal',['pptx'],'Saved Stakeholder Map','server','src/exports/operational-pptx.js',false,false],
 ['solution-summary-pdf','Solution Discovery / Demonstration Summary — PDF','customer',['pdf'],'Saved Solution Fit Handoff','browser-print','public/solution-fit-output-builders.js',false,true],
 ['solution-risk-pdf','Solution Fit Risk Ledger — PDF','customer',['pdf'],'Saved Solution Fit Handoff','browser-print','public/solution-fit-output-builders.js',false,true],
 ['solution-handoff-pdf','Solution Fit Internal Handoff — PDF','internal',['pdf'],'Saved Solution Fit Handoff','browser-print','public/solution-fit-output-builders.js',false,false],
 ['competitive-pdf','Competitive Battlecard — PDF','internal',['pdf'],'Governed Battlecard Revision','browser-print','public/deal-export.js',false,false],
 ['competitive-docx','Competitive Battlecard — Word','internal',['docx'],'Governed Battlecard Revision','server','src/exports/competitive-docx.js',false,false],
 ['roi-methodology-pdf','ROI Methodology — PDF','internal',['pdf'],'Canonical saved ROI report / ROI Model v2.8','server','src/exports/roi-methodology-pdf.js',false,false],
 ['roi-methodology-pptx','ROI Methodology — PowerPoint','internal',['pptx'],'ROI Model v2.8 Registry','browser','public/deal-export.js',false,false],
 ['impact-map-pdf','Discovery Impact Map — PDF','internal',['pdf'],'Questionnaire + ROI Model v2.8 Registries','browser-print','public/impact-map.js',false,false],
 ['champion-pack-pptx','Champion Pack — PowerPoint','internal',['pptx'],'Executive Value Story + Internal Objection Guidance','browser','public/deal-export.js',false,false],
 ['role-one-pager-pptx','Role-specific One-Pager — PowerPoint','internal',['pptx'],'Executive Value Story','browser','public/deal-export.js',false,false],
 ['customer-share-html','Customer Business Case / Share Page','customer',['html'],'Frozen Executive Value Story projection','server','src/routes/business-case-shares.js',true,true],
 ['prospect-roi-preview','Prospect Link — Economic Preview','customer',['html'],'Server Prospect ROI Preview / ROI Model v2.8','server','src/shared/prospect-roi-preview.js',false,true],
 ['customer-value-email','Customer Value Email','customer',['text','mailto'],'Executive Value Story','browser-format','public/features.js',true,true],
 ['deal-coach-champion-kit','Deal Coach Champion Email / Kit','customer',['text'],'Executive Value Story','browser-format','public/deal-coach.js',true,true]
];
const READINESS_TYPES=Object.freeze({'executive-web':'executive_view','executive-pdf':'pdf','executive-docx':'docx','executive-pptx':'pptx','proposal-preview':'proposal','proposal-pdf':'proposal','proposal-docx':'proposal','customer-share-html':'share','customer-value-email':'customer_email','deal-coach-champion-kit':'customer_email'});
const NOT_APPLICABLE='This output does not project the governed Executive Value Story and has its own source-specific controls.';
const RECORDS=OUTPUTS.map(([outputId,displayName,audience,formats,authoritativeDataSource,generationMode,ownerModule,readinessRequired,customerSafe])=>Object.freeze({outputId,displayName,audience,formats:Object.freeze(formats),authoritativeDataSource,brandAudience:audience,internalDraftVariant:outputId.startsWith('proposal-')?Object.freeze({audience:'internal',brandAudience:'internal',customerSafe:false,classification:'DRAFT — NOT READY FOR CUSTOMER SHARING'}):null,active:!['champion-pack-pptx','deal-coach-champion-kit'].includes(outputId),logoRole:generationMode==='browser-print'||formats.includes('html')?'logoColor':'logoOfficeHighResolution',readinessRequired,readinessOutputType:READINESS_TYPES[outputId]||null,readinessNotApplicable:readinessRequired?null:NOT_APPLICABLE,customerSafe,generationMode,ownerModule}));
const byId=new Map(RECORDS.map(x=>[x.outputId,x]));
function getOutput(id){const item=byId.get(id);if(!item)throw new Error(`Unknown output: ${id}`);return item;}
function validateRegistry(){
 const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'../..');
 const supported=require('./executive-output-readiness').OUTPUTS;
 for(const x of RECORDS){
  if(!['customer','internal'].includes(x.audience))throw new Error(`${x.outputId}: invalid audience`);
  if(x.customerSafe!==(x.audience==='customer'))throw new Error(`${x.outputId}: customer-safe classification mismatch`);
  if(!fs.existsSync(path.join(root,x.ownerModule)))throw new Error(`${x.outputId}: missing owner module`);
  if(x.active&&x.customerSafe&&/Executive Value Story/.test(x.authoritativeDataSource)&&!x.readinessRequired)throw new Error(`${x.outputId}: missing readiness gate`);
  if(x.active&&x.readinessRequired&&(!x.readinessOutputType||!supported.has(x.readinessOutputType)))throw new Error(`${x.outputId}: readiness type is missing or unsupported`);
  if(x.active&&!x.readinessRequired&&!x.readinessNotApplicable)throw new Error(`${x.outputId}: readiness non-applicability must be explicit`);
  if(x.active&&x.ownerModule.startsWith('src/exports/')){
   const generator=require(path.join(root,x.ownerModule));
   if(!Object.values(generator).some(v=>typeof v==='function'))throw new Error(`${x.outputId}: generator cannot load`);
  }
 }
 const routes=fs.readFileSync(path.join(root,'src/routes/scenarios.js'),'utf8');
 for(const route of ['/:id/export-pdf','/:id/export-pptx','/:id/export-docx'])if(!routes.includes(route))throw new Error(`Missing executive route: ${route}`);
 const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
 for(const route of ['/api/business-case-shares','/api/export/battlecard/:id','/api/export/battlecard-docx','/api/export/proposal-docx','/api/export/proposal-pdf','/api/export/roi-methodology-pdf'])if(!server.includes(route))throw new Error(`Missing output route: ${route}`);
 const browser=fs.readFileSync(path.join(root,'public/deal-export.js'),'utf8');
 for(const control of ['shareBusinessCase','exportCompPDF','exportCompDocx','exportGovernedOnePager','roiMethodologyPDF','roiMethodologyPPT'])if(!browser.includes('function '+control+'('))throw new Error(`Missing output control: ${control}`);
 return true;
}
module.exports=Object.freeze({OUTPUTS:Object.freeze(RECORDS),getOutput,validateRegistry});

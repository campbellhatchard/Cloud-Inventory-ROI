'use strict';
/* Authoritative inventory of active polished outputs. CSV/admin extracts are
   intentionally excluded because they are data interchange, not documents. */
const OUTPUTS=[
 ['executive-web','Executive Business Case — Web','customer',['html'],'Executive Value Story','browser-print','public/executive-output-adapters.js',true,true],
 ['executive-pdf','Executive Business Case — PDF','customer',['pdf'],'Executive Value Story','browser-print','public/print.html',true,true],
 ['executive-pptx','Executive Business Case — PowerPoint','customer',['pptx'],'Executive Value Story','server','src/exports/executive-pptx.js',true,true],
 ['proposal-preview','Executive Proposal — Preview','customer',['html'],'Saved Proposal + Executive Value Story','browser-print','public/proposal.js',true,true],
 ['proposal-pdf','Executive Proposal — PDF','customer',['pdf'],'Saved Proposal + Executive Value Story','browser-print','public/executive-output-adapters.js',true,true],
 ['proposal-docx','Executive Proposal — Word','customer',['docx'],'Saved Proposal + Executive Value Story','server','server.js',true,true],
 ['jpp-customer-pdf','Joint Project Plan — Customer PDF','customer',['pdf'],'Saved Joint Project Plan','browser-print','public/deal-export.js',false,true],
 ['jpp-customer-pptx','Joint Project Plan — Customer PowerPoint','customer',['pptx'],'Saved Joint Project Plan','server','src/exports/operational-pptx.js',false,true],
 ['jpp-internal-pdf','Joint Project Plan — Internal PDF','internal',['pdf'],'Saved Joint Project Plan','browser-print','public/deal-export.js',false,false],
 ['jpp-internal-pptx','Joint Project Plan — Internal PowerPoint','internal',['pptx'],'Saved Joint Project Plan','server','src/exports/operational-pptx.js',false,false],
 ['stakeholder-pdf','Stakeholder Map — PDF','internal',['pdf'],'Saved Stakeholder Map','browser-print','public/deal-export.js',false,false],
 ['stakeholder-pptx','Stakeholder Map — PowerPoint','internal',['pptx'],'Saved Stakeholder Map','server','src/exports/operational-pptx.js',false,false],
 ['solution-summary-pdf','Solution Discovery / Demonstration Summary — PDF','customer',['pdf'],'Saved Solution Fit Handoff','browser-print','public/solution-fit.js',false,true],
 ['solution-risk-pdf','Solution Fit Risk Ledger — PDF','customer',['pdf'],'Saved Solution Fit Handoff','browser-print','public/solution-fit.js',false,true],
 ['solution-handoff-pdf','Solution Fit Internal Handoff — PDF','internal',['pdf'],'Saved Solution Fit Handoff','browser-print','public/solution-fit.js',false,false],
 ['competitive-pdf','Competitive Battlecard — PDF','internal',['pdf'],'Governed Battlecard Revision','browser-print','public/deal-export.js',false,false],
 ['competitive-docx','Competitive Battlecard — Word','internal',['docx'],'Governed Battlecard Revision','server','server.js',false,false],
 ['roi-methodology-pdf','ROI Methodology — PDF','internal',['pdf'],'ROI Model v2.8 Registry','browser-print','public/deal-export.js',false,false],
 ['roi-methodology-pptx','ROI Methodology — PowerPoint','internal',['pptx'],'ROI Model v2.8 Registry','browser','public/deal-export.js',false,false],
 ['impact-map-pdf','Discovery Impact Map — PDF','internal',['pdf'],'Questionnaire + ROI Model v2.8 Registries','browser-print','public/impact-map.js',false,false],
 ['champion-pack-pptx','Champion Pack — PowerPoint','internal',['pptx'],'Executive Value Story + Internal Objection Guidance','browser','public/deal-export.js',false,false],
 ['role-one-pager-pptx','Role-specific One-Pager — PowerPoint','internal',['pptx'],'Executive Value Story','browser','public/deal-export.js',false,false],
 ['customer-share-html','Customer Business Case / Share Page','customer',['html'],'Published Customer-safe Business Case','browser-print','public/share.html',false,true]
].map(([outputId,displayName,audience,formats,authoritativeDataSource,generationMode,ownerModule,readinessRequired,customerSafe])=>Object.freeze({outputId,displayName,audience,formats:Object.freeze(formats),authoritativeDataSource,brandAudience:audience,logoRole:generationMode==='browser-print'||formats.includes('html')?'logoColor':'logoOfficeHighResolution',readinessRequired,customerSafe,generationMode,ownerModule}));
const byId=new Map(OUTPUTS.map(x=>[x.outputId,x]));
function getOutput(id){const item=byId.get(id);if(!item)throw new Error(`Unknown output: ${id}`);return item;}
function validateRegistry(){for(const x of OUTPUTS){if(!['customer','internal'].includes(x.audience))throw new Error(`${x.outputId}: invalid audience`);if(x.customerSafe!== (x.audience==='customer'))throw new Error(`${x.outputId}: customer-safe classification mismatch`);}return true;}
module.exports=Object.freeze({OUTPUTS:Object.freeze(OUTPUTS),getOutput,validateRegistry});

'use strict';
/* One-source adapter over the actual questionnaire rendered by Rep Discovery
   and the Prospect Link. It evaluates only the definition portion of
   public/discovery.js in an isolated server context, then applies the shared
   financial registry. This deliberately avoids a second hand-maintained map. */
const fs=require('fs'),path=require('path'),vm=require('vm');
const {classifyQuestion}=require('./questionnaire-roi-registry');
let api;
function definitionApi(){
 if(api)return api;
 const file=fs.readFileSync(path.join(__dirname,'..','..','public','discovery.js'),'utf8');
 const marker="if(typeof buildQuestionnaireRoiRegistry==='function')window.QUESTIONNAIRE_ROI_REGISTRY";
 const end=file.indexOf(marker);if(end<0)throw new Error('Questionnaire definition boundary not found.');
 const code=file.slice(0,end)+`;globalThis.__questionnaireApi={getProspectQuestions,getDiscoveryQuestions};`;
 const context={globalThis:null,window:{},console};context.globalThis=context;vm.createContext(context);vm.runInContext(code,context,{filename:'questionnaire-definitions-source.js'});api=context.__questionnaireApi;return api;
}
function getQuestionnaire(industry='default',{hasFieldInventory=false}={}){
 const sections=definitionApi().getProspectQuestions(industry,{hasFieldInventory});let order=0;
 return sections.map(section=>({section:String(section.section),questions:(section.questions||[]).map(q=>{const m=classifyQuestion(q,{industry,section:section.section});return{id:String(q.id),text:String(q.text),section:String(section.section),type:q.type||'text',classification:m.classification,canonicalInput:m.canonicalInput||null,unit:m.unit||null,conversion:m.conversion||'identity',placeholder:q.placeholder||'',displayOrder:order++};})}));
}
function flattenQuestionnaire(industry,options){return getQuestionnaire(industry,options).flatMap(s=>s.questions);}
module.exports={getQuestionnaire,flattenQuestionnaire};

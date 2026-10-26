'use strict';

/* One server-owned semantic model for every Executive presentation. The
   browser and file adapters may format this model, but may not resolve a
   second narrative source or invent readiness independently. */
const crypto=require('crypto');
const {buildExecutiveValueStory}=require('./executive-value-story');
const {evaluateExecutiveOutputReadiness}=require('./executive-output-readiness');
const {resolveExecutiveNarrative}=require('./executive-narrative');

const text=value=>String(value==null?'':value).trim();
const iso=value=>{const date=new Date(value);return Number.isFinite(date.getTime())?date.toISOString():null;};
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,24);

function canonicalNarrativeProjection(data={}){
 const narrative=resolveExecutiveNarrative(data);
 return Object.freeze(Object.fromEntries(Object.entries(narrative).map(([key,item])=>[key,Object.freeze({
  value:item.value||null,
  established:Boolean(item.value),
  explicitlyCleared:Boolean(item.explicitlyCleared),
  source:text(item.meta?.source)||(item.value?'historical_unknown':'empty'),
  validationStatus:text(item.meta?.validationStatus)||(item.value?'Needs validation':'To validate'),
  updatedAt:iso(item.meta?.updatedAt)
 })])));
}

function executiveNarrativeRevision(data={}){
 return hash(canonicalNarrativeProjection(data));
}

function buildExecutiveOutputModel(source={},options={}){
 if(!source.scenario||!source.scenario.data)throw new Error('A saved scenario is required to build the Executive output model.');
 const outputType=String(options.outputType||'executive_view');
 const story=options.story||buildExecutiveValueStory(source);
 const readiness=evaluateExecutiveOutputReadiness(story,{outputType,proposalState:options.proposalState||{}});
 const canonicalNarrative=canonicalNarrativeProjection(source.scenario.data);
 const narrativeRevision=executiveNarrativeRevision(source.scenario.data);
 const scenarioUpdatedAt=iso(source.scenario.updated_at);
 const revision=Object.freeze({
  scenarioId:String(source.scenario.id),
  scenarioVersion:Number(source.scenario.version)||null,
  scenarioUpdatedAt,
  narrativeRevision,
  storyRevision:story.storyRevision,
  modelRevision:hash({scenarioId:source.scenario.id,scenarioVersion:source.scenario.version,scenarioUpdatedAt,narrativeRevision,storyRevision:story.storyRevision,outputType,readiness:readiness.status})
 });
 return Object.freeze({schemaVersion:'1.0',outputType,revision,canonicalNarrative,story,readiness});
}

module.exports={buildExecutiveOutputModel,canonicalNarrativeProjection,executiveNarrativeRevision};

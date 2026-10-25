'use strict';

const text=value=>String(value==null?'':value).trim();
const owns=(object,key)=>Object.prototype.hasOwnProperty.call(object||{},key);

/* The named fields below are the long-lived compatibility mirrors. New and
   legacy scenarios are projected into one canonical narrative before any
   output model sees them. */
function resolveExecutiveNarrative(data={}){
 const canonical=data.executiveNarrative?.threeWhys||{};
 const legacyMeta=data.threeWhysMeta||{};
 const entry=(key,legacyKey)=>{
  const hasCanonical=owns(canonical,key),stored=hasCanonical?canonical[key]:undefined;
  const hasCanonicalValue=hasCanonical&&stored&&typeof stored==='object'&&owns(stored,'value');
  const raw=hasCanonical?(hasCanonicalValue?stored.value:stored):data[legacyKey];
  return Object.freeze({
   value:text(raw),
   meta:{...legacyMeta[key],...(stored&&typeof stored==='object'&&stored.meta||{})},
   canonical:hasCanonical,
   explicitlyCleared:hasCanonical&&(raw===null||text(raw)==='')
  });
 };
 return Object.freeze({
  whyChange:entry('whyChange','threeWhysAct'),
  whyNow:entry('whyNow','threeWhysNow'),
  whyCloudInventory:entry('whyCloudInventory','threeWhysCi')
 });
}

function persistExecutiveNarrative(data={},values={},meta={}){
 const current=resolveExecutiveNarrative(data);
 const update=(canonicalKey,legacyKey)=>{
  const present=owns(values,legacyKey)||owns(values,canonicalKey);
  const raw=owns(values,legacyKey)?values[legacyKey]:owns(values,canonicalKey)?values[canonicalKey]:undefined;
  const cleared=present&&(raw===null||text(raw)==='');
  const value=present?(cleared?null:text(raw)):(current[canonicalKey].explicitlyCleared?null:current[canonicalKey].value);
  const nextMeta=cleared
   ?{...(meta[canonicalKey]||{}),source:'empty',validationStatus:'To validate',updatedAt:new Date().toISOString()}
   :{...current[canonicalKey].meta,...(meta[canonicalKey]||{})};
  return {value,meta:nextMeta};
 };
 const resolved={
  whyChange:update('whyChange','threeWhysAct'),
  whyNow:update('whyNow','threeWhysNow'),
  whyCloudInventory:update('whyCloudInventory','threeWhysCi')
 };
 return {
  ...data,
  executiveNarrative:{schemaVersion:1,threeWhys:resolved},
  threeWhysAct:resolved.whyChange.value,
  threeWhysNow:resolved.whyNow.value,
  threeWhysCi:resolved.whyCloudInventory.value,
  threeWhysMeta:{whyChange:resolved.whyChange.meta,whyNow:resolved.whyNow.meta,whyCloudInventory:resolved.whyCloudInventory.meta}
 };
}

module.exports={resolveExecutiveNarrative,persistExecutiveNarrative};

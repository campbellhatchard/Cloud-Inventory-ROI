'use strict';

const text=value=>String(value==null?'':value).trim();

/* The named fields below are the long-lived compatibility mirrors. New and
   legacy scenarios are projected into one canonical narrative before any
   output model sees them. */
function resolveExecutiveNarrative(data={}){
 const canonical=data.executiveNarrative?.threeWhys||{};
 const legacyMeta=data.threeWhysMeta||{};
 return Object.freeze({
  whyChange:Object.freeze({value:text(canonical.whyChange?.value??canonical.whyChange??data.threeWhysAct),meta:{...legacyMeta.whyChange,...(canonical.whyChange?.meta||{})}}),
  whyNow:Object.freeze({value:text(canonical.whyNow?.value??canonical.whyNow??data.threeWhysNow),meta:{...legacyMeta.whyNow,...(canonical.whyNow?.meta||{})}}),
  whyCloudInventory:Object.freeze({value:text(canonical.whyCloudInventory?.value??canonical.whyCloudInventory??data.threeWhysCi),meta:{...legacyMeta.whyCloudInventory,...(canonical.whyCloudInventory?.meta||{})}})
 });
}

function persistExecutiveNarrative(data={},values={},meta={}){
 const current=resolveExecutiveNarrative(data);
 const resolved={
  whyChange:{value:text(values.threeWhysAct??values.whyChange??current.whyChange.value),meta:{...current.whyChange.meta,...(meta.whyChange||{})}},
  whyNow:{value:text(values.threeWhysNow??values.whyNow??current.whyNow.value),meta:{...current.whyNow.meta,...(meta.whyNow||{})}},
  whyCloudInventory:{value:text(values.threeWhysCi??values.whyCloudInventory??current.whyCloudInventory.value),meta:{...current.whyCloudInventory.meta,...(meta.whyCloudInventory||{})}}
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

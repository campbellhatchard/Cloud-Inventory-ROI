(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.CIInternalFieldContext=api;
}(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function text(node){return node&&typeof node.textContent==='string'?node.textContent.trim():'';}
  function unitsFor(id){
    if(/revenue|cost|value|writeoff|invest|spend/i.test(id))return'Currency';
    if(/pct|rate|otif|accuracy|ramp|discount/i.test(id))return'Percentage';
    return'';
  }
  function buildInternalFieldContext(fieldId,doc,options={}){
    const id=String(fieldId||'');
    const field=id&&doc&&typeof doc.getElementById==='function'?doc.getElementById(id):null;
    const wrap=field&&typeof field.closest==='function'?field.closest('.field'):null;
    const label=wrap&&typeof wrap.querySelector==='function'?wrap.querySelector('label'):null;
    const pane=doc&&typeof doc.querySelector==='function'?doc.querySelector('.pane.active'):null;
    const paneId=pane&&pane.id||'';
    const section=field&&typeof field.closest==='function'?field.closest('.card,.accordion,.sf-section'):null;
    const sectionTitle=section&&typeof section.querySelector==='function'?section.querySelector('.card-title,.acc-title,h2,h3'):null;
    const hint=wrap&&typeof wrap.querySelector==='function'?wrap.querySelector('.field-hint'):null;
    const labels=options.labels||{},workspaces=options.workspaces||{};
    const fieldLabel=text(label)||String(labels[id]||id);
    return{
      audience:'Internal User',screen:workspaces[paneId]||paneId,section:text(sectionTitle),field:id,
      fieldLabel,question:fieldLabel,description:field&&typeof field.getAttribute==='function'?(field.getAttribute('title')||text(hint)):text(hint),
      inputType:field?String(field.type||field.tagName||''):'',units:unitsFor(id),existingValue:field&&field.value!=null?String(field.value):'',
      relevantPriorInputs:[],allowedContext:'Application usage and field explanation',contextClassification:'Internal'
    };
  }
  return Object.freeze({buildInternalFieldContext});
}));

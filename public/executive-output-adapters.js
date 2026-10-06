/* Presentation adapters only. Facts come from the authoritative Executive
   Value Story, or from the explicitly marked safe browser draft. Legacy
   narrative rendering is never a customer-output fallback. */
(function(){
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=(n,c)=>{if(!window.CIEconomicAvailability.hasEconomicValue(n))return'N/A';const x=Number(n),s={USD:'$',GBP:'£',EUR:'€',AUD:'$',NZD:'$'}[c]||'';return s+x.toLocaleString(undefined,{maximumFractionDigits:0})+(['AUD','NZD'].includes(c)?' '+c:'');};
function storyHtml(story,{draft=false,audience='customer'}={}){
 if(!['customer','internal'].includes(audience))throw new Error('Unsupported Executive document audience.');
 const e=story.economics,c=story.meta.currency,why=story.threeWhys,drivers=e.activeDrivers.slice(0,5),max=Math.max(1,...drivers.map(d=>Number(d.annualValue)||0));
 const whys=[['Why Change',why.whyChange],['Why Now',why.whyNow],['Why Cloud Inventory',why.whyCloudInventory]].map(([l,x])=>`<article class="e-why-card"><strong>${l}</strong><p>${esc(x.value)}</p><small>${esc(x.status)}</small></article>`).join('');
 const bars=drivers.map((d,i)=>{const pct=e.annualBenefit?Math.round(Number(d.annualValue)/Number(e.annualBenefit)*100):0,width=Math.round(Number(d.annualValue)/max*100);return `<div class="e-bar-row"><span class="e-bar-lbl">${esc(d.label)}</span><div class="e-bar-track"><div class="e-bar-fill" style="width:${width}%;background:var(--chart-${i+1},var(--cyan))"></div></div><span class="e-bar-pct">${pct}%</span><strong class="e-bar-val">${money(d.annualValue,c)}</strong><small>${esc(d.status)}</small></div>`;}).join('');
 const proof=(story.customerProof||[]).slice(0,3).map(p=>`<article class="e-why-card"><strong>${esc(p.customerName||p.name||'Approved customer')}</strong><p>${esc(p.outcome||p.summary||'')}</p></article>`).join('');
 const years=e.contractYears||[],chartMax=Math.max(1,...years.flatMap(x=>[Number(x.cumulativeBenefit)||0,Number(x.cumulativeInvestment)||0,Math.max(0,Number(x.cumulativeNetBenefit)||0)])),timeline=years.map(x=>`<div class="e-year-col"><div class="e-year-bars"><i class="benefit" style="height:${Math.round(100*x.cumulativeBenefit/chartMax)}%" title="Benefit ${money(x.cumulativeBenefit,c)}"></i><i class="investment" style="height:${Math.round(100*x.cumulativeInvestment/chartMax)}%" title="Investment ${money(x.cumulativeInvestment,c)}"></i><i class="net" style="height:${Math.round(100*Math.max(0,x.cumulativeNetBenefit)/chartMax)}%" title="Net value ${money(x.cumulativeNetBenefit,c)}"></i></div><strong>Year ${x.year}</strong><small>${window.CIEconomicAvailability.hasEconomicValue(x.cumulativeRoi)?Math.round(Number(x.cumulativeRoi))+'% ROI':'ROI N/A'}</small></div>`).join('');
 const classification=audience==='internal'?'<div class="proposal-review-notice"><b>CONFIDENTIAL — INTERNAL USE ONLY</b><br><b>DRAFT — NOT READY FOR CUSTOMER SHARING</b></div>':draft?'<div class="proposal-review-notice"><b>REVIEW BEFORE SHARING</b></div>':'';
 return `${classification}<div class="e-cover"><img src="${window.CIBrand.logo('logoColor')}" alt="Cloud Inventory"><div class="e-tagline">Executive Business Case</div><div class="e-company">${esc(story.meta.customer)}</div><div class="e-date">${esc(story.meta.solution)} · ${esc(story.meta.generatedAt.slice(0,10))}</div></div><div class="e-body"><section class="e-section"><div class="e-h2">Executive Value Story</div><div class="e-whys-grid">${whys}</div></section><section class="e-section"><div class="e-h2">Financial Case · ${esc(e.maturity.display)}</div><div class="e-kpi-grid"><div><span>Annual Customer Benefit</span><strong>${money(e.annualBenefit,c)}</strong></div><div><span>Total Contract Benefit</span><strong>${money(e.totalContractBenefit,c)}</strong></div><div><span>Modeled Customer Investment</span><strong>${money(e.totalContractInvestment,c)}</strong></div><div><span>Net Economic Benefit</span><strong>${money(e.netEconomicBenefit,c)}</strong></div><div><span>Contract ROI</span><strong>${window.CIEconomicAvailability.percent(e.contractRoi)}</strong></div><div><span>NPV</span><strong>${money(e.npv,c)}</strong></div><div><span>Payback</span><strong>${window.CIEconomicAvailability.paybackLabel(e)}</strong></div><div><span>Customer-Supported Value</span><strong>${e.customerSupportedValuePct}%</strong></div></div><p class="e-note">All values in ${esc(c)}; no FX conversion.</p></section>${timeline?`<section class="e-section"><div class="e-h2">Contract Value Over Time</div><div class="e-timeline-legend"><span class="benefit">Benefit</span><span class="investment">Investment</span><span class="net">Net value</span></div><div class="e-timeline-chart">${timeline}</div></section>`:''}<section class="e-section"><div class="e-h2">Modeled Value Drivers</div>${bars||'<p>No modeled value drivers yet.</p>'}</section><section class="e-section"><div class="e-h2">Solution Alignment</div>${story.solutionAlignment.exists?`<p>${esc(story.solutionAlignment.products.join(', '))}${story.solutionAlignment.systemOfRecord?' · System of record: '+esc(story.solutionAlignment.systemOfRecord):''}${story.solutionAlignment.integrationApproach?' · Integration: '+esc(story.solutionAlignment.integrationApproach):''}</p>`:'<p>Solution alignment to validate.</p>'}<p><b>ROI modeling assumption:</b> ${story.implementationContext.modelingMonths||0} months to implementation/go-live. This is not a delivery commitment.</p></section>${proof?`<section class="e-section"><div class="e-h2">Approved Customer Proof</div><div class="e-whys-grid">${proof}</div></section>`:''}<section class="e-section"><div class="e-h2">Joint Next Steps</div>${story.nextSteps.items.length?`<ul>${story.nextSteps.items.slice(0,5).map(x=>`<li>${esc(x.milestone)} — ${esc(x.owner)}${x.dueDate?' — '+esc(x.dueDate):''}</li>`).join('')}</ul>`:`<p>${esc(story.nextSteps.message)}</p>`}</section><div class="proposal-footer">${window.CIBrand.audience(audience)}</div></div>`;
}
function renderStory(story,readiness){const status=readiness?.status;if(!['ready','review','draft_only'].includes(status))throw new Error('Executive readiness is unavailable.');const audience=status==='draft_only'?'internal':'customer',draft=status!=='ready';const el=document.getElementById('execDoc');if(el)el.innerHTML=`<div id="execPrintTarget">${storyHtml(story,{draft,audience})}</div>`;const drivers=(story.economics.activeDrivers||[]).slice(0,5),rows=drivers.map(d=>({label:d.label,val:Number(d.annualValue)||0}));if(typeof _execPopulateSidebar==='function')_execPopulateSidebar(rows,story.economics.annualBenefit,0);else{const side=document.getElementById('execSideBreakdown');if(side)side.innerHTML=drivers.length?'': '<div class="empty-state">No modeled value drivers yet.</div>';}renderExecutiveReadinessBanner?.();}
function renderStoryError(){showExecutiveValueStoryUnavailable();}
window.renderExec=async function(){if(!window._calcScenarioId){renderStoryError();return;}const el=document.getElementById('execDoc');if(el)el.innerHTML='<div class="card">Executive Value Story loading…</div>';try{if(window.persistThreeWhys&&!await window.persistThreeWhys())throw Error('The latest Three Whys could not be saved.');const [story,readiness]=await Promise.all([window.loadExecutiveValueStory(true),window.getExecutiveOutputReadiness('executive_view')]);renderStory(story,readiness);}catch(error){console.error('executive_web.failed_closed',{message:error?.message});renderStoryError();}};
function exportButton(kind,label,disabled){const btn=document.getElementById(kind==='pptx'?'pptxExportBtn':'pdfDownloadBtn');if(btn){btn.disabled=disabled;btn.dataset.originalLabel=btn.dataset.originalLabel||btn.innerHTML;if(disabled)btn.textContent=label;else btn.innerHTML=btn.dataset.originalLabel;}}
const EXECUTIVE_EXPORT_TIMEOUT_MS=30000;
function withExecutiveExportDeadline(label,task){
 const controller=typeof AbortController==='function'?new AbortController():null;
 let timer;
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller?.abort();const error=new Error(`${label} generation timed out. Please retry.`);error.name='ExportTimeoutError';reject(error);},EXECUTIVE_EXPORT_TIMEOUT_MS);});
 return Promise.race([Promise.resolve().then(()=>task(controller?.signal)),timeout]).finally(()=>clearTimeout(timer));
}
window.CIOutputRuntime=Object.freeze({withDeadline:withExecutiveExportDeadline,downloadBlob});
function downloadBlob(blob,name){if(!(blob instanceof Blob)||blob.size===0)throw new Error('The generated file was empty. Please retry.');const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.rel='noopener';a.style.display='none';document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(url);},30000);}
function showPdfBlocked(){console.warn('executive_pdf.popup_blocked');let box=document.getElementById('pdfPopupFallback');if(!box){box=document.createElement('div');box.id='pdfPopupFallback';box.className='proposal-review-notice';box.innerHTML='<b>Your browser blocked the PDF window.</b> <button class="btn btn-primary btn-sm" type="button" onclick="downloadPDF()">Open PDF</button>';const host=document.getElementById('executiveReadinessBanner')||document.getElementById('execDoc');host?.prepend(box);}showToast?.('Your browser blocked the PDF window. Use Open PDF to retry.');}
function showPptRetry(){let box=document.getElementById('pptxRetryNotice');if(!box){box=document.createElement('div');box.id='pptxRetryNotice';box.className='proposal-review-notice';box.innerHTML='<b>PowerPoint could not be generated.</b> <button class="btn btn-secondary btn-sm" type="button" onclick="exportToPowerPoint()">Retry</button>';const host=document.getElementById('executiveReadinessBanner')||document.getElementById('execDoc');host?.prepend(box);}}
async function prepareExecutiveOutput(outputType,readinessGuard){
 const state=window.getExecutiveOutputPersistenceState?.()||{scenarioId:window._calcScenarioId||null,calculatorDirty:false,narrativeDirty:false,appliedValueDraftCount:0};
 if(!window.CIExecutiveOutputPreconditions)throw new Error(outputType==='pptx'?'Save the scenario before creating an Executive PowerPoint.':'Save the scenario before creating a customer PDF or other Executive output.');
 const saved=window.CIExecutiveOutputPreconditions.inspectExecutiveOutputState(state,{outputType});
 if(!saved.ok)throw new Error(saved.message);
 return (readinessGuard||(()=>guardExecutiveOutput(outputType,{allowDraft:true})))();
}
window.exportToPowerPoint=async function(){
 console.info('executive_pptx.client_started',{savedScenario:Boolean(window._calcScenarioId)});exportButton('pptx','Creating PowerPoint…',true);
 try{
  /* Readiness is an intentional user decision and must not consume the file
     generation deadline. Start the deadline only after the user continues. */
  const gate=await prepareExecutiveOutput('pptx',()=>guardExecutiveOutput('pptx',{allowDraft:true}));if(!gate.proceed)return;
  await withExecutiveExportDeadline('PowerPoint',async signal=>{
   const qs=new URLSearchParams({internalDraft:String(Boolean(gate.draft)),reviewAcknowledged:String(gate.result?.status==='review')});
   const res=await fetch(`/api/scenarios/${encodeURIComponent(window._calcScenarioId)}/export-pptx?${qs}`,{credentials:'same-origin',headers:{Accept:'application/vnd.openxmlformats-officedocument.presentationml.presentation'},...(signal?{signal}:{})});
   if(!res.ok){let detail={};try{detail=await res.json();}catch(_){}throw new Error(detail.error||`PowerPoint request failed (${res.status}).`);}
   const blob=await res.blob(),customer=(window.executiveValueStory?.meta?.customer||'Prospect').replace(/[^a-z0-9]+/gi,'-');
   downloadBlob(blob,`Cloud-Inventory-ROI-${customer}-Executive-Review-${new Date().toISOString().slice(0,10)}.pptx`);document.getElementById('pptxRetryNotice')?.remove();console.info('executive_pptx.client_completed',{bytes:blob.size});showToast?.('PowerPoint created.');
  });
 }catch(err){const message=err.name==='AbortError'||err.name==='ExportTimeoutError'?'PowerPoint generation timed out. Please retry.':(err.message||'PowerPoint could not be generated. Please retry.');console.error('executive_pptx.client_failed',{message});showPptRetry();showToast?.(message);}
 finally{exportButton('pptx','Creating PowerPoint…',false);}
};
const authoritativePptButton=document.getElementById('pptxExportBtn');if(authoritativePptButton){authoritativePptButton.disabled=false;authoritativePptButton.removeAttribute('aria-disabled');authoritativePptButton.dataset.authoritativeAdapter='ready';}
window.downloadPDF=async function(){
 exportButton('pdf','Preparing PDF…',true);console.info('executive_pdf.started',{savedScenario:Boolean(window._calcScenarioId)});
 try{
  /* The user may take as long as needed to review governed readiness. The
     bounded deadline protects only the actual network generation request. */
  const gate=await prepareExecutiveOutput('pdf',()=>guardExecutiveOutput('pdf',{allowDraft:true}));if(!gate.proceed)return;
  await withExecutiveExportDeadline('PDF',async signal=>{
   const qs=new URLSearchParams({internalDraft:String(Boolean(gate.draft)),reviewAcknowledged:String(gate.result?.status==='review')});
   const res=await fetch(`/api/scenarios/${encodeURIComponent(window._calcScenarioId)}/export-pdf?${qs}`,{credentials:'same-origin',headers:{Accept:'application/pdf'},...(signal?{signal}:{})});
   if(!res.ok){let detail={};try{detail=await res.json();}catch(_){}throw new Error(detail.error||`PDF request failed (${res.status}).`);}
   const blob=await res.blob(),customer=(window.executiveValueStory?.meta?.customer||'Prospect').replace(/[^a-z0-9]+/gi,'-');
   downloadBlob(blob,`Cloud-Inventory-ROI-${customer}-${new Date().toISOString().slice(0,10)}.pdf`);document.getElementById('pdfPopupFallback')?.remove();console.info('executive_pdf.completed',{bytes:blob.size});showToast?.('PDF created.');
  });
 }catch(err){const message=err.name==='AbortError'||err.name==='ExportTimeoutError'?'PDF generation timed out. Please retry.':(err.message||'PDF could not be generated.');console.error('executive_pdf.failed',{message});window.logClientError?.(message,'executive_pdf','error');showOutputRetry('executivePdfRetry',message,'Retry',window.downloadPDF);showToast?.(message);}
 finally{exportButton('pdf','Preparing PDF…',false);}
};
window.exportExecutiveWord=async function(){const btn=document.getElementById('executiveWordBtn'),old=btn?.innerHTML;if(btn){btn.disabled=true;btn.textContent='Building Word…';}try{const gate=await prepareExecutiveOutput('docx');if(!gate.proceed)return;const qs=new URLSearchParams({internalDraft:String(Boolean(gate.draft)),reviewAcknowledged:String(gate.result?.status==='review')});const res=await fetch(`/api/scenarios/${encodeURIComponent(window._calcScenarioId)}/export-docx?${qs}`,{credentials:'same-origin',headers:{Accept:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}});if(!res.ok){let detail={};try{detail=await res.json();}catch(_){}throw new Error(detail.error||`Word request failed (${res.status}).`);}const blob=await res.blob(),customer=(window.executiveValueStory?.meta?.customer||'Prospect').replace(/[^a-z0-9]+/gi,'-');downloadBlob(blob,`Cloud-Inventory-ROI-${customer}-Business-Case-${new Date().toISOString().slice(0,10)}.docx`);document.getElementById('executiveWordRetry')?.remove();showToast?.('Word document created.');}catch(err){console.error('executive_docx.failed',{message:err.message});showOutputRetry('executiveWordRetry',err.message||'Word document could not be generated.','Retry',window.exportExecutiveWord);showToast?.(err.message||'Word document could not be generated.');}finally{if(btn){btn.disabled=false;btn.innerHTML=old||'Executive business case';}}};
function showOutputRetry(id,message,label,handler){let box=document.getElementById(id);if(!box){box=document.createElement('div');box.id=id;box.className='proposal-review-notice';box.innerHTML=`<b>${esc(message)}</b> <button class="btn btn-secondary btn-sm" type="button">${esc(label)}</button>`;box.querySelector('button').onclick=handler;(document.getElementById('executiveReadinessBanner')||document.getElementById('proposalEditorWrap')||document.body).prepend(box);}}
let proposalExportInFlight=null;
async function prepareProposalFileExport(){
 if(!await window.flushProposalSave?.())throw new Error('The proposal could not be saved. Retry after confirming the save status.');
 const local=window.getProposalOutputState?.()||{};
 if(local.saveFailed||local.conflict||local.dirty)throw new Error('Resolve proposal save issues before exporting.');
 return guardExecutiveOutput('proposal',{allowDraft:true});
}
async function requestProposalFile({format,label,gate,retryId,signal}){
 const endpoint=format==='pdf'?'/api/export/proposal-pdf':'/api/export/proposal-docx';
 const accept=format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
 const res=await fetch(endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',Accept:accept},body:JSON.stringify({scenarioId:window._calcScenarioId,internalDraft:gate.draft,reviewAcknowledged:gate.result?.status==='review'}),...(signal?{signal}:{})});
 if(!res.ok){let detail={};try{detail=await res.json();}catch(_){}throw new Error(detail.error||`${label} request failed (${res.status}).`);}
 const blob=await res.blob(),customer=(window.executiveValueStory?.meta?.customer||'Customer').replace(/[^a-z0-9]+/gi,'-'),extension=format==='pdf'?'pdf':'docx';
 downloadBlob(blob,`Cloud-Inventory-${gate.draft?'Internal-Draft-Proposal':'Proposal'}-${customer}-${new Date().toISOString().slice(0,10)}.${extension}`);
 document.getElementById(retryId)?.remove();
 console.info(`proposal_${format}.client_completed`,{bytes:blob.size});
 showToast?.(`${label} document created.`);
}
async function proposalFileExport({format,buttonId,retryId}){
 if(proposalExportInFlight){showToast?.('A Proposal export is already in progress.');return proposalExportInFlight;}
 const btn=document.getElementById(buttonId),old=btn?.innerHTML,label=format==='pdf'?'PDF':'Word';
 proposalExportInFlight=(async()=>{
  if(btn){btn.disabled=true;btn.textContent=`Preparing ${label}…`;}
  try{
   /* Saving, readiness evaluation, and the user's governed readiness choice
      are preflight steps. A human review decision must never consume the
      bounded network/PDF generation deadline. */
   const gate=await prepareProposalFileExport();
   if(!gate?.proceed)return;
   if(btn)btn.textContent=`Building ${label}…`;
   console.info(`proposal_${format}.client_started`,{scenarioId:window._calcScenarioId,draft:Boolean(gate.draft)});
   await withExecutiveExportDeadline(`Proposal ${label}`,signal=>requestProposalFile({format,label,gate,retryId,signal}));
  }catch(err){
   const message=err.name==='AbortError'||err.name==='ExportTimeoutError'?`Proposal ${label} generation timed out. You can continue working and retry.`:(err.message||`Proposal ${label} could not be generated.`);
   console.error(`proposal_${format}.failed`,{message});
   showOutputRetry(retryId,message,'Retry',format==='pdf'?window.proposalPrint:window.proposalExportWord);
   showToast?.(message);
  }finally{if(btn){btn.disabled=false;btn.innerHTML=old||`Export ${label}`;}}
 })();
 try{return await proposalExportInFlight;}finally{proposalExportInFlight=null;}
}
window.proposalExportWord=()=>proposalFileExport({format:'docx',buttonId:'proposalWordBtn',retryId:'proposalWordRetry'});
window.proposalPrint=()=>proposalFileExport({format:'pdf',buttonId:'proposalPdfBtn',retryId:'proposalPdfRetry'});
if(typeof window.shareBusinessCase==='function'){const coreShare=window.shareBusinessCase;window.shareBusinessCase=async function(){const gate=await guardExecutiveOutput('share',{allowDraft:false});if(gate.proceed)return coreShare.apply(this,arguments);};}
window.renderExecutiveStoryDocument=storyHtml;window.renderExecutiveProposalDocument=(story,options={})=>window.CIProposalOutputBuilder.buildProposalOutputHtml({story,proposal:window.proposalDraft||{},audience:options.audience||(options.draft?'internal':'customer'),draft:Boolean(options.draft),review:Boolean(options.review),brand:window.CIBrand,economicAvailability:window.CIEconomicAvailability});
}());

window.initializeProposalOutputControls=function(){const pdf=document.getElementById('proposalPdfBtn'),word=document.getElementById('proposalWordBtn');if(pdf){pdf.disabled=false;pdf.setAttribute('aria-disabled','false');pdf.onclick=window.proposalPrint;}if(word){word.disabled=false;word.setAttribute('aria-disabled','false');word.onclick=window.proposalExportWord;}const notes=document.querySelector?.('textarea[oninput*="commercialTerms"]')?.closest?.('label');if(notes&&!notes.querySelector('.internal-commercial-label'))notes.insertAdjacentHTML('afterbegin','<strong class="internal-commercial-label">CONFIDENTIAL — INTERNAL USE ONLY<br></strong>');};window.initializeProposalOutputControls();

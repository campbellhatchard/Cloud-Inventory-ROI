/* Shared presentation primitives for governed operational decks.
   Executive PowerPoint generation is owned exclusively by
   public/executive-output-adapters.js and the server export route. */
const PPT=window.CIBrand.officeTheme();
const PPT_CURRENCY={USD:{symbol:'$'},GBP:{symbol:'£'},EUR:{symbol:'€'},AUD:{symbol:'A$'},NZD:{symbol:'NZ$'}};
function pptMoney(value,currency){if(!window.CIEconomicAvailability?.hasEconomicValue(value))return'Not yet established';const n=Number(value),c=PPT_CURRENCY[currency]||PPT_CURRENCY.USD;if(!Number.isFinite(n))return'Not yet established';const a=Math.abs(n),v=a>=1e9?(n/1e9).toFixed(1)+'B':a>=1e6?(n/1e6).toFixed(1)+'M':a>=1e3?Math.round(n/1e3)+'K':Math.round(n);return c.symbol+v;}
function pptFooter(slide,{audience='customer',draft=false}={}){slide.addText(window.CIBrand.audience(audience),{x:5.4,y:PPT.H-.42,w:4.4,h:.22,fontSize:7.5,color:PPT.GRAY_TXT,align:'right',fontFace:PPT.FONT});if(draft)slide.addText('DRAFT — opportunity has not been saved',{x:.75,y:PPT.H-.42,w:3.5,h:.22,fontSize:7.5,bold:true,color:PPT.ORANGE,fontFace:PPT.FONT});}
function pptChrome(slide,{page='',audience='customer',draft=false}={}){slide.background={color:PPT.GRAY_BG};slide.addImage({path:PPT.LOGO,x:.38,y:.3,w:PPT.LOGO_W,h:PPT.LOGO_H});slide.addText(String(page),{x:.15,y:PPT.H-.42,w:.5,h:.3,fontSize:9,bold:true,color:PPT.NAVY,fontFace:PPT.FONT});pptFooter(slide,{audience,draft});}
function pptTitle(slide,value){slide.addText(value,{x:.45,y:.82,w:8.8,h:.55,fontSize:28,bold:true,color:PPT.CYAN,fontFace:PPT.FONT});}
let pptxReadyPromise=null;
function normalizePptxGlobal(){if(typeof window.pptxgen!=='function'&&typeof window.PptxGenJS==='function')window.pptxgen=window.PptxGenJS;return typeof window.pptxgen==='function';}
function loadPptxDependency(src,ready){return new Promise((resolve,reject)=>{if(ready())return resolve();const script=document.createElement('script');script.src=src;script.async=true;script.onload=()=>ready()?resolve():reject(new Error('PowerPoint dependency unavailable'));script.onerror=()=>reject(new Error('Unable to load '+src));document.head.appendChild(script);});}
async function ensurePptxReady(){if(typeof window.JSZip==='function'&&normalizePptxGlobal())return true;if(!pptxReadyPromise)pptxReadyPromise=(async()=>{if(typeof window.JSZip!=='function')await loadPptxDependency('/jszip.min.js',()=>typeof window.JSZip==='function');if(!normalizePptxGlobal())await loadPptxDependency('/pptxgen.min.js',normalizePptxGlobal);})();try{await pptxReadyPromise;return true;}catch(error){pptxReadyPromise=null;showToast?.('PowerPoint components could not be loaded. Refresh the page and try again.');return false;}}
window.ensurePptxReady=ensurePptxReady;
const executivePptButton=document.getElementById('pptxExportBtn');
if(executivePptButton){executivePptButton.disabled=true;executivePptButton.setAttribute('aria-disabled','true');}

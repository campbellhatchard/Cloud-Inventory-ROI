'use strict';
const brand=require('./brand-system');
function safeFile(value){return String(value||'Customer').normalize('NFKD').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,80)||'Customer';}
function dateStamp(value=new Date()){return new Date(value).toISOString().slice(0,10);}
function fileName(kind,customer,ext,date=new Date()){return `Cloud-Inventory-${safeFile(kind)}-${safeFile(customer)}-${dateStamp(date)}.${ext}`;}
function pptFooter(slide,audience='customer'){const t=brand.officeTheme();slide.addText(brand.audience(audience),{x:4.8,y:t.H-.3,w:4.75,h:.15,fontFace:t.FONT,fontSize:7,color:t.GRAY_TXT,align:'right'});}
module.exports={safeFile,dateStamp,fileName,pptFooter};

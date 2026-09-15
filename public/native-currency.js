(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CINativeCurrency=api;})(typeof self!=='undefined'?self:this,function(){'use strict';
const SUPPORTED=new Set(['USD','GBP','EUR','AUD','NZD']);
function formatCompactCurrency(value,currency){const code=String(currency||'USD').toUpperCase(),safe=SUPPORTED.has(code)?code:'USD',n=Number(value)||0;return new Intl.NumberFormat('en-US',{style:'currency',currency:safe,currencyDisplay:'narrowSymbol',notation:'compact',maximumFractionDigits:1}).format(n).replace(/^\$(?=\d)/,safe==='AUD'?'A$':safe==='NZD'?'NZ$':'$');}
return{SUPPORTED,formatCompactCurrency};});

'use strict';
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
const files=['public/business-case.js','public/business-case.html','public/print.html','public/executive-output-adapters.js','src/shared/customer-roi-report.js','src/exports/executive-pdf.js','src/exports/executive-pptx.js','src/exports/executive-docx.js'];
const patterns=[/calcROI\s*\(/,/annualBenefit\s*\/\s*(12|2)\b/,/Cost of Delay/i,/cost of delayed action/i,/annualBenefit\s*\*\s*(0?\.7|1\.3)\b/];
const failures=[];for(const f of files){const source=fs.readFileSync(path.join(root,f),'utf8');for(const p of patterns)if(p.test(source))failures.push(`${f}: ${p}`);}
const publicRoute=fs.readFileSync(path.join(root,'src/routes/business-case-shares.js'),'utf8');if(/SELECT[^`]*\bs\.data\b|JOIN scenarios|is_current/.test(publicRoute))failures.push('Public Business Case must read frozen customer-safe payload only');
const index=fs.readFileSync(path.join(root,'public/index.html'),'utf8');if(/id="scenarioModeBar"|print\.html#data/.test(index))failures.push('Retired executive control/path is active');
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}else console.log('Active output prohibited-pattern audit passed.');

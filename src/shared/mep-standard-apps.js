'use strict';
const catalog = require('../../config/mep-standard-apps.json');
const EXPECTED_COUNTS = Object.freeze({ JDE:31, EBS:14, 'Oracle Fusion':31, 'SAP ECC6':12, 'SAP Hana':12 });

function validateCatalog(value=catalog) {
  if (!value || value.catalogId !== 'mep-standard-apps' || value.catalogVersion !== '2026-08') throw new Error('Invalid MEP catalog metadata.');
  for (const [erp,count] of Object.entries(EXPECTED_COUNTS)) {
    const apps=value.erps?.[erp];
    if (!Array.isArray(apps) || apps.length !== count) throw new Error(`${erp} must contain exactly ${count} standard apps.`);
    if (new Set(apps).size !== apps.length || apps.some(x=>!x || x!==x.trim())) throw new Error(`${erp} contains duplicate or invalid application names.`);
  }
  if (Object.keys(value.erps||{}).length !== Object.keys(EXPECTED_COUNTS).length) throw new Error('Unexpected ERP in MEP catalog.');
  return true;
}

function browserCatalog(){ validateCatalog(); return JSON.parse(JSON.stringify(catalog)); }
function appsFor(erp){ validateCatalog(); return (catalog.erps[erp]||[]).slice(); }
validateCatalog();
module.exports={catalog,EXPECTED_COUNTS,validateCatalog,browserCatalog,appsFor};

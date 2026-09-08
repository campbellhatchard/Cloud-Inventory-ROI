'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const brand = require('../src/shared/brand-system');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
function lum(hex){const rgb=hex.replace('#','').match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4));return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];}
function contrast(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
test('canonical brand source and generated assets do not drift',()=>{assert.equal(brand.brandVersion,'1.0');assert.equal(brand.colors.core.dark,'#1E2931');assert.equal(brand.colors.core.blue,'#00A9CC');cp.execFileSync(process.execPath,[path.join(root,'scripts/generate-brand-assets.js'),'--check']);});
test('Office theme, chart palette, logo roles and audience language are governed',()=>{const office=brand.officeTheme();assert.equal(office.NAVY,'1E2931');assert.equal(office.FONT,'Inter');assert.equal(office.LOGO,brand.logos.logoOfficeHighResolution.path);assert.deepEqual(office.CHART_COLORS,brand.charts.categorical.map(x=>x.slice(1)));assert.match(brand.audience('customer',2026),/Confidential and Proprietary/);assert.match(brand.audience('internal',2026),/Internal Use Only/);});
test('web entry points consume generated tokens and runtime',()=>{for(const file of ['public/index.html','public/login.html','public/change-password.html','public/reset-password.html','public/prospect.html','public/prospect-map.html','public/business-case.html','public/print.html','public/style-guide.html']){const html=read(file);assert.match(html,/brand-tokens\.css/,file);assert.match(html,/brand-system\.js/,file);}});
test('PowerPoint and palette use the shared runtime',()=>{assert.match(read('public/pptx-export.js'),/CIBrand\.officeTheme/);assert.doesNotMatch(read('public/pptx-export.js'),/FONT:'Calibri'/);assert.match(read('public/brand-palette.js'),/brand\.charts\.categorical/);});
test('governed statuses include color, label and icon',()=>{for(const key of ['complete','current','future','blocked']){const s=brand.colors.status[key];assert.ok(s.color&&s.label&&s.icon,key);}});
test('essential text pairs meet WCAG AA',()=>{const white=brand.colors.core.white;for(const color of [brand.colors.core.dark,brand.colors.semantic.textMuted,brand.colors.semantic.link,brand.colors.core.green,brand.colors.core.deepRed])assert.ok(contrast(color,white)>=4.5,`${color} contrast ${contrast(color,white)}`);assert.ok(contrast(white,brand.colors.core.dark)>=4.5);});

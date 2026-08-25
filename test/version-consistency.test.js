/* ═══════════════════════════════════════════════════════════════════
   version-consistency.test.js

   The app version lives in three places that MUST agree:
     1. package.json           "version"
     2. public/index.html      const APP_VERSION="x.y.z"
     3. public/version-history.js  VERSION_HISTORY[0].version

   These have drifted repeatedly (the version-history panel showing a stale
   version), so this test fails loudly the moment they disagree. It also
   validates that every VERSION_HISTORY entry is well-formed (has a version,
   title, and a changes array) — a single malformed entry previously threw
   mid-render and blanked the entire version-history panel.

   Run: node test/version-consistency.test.js
   ═══════════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failures = 0;
const fail = (msg) => { console.log('  🔴 ' + msg); failures++; };
const pass = (msg) => console.log('  🟢 ' + msg);

/* 1. package.json */
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const pkgVersion = pkg.version;

/* 2. APP_VERSION in index.html */
const indexHtml = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const appVersionMatch = indexHtml.match(/const APP_VERSION\s*=\s*"([^"]+)"/);
const appVersion = appVersionMatch ? appVersionMatch[1] : null;

/* 3. VERSION_HISTORY[0].version in version-history.js */
const vhSrc = fs.readFileSync(path.join(root, 'public/version-history.js'), 'utf8');
const firstVersionMatch = vhSrc.match(/version:\s*'([^']+)'/);
const historyVersion = firstVersionMatch ? firstVersionMatch[1] : null;

console.log('Version sources:');
console.log('  package.json:          ' + pkgVersion);
console.log('  APP_VERSION (index):   ' + appVersion);
console.log('  VERSION_HISTORY[0]:    ' + historyVersion);
console.log('');

if (!appVersion) fail('APP_VERSION not found in index.html');
if (!historyVersion) fail('VERSION_HISTORY[0].version not found');

if (pkgVersion && appVersion && pkgVersion !== appVersion)
  fail(`package.json (${pkgVersion}) != APP_VERSION (${appVersion})`);
if (pkgVersion && historyVersion && pkgVersion !== historyVersion)
  fail(`package.json (${pkgVersion}) != VERSION_HISTORY[0] (${historyVersion})`);

if (pkgVersion === appVersion && appVersion === historyVersion)
  pass(`all three version sources agree (${pkgVersion})`);

/* 4. Every VERSION_HISTORY entry is well-formed. Parse the array leniently:
   count version entries and ensure each has a changes array or summary. */
const entryVersions = [...vhSrc.matchAll(/version:\s*'([^']+)'/g)].map(m => m[1]);
/* Split into blocks between version markers to inspect each entry's fields. */
const blocks = vhSrc.split(/(?=\bversion:\s*')/).filter(b => /version:\s*'/.test(b));
let malformed = 0;
blocks.forEach(b => {
  const v = (b.match(/version:\s*'([^']+)'/) || [])[1];
  const hasChanges = /changes:\s*\[/.test(b);
  const hasSummary = /summary:\s*'/.test(b);
  const hasTitle = /title:\s*'/.test(b);
  if (!hasChanges && !hasSummary) { fail(`v${v} has neither a changes array nor a summary`); malformed++; }
  if (!hasTitle) { fail(`v${v} is missing a title`); malformed++; }
});
if (malformed === 0) pass(`all ${blocks.length} version-history entries are well-formed`);

console.log('');
if (failures === 0) {
  console.log('🟢 ' + (2 + (malformed === 0 ? 1 : 0)) + ' checks passed, 0 failed');
  process.exit(0);
} else {
  console.log('🔴 ' + failures + ' failed');
  process.exit(1);
}

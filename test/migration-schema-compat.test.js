/* ═══════════════════════════════════════════════════════════════════
   test/migration-schema-compat.test.js
   Guards against FK type mismatches in migrations.

   Rule: any column referencing a UUID primary key table must be UUID.
   Cross-checking each column definition individually (not spanning
   multiple columns) to avoid false positives from multi-line CREATE.

   UUID PK tables: users, scenarios, customers, discovery_sessions,
     handoffs, scenario_shares, business_case_shares, maps,
     stakeholders, driver_resonance, prospect_sessions + related.

   SERIAL/INTEGER PK tables (new tables in 022):
     ci_product_sources, competitive_research_cache.
   ═══════════════════════════════════════════════════════════════════ */
'use strict';
const fs   = require('fs');
const path = require('path');

const UUID_PK_TABLES = new Set([
  'users','scenarios','customers','discovery_sessions','discovery_answers',
  'handoffs','scenario_shares','business_case_shares','maps','map_milestones',
  'stakeholders','driver_resonance','prospect_sessions','prospect_answers',
]);

const INT_PK_TABLES = new Set([
  'custom_benchmarks','error_log','help_pages',
  'ci_product_sources','competitive_research_cache',
]);

let passed = 0; let failed = 0; const failures = [];
const check = (ok, label) => { if (ok) passed++; else { failed++; failures.push(label); } };

const migDir   = path.join(__dirname, '..', 'migrations');
const migFiles = fs.readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();

for (const file of migFiles) {
  const sql      = fs.readFileSync(path.join(migDir, file), 'utf8');
  /* Strip SQL comments so they don't interfere */
  const stripped = sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  /*
    Split on comma+newline to get individual column/constraint clauses.
    This way the regex never spans two separate column definitions.
  */
  const clauses  = stripped.split(/,\s*\n/);

  for (const clause of clauses) {
    const fkMatch = clause.match(
      /\b(UUID|INTEGER|BIGINT|INT|SERIAL)\b[^\n]*\bREFERENCES\s+(\w+)\s*\(\s*id\s*\)/i
    );
    if (!fkMatch) continue;

    const colType  = fkMatch[1].toUpperCase();
    const refTable = fkMatch[2].toLowerCase();

    if (UUID_PK_TABLES.has(refTable)) {
      check(colType === 'UUID',
        file + ': REFERENCES ' + refTable + '(id) with type ' + colType + ' — must be UUID (users.id etc. are UUID primary keys)');
    } else if (INT_PK_TABLES.has(refTable)) {
      check(['INTEGER','INT','BIGINT','SERIAL'].includes(colType),
        file + ': REFERENCES ' + refTable + '(id) with type ' + colType + ' — must be INTEGER-family (ci_product_sources.id is SERIAL)');
    }
    /* Unknown reference table (may be created in same migration) — skip */
  }
}

console.log('Migration schema compatibility tests:');
if (passed > 0 || failed === 0) {
  console.log('  ' + passed + ' FK type checks across ' + migFiles.length + ' migrations');
}
if (failures.length) {
  failures.forEach(f => console.log('  \u2718 ' + f));
  console.log('\n\u{1F534} ' + failed + ' failed, ' + passed + ' passed');
  process.exit(1);
} else {
  console.log('\n\u{1F7E2} ' + passed + ' passed, 0 failed');
}

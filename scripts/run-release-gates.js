'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const release = require('../package.json').version;
const lineage = require('../release-lineage.json');
const { storageConfig } = require('../src/storage/r2-storage');
const LOCAL_PNPM = process.env.RELEASE_PACKAGE_MANAGER === 'pnpm';
const DIRECT_NODE = process.env.RELEASE_PACKAGE_MANAGER === 'direct-node';
const NPM_CLI = process.env.RELEASE_PACKAGE_MANAGER_CLI || process.env.npm_execpath || path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const npm = (...args) => {
  if (!DIRECT_NODE) return [process.execPath, [NPM_CLI, ...args]];
  const script = args[0] === 'run' ? args[1] : args[0] === 'test' ? 'test' : null;
  if (!script) return [process.execPath, ['-e', 'process.exit(64)']];
  return [process.execPath, ['scripts/run-node-package-script.js', script]];
};
const dependencyInstall = LOCAL_PNPM ? npm('install', '--prod', '--lockfile=false') : npm('ci', '--omit=dev', '--no-audit', '--no-fund');

function command(name, display, invocation, options = {}) { return [name, display, invocation[0], invocation[1], options]; }

const COMMANDS = [
  command('production-dependencies', 'npm ci --omit=dev --no-audit --no-fund', dependencyInstall, { dependencyOnly: true }),
  command('database-migrations', 'npm run migrate', npm('run', 'migrate'), { databaseOnly: true }),
  command('postgres-integration', 'npm run test:postgres', npm('run', 'test:postgres'), { databaseOnly: true }),
  command('r2-integration', 'npm run test:r2', npm('run', 'test:r2'), { r2Only: true }),
  command('full-test-suite', 'npm test', npm('test')),
  command('v6949-solution-fit-header-sync', 'npm run test:v6949', npm('run', 'test:v6949')),
  command('v6948-executive-narrative-authority', 'npm run test:v6948', npm('run', 'test:v6948')),
  command('v6947-corrective-release', 'npm run test:v6947', npm('run', 'test:v6947')),
  command('v6946-release-stabilization', 'npm run test:v6946', npm('run', 'test:v6946')),
  command('v6945-ps-turnover-evidence', 'npm run test:v6945', npm('run', 'test:v6945')),
  command('v6944-solution-fit-evidence', 'npm run test:v6944', npm('run', 'test:v6944')),
  command('v6943-live-regression-corrections', 'npm run test:v6943', npm('run', 'test:v6943')),
  command('v6942-solution-fit-inventory-ui', 'npm run test:v6942', npm('run', 'test:v6942')),
  command('v6941-solution-fit-workflow-stabilization', 'npm run test:v6941', npm('run', 'test:v6941')),
  command('v6939-solution-fit-guided-workflow', 'npm run test:v6939', npm('run', 'test:v6939')),
  command('v6938-roi-assumptions-corrections', 'npm run test:v6938', npm('run', 'test:v6938')),
  command('v6937-roi-assumptions-results', 'npm run test:v6937', npm('run', 'test:v6937')),
  command('v6936-admin-bulk-cleanup', 'npm run test:v6936', npm('run', 'test:v6936')),
  command('v6935-customer-ownership-transfer', 'npm run test:v6935', npm('run', 'test:v6935')),
  command('v6934-customer-alert-workflow', 'npm run test:v6934', npm('run', 'test:v6934')),
  command('v6933-proposal-pdf-timeout-correction', 'npm run test:v6933', npm('run', 'test:v6933')),
  command('v6932-prospect-evidence-count-consistency', 'npm run test:v6932', npm('run', 'test:v6932')),
  command('v6931-final-two-defects', 'npm run test:v6931', npm('run', 'test:v6931')),
  command('v6930-server-authoritative-prospect-values', 'npm run test:v6930', npm('run', 'test:v6930')),
  command('production-locks', 'npm run test:production-locks', npm('run', 'test:production-locks')),
  command('routes', 'npm run test:routes', npm('run', 'test:routes')),
  command('brand-tests', 'npm run test:brand', npm('run', 'test:brand')),
  command('lineage', 'node scripts/check-release-lineage.js', [process.execPath, ['scripts/check-release-lineage.js']]),
  command('active-output-audit', 'node scripts/audit-active-output-paths.js', [process.execPath, ['scripts/audit-active-output-paths.js']]),
  command('brand-assets', 'node scripts/generate-brand-assets.js --check', [process.execPath, ['scripts/generate-brand-assets.js', '--check']]),
  command('application-knowledge', 'node scripts/generate-application-knowledge.js --check', [process.execPath, ['scripts/generate-application-knowledge.js', '--check']]),
  command('active-output-runtime-matrix', 'node --test test/output-runtime-matrix.test.js', [process.execPath, ['--test', 'test/output-runtime-matrix.test.js']])
];

function parseOutput(output = '') {
  const sum = label => [...output.matchAll(new RegExp(`^(?:#|ℹ) ${label} (\\d+)$`, 'gm'))].reduce((n, match) => n + Number(match[1]), 0);
  return { passed: sum('pass'), failed: sum('fail'), skipped: sum('skipped') };
}

function npmVersion() {
  if (DIRECT_NODE) return 'NOT AVAILABLE — direct Node script fallback';
  const result = spawnSync(process.execPath, [NPM_CLI, '--version'], { encoding: 'utf8', shell: false });
  return String(result.stdout || '').trim() || 'NOT TESTED';
}

function environment() {
  return { node: process.version, npm: npmVersion(), platform: `${process.platform}-${process.arch}`, databaseAvailable: Boolean(process.env.DATABASE_URL), databaseIntegrationRequired: process.env.REQUIRE_DATABASE_INTEGRATION === '1', r2Available: storageConfig(process.env).available, nodeEnv: process.env.NODE_ENV || 'test' };
}

function databaseIdentity() {
  if (!process.env.DATABASE_URL) return { databaseUrlPresent: false, databaseName: null, postgresqlVersion: 'NOT TESTED' };
  let databaseName = 'unknown';
  try { databaseName = decodeURIComponent(new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '')); } catch (_) {}
  const code = "const{Client}=require('pg');(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();const r=await c.query('select version() v,current_database() d');console.log(JSON.stringify(r.rows[0]));await c.end()})().catch(e=>{console.error(e.message);process.exit(1)})";
  const result = spawnSync(process.execPath, ['-e', code], { cwd: root, encoding: 'utf8', env: process.env, shell: false });
  if (result.status !== 0) return { databaseUrlPresent: true, databaseName, postgresqlVersion: 'CONNECTION FAILED' };
  try { const row = JSON.parse(String(result.stdout).trim()); return { databaseUrlPresent: true, databaseName: row.d || databaseName, postgresqlVersion: row.v || 'unknown' }; }
  catch (_) { return { databaseUrlPresent: true, databaseName, postgresqlVersion: 'UNKNOWN' }; }
}

function readOutputResults() {
  const file = path.join(root, `OUTPUT_RUNTIME_RESULTS_v${release}.json`);
  if (!fs.existsSync(file)) throw Error('Output runtime result file was not produced.');
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  const active = require('../src/shared/output-registry').OUTPUTS.filter(output => output.active);
  if (payload.release !== release || payload.results.length !== active.length) throw Error('Output runtime result set is incomplete.');
  for (const output of active) {
    const result = payload.results.find(item => item.outputId === output.outputId);
    const notCertified = !result || result.executed!==true || result.passed!==true || result.artifactValidated!==true;
    if (notCertified || result.ownerModule !== output.ownerModule || result.productionImplementation !== output.ownerModule || result.authoritativeDataSource !== output.authoritativeDataSource) throw Error(`Output runtime certification failed: ${output.outputId}`);
  }
  return payload.results;
}

function writePostgresResult(gates) {
  const migration = gates.find(gate => gate.name === 'database-migrations');
  const suite = gates.find(gate => gate.name === 'postgres-integration');
  const identity = databaseIdentity();
  const available = identity.databaseUrlPresent;
  const suites = ['test/routes.test.js', 'test/v653-postgres-integration.test.js', 'test/v663-postgres-authorization.test.js', 'test/v664-postgres-product-identity.test.js', 'test/v6930-postgres-value-application.test.js', 'test/v6934-postgres-customer-creation.test.js', 'test/v6935-postgres-ownership-transfer.test.js', 'test/v6936-postgres-admin-cleanup.test.js', 'test/v6937-postgres-roi-assumptions.test.js', 'test/v6941-postgres-solution-fit-stabilization.test.js', 'test/v6944-postgres-solution-fit-evidence.test.js', 'test/v6945-postgres-ps-turnover.test.js', 'test/v6947-postgres-corrective.test.js', 'test/v6948-postgres-executive-authority.test.js'];
  const notTested = available ? Number(suite?.notTested || 0) : suites.length;
  const result = { release, generatedAt: new Date().toISOString(), ...identity, node: process.version,
    migration: { executed: Boolean(available && migration?.executed), exitCode: available ? migration?.exitCode : null, result: available ? (migration?.exitCode === 0 ? 'PASS' : 'FAIL') : 'NOT TESTED' },
    command: 'npm run test:postgres', suites, passed: available ? Number(suite?.passed || 0) : 0, failed: available ? Number(suite?.failed || 0) : 0, skipped: available ? Number(suite?.skipped || 0) : 0, notTested, durationMs: Number(suite?.durationMs || 0),
    result: available && migration?.exitCode === 0 && suite?.exitCode === 0 && !suite.skipped && !notTested ? 'PASS' : available ? 'FAIL' : 'NOT TESTED' };
  fs.writeFileSync(path.join(root, `POSTGRES_INTEGRATION_RESULTS_v${release}.json`), JSON.stringify(result, null, 2) + '\n');
  return result;
}

function writeR2Result(gates) {
  const suite = gates.find(gate => gate.name === 'r2-integration');
  const config = storageConfig(process.env);
  const available = config.available;
  const suites = ['test/v6944-r2-integration.test.js', 'test/v6945-r2-turnover-package.test.js'];
  const notTested = available ? Number(suite?.notTested || 0) : suites.length;
  const result = { release, generatedAt: new Date().toISOString(), endpointHost: config.endpoint ? new URL(config.endpoint).host : null, bucket: config.bucket || null, region: config.region || null, credentialsPresent: available, command: 'npm run test:r2', suites, operations: ['PUT', 'HEAD', 'GET', 'DELETE', 'PS Turnover ZIP stream'], executed: Boolean(available && suite?.executed), passed: available ? Number(suite?.passed || 0) : 0, failed: available ? Number(suite?.failed || 0) : 0, skipped: available ? Number(suite?.skipped || 0) : 0, notTested, durationMs: Number(suite?.durationMs || 0), result: available && suite?.exitCode === 0 && !suite.skipped && !notTested ? 'PASS' : available ? 'FAIL' : 'NOT TESTED' };
  fs.writeFileSync(path.join(root, `R2_INTEGRATION_RESULTS_v${release}.json`), JSON.stringify(result, null, 2) + '\n');
  return result;
}

function run() {
  const requireDatabase = process.env.REQUIRE_DATABASE_INTEGRATION === '1';
  const hasDatabase = Boolean(process.env.DATABASE_URL);
  const hasR2 = storageConfig(process.env).available;
  const gates = [];
  for (const [name, display, bin, args, options] of COMMANDS) {
    if (options.dependencyOnly && DIRECT_NODE) {
      gates.push({ name, command: display, executed: false, exitCode: null, passed: 0, failed: 0, skipped: 0, notTested: 1, durationMs: 0, result: 'NOT TESTED', note: 'npm is unavailable in this local execution environment; dependency modules were load-checked separately.' });
      continue;
    }
    if ((options.databaseOnly && !hasDatabase) || (options.r2Only && !hasR2)) {
      const mandatory = options.databaseOnly && requireDatabase;
      gates.push({ name, command: display, executed: false, exitCode: mandatory ? 1 : null, passed: 0, failed: mandatory ? 1 : 0, skipped: 0, notTested: 1, durationMs: 0, result: 'NOT TESTED' });
      continue;
    }
    const started = Date.now();
    const processResult = spawnSync(bin, args, { cwd: root, encoding: 'utf8', shell: false, env: process.env, maxBuffer: 50 * 1024 * 1024 });
    const output = String(processResult.stdout || '') + String(processResult.stderr || '');
    const counts = parseOutput(output);
    let exitCode = Number.isInteger(processResult.status) ? processResult.status : 1;
    let notTested = 0;
    let resultLabel = exitCode === 0 ? 'PASS' : 'FAIL';
    if (name === 'routes' && !hasDatabase && exitCode === 0 && counts.passed === 0) {
      exitCode = null;
      notTested = 1;
      resultLabel = 'NOT TESTED';
    }
    let outputResults = [];
    if (name === 'active-output-runtime-matrix' && exitCode === 0) {
      try { outputResults = readOutputResults(); } catch (error) { exitCode = 1; process.stdout.write(`\n${error.message}\n`); }
    }
    process.stdout.write(`\n[${name}] ${resultLabel} (${Date.now() - started}ms)\n`);
    if (exitCode !== 0 && exitCode !== null) process.stdout.write(output.slice(-12000));
    gates.push({ name, command: display, executedCommand: DIRECT_NODE && (display.startsWith('npm run ')||display==='npm test') ? `node scripts/run-node-package-script.js ${name==='full-test-suite'?'test':display.replace(/^npm run /,'')}` : name === 'production-dependencies' && LOCAL_PNPM ? 'pnpm install --prod --lockfile=false' : display, executed: true, exitCode, passed: counts.passed, failed: counts.failed + (exitCode !== 0 && exitCode !== null && counts.failed === 0 ? 1 : 0), skipped: counts.skipped, notTested, durationMs: Date.now() - started, result: resultLabel, ...(name === 'active-output-runtime-matrix' ? { outputResults } : {}) });
  }
  const postgres = writePostgresResult(gates);
  if (requireDatabase && (postgres.result !== 'PASS' || postgres.skipped || postgres.notTested)) {
    const gate = gates.find(item => item.name === 'postgres-integration');
    if (gate && gate.exitCode === 0) { gate.exitCode = 1; gate.failed = Math.max(1, gate.failed); }
  }
  const r2 = writeR2Result(gates);
  const result = { release, baseline: { archive: lineage.parentArchive, sha256: lineage.parentSha256 }, generatedAt: new Date().toISOString(), environment: environment(), gates, postgresIntegration: postgres, r2Integration: r2, summary: { passed: gates.every(gate => gate.exitCode === 0 || gate.exitCode === null), failedGates: gates.filter(gate => gate.exitCode !== 0 && gate.exitCode !== null).map(gate => gate.name), databaseDependentTests: postgres.result, r2Integration: r2.result } };
  fs.writeFileSync(path.join(root, `RELEASE_GATE_RESULTS_v${release}.json`), JSON.stringify(result, null, 2) + '\n');
  return result;
}

if (require.main === module) { const result = run(); process.exitCode = result.summary.passed ? 0 : 1; }
module.exports = { COMMANDS, parseOutput, environment, readOutputResults, writePostgresResult, writeR2Result, run };

/* ═══════════════════════════════════════════════════════════════════
   benchmark-provenance.js — sourcing & confidence for default benchmarks
   The tool's credibility rests on defensible numbers. This module gives
   every default-benchmark family a documented basis, and flags industries
   whose benchmarks are still provisional so reps know before sending
   figures externally.
   Edit BENCHMARK_SOURCES / PLACEHOLDER_INDUSTRIES as figures are validated.
   ═══════════════════════════════════════════════════════════════════ */

/* Documented basis for each benchmark family. Keep each `basis` short and
   defensible — it is what a rep can say when a CFO asks "where's this from?"
   `tier` drives how it's presented: 'validated' | 'industry' | 'provisional'. */
const BENCHMARK_SOURCES = {
  shrinkRate:  { label: 'Shrink / write-off rate',   tier: 'industry',
    basis: 'Grounded in published warehousing/inventory shrink ranges and Cloud Inventory deployment observations. Verify against the customer\u2019s actual write-off figure during discovery.' },
  carryRate:   { label: 'Inventory carrying-cost rate', tier: 'industry',
    basis: 'Standard carrying-cost range (capital, storage, obsolescence, insurance). Typically 20\u201330% of inventory value; refine with the customer\u2019s cost of capital.' },
  otifBaseline:{ label: 'OTIF baseline / target',    tier: 'industry',
    basis: 'Typical on-time-in-full ranges by sector. Baseline should be replaced with the customer\u2019s measured OTIF where available.' },
  invTurns:    { label: 'Inventory turns',           tier: 'industry',
    basis: 'Sector-typical annual turns. Wide variance by business model \u2014 confirm the customer\u2019s current and target turns.' },
  overlap:     { label: 'Inventory-carrying overlap control', tier: 'validated',
    basis: 'Direct carrying-reduction and turns-based carrying estimates use the same inventory pool. The model counts only the higher estimate, never their sum.' },
  recovery:    { label: 'Recovery / improvement %',  tier: 'industry',
    basis: 'Share of each inefficiency Cloud Inventory is modeled to recover. Set conservatively and adjustable via the Conservative/Base/Aggressive scenario toggle.' }
};

/* Industry keys whose entire benchmark set is provisional (not yet validated
   against real deployment data). These trigger a visible rep-facing banner. */
const PLACEHOLDER_INDUSTRIES = {
  retail: 'Medical Devices / Life Sciences has no bundled benchmark values in v5.7.4; customer-specific assumptions are required.'
};

function isPlaceholderIndustry(key) {
  return Object.prototype.hasOwnProperty.call(PLACEHOLDER_INDUSTRIES, key);
}

/* Rep-facing banner shown on the calculator when the selected industry uses
   provisional benchmarks. Rendered into #benchmarkProvenanceBanner. */
function updateBenchmarkBanner() {
  const host = document.getElementById('benchmarkProvenanceBanner');
  if (!host) return;
  const sel = document.getElementById('industry');
  const key = sel ? sel.value : '';
  if (isPlaceholderIndustry(key)) {
    host.style.display = 'flex';
    host.innerHTML = `<span class="bpb-icon" aria-hidden="true">\u26A0</span>
      <span><strong>Customer inputs required.</strong> ${escBench(PLACEHOLDER_INDUSTRIES[key])}
      Confirm key figures with the customer through discovery before sharing this business case externally.</span>`;
  } else {
    host.style.display = 'none';
    host.innerHTML = '';
  }
}

/* Short provenance lines for the ROI methodology document (finance review). */
function benchmarkProvenanceLines(industryKey) {
  const lines = Object.keys(BENCHMARK_SOURCES).map(k => {
    const s = BENCHMARK_SOURCES[k];
    const tierTxt = s.tier === 'validated' ? 'Validated' : s.tier === 'provisional' ? 'Provisional' : 'Industry-typical';
    return `${s.label} — ${tierTxt}. ${s.basis}`;
  });
  if (isPlaceholderIndustry(industryKey)) {
    lines.unshift('NOTE: This industry\u2019s benchmark set is provisional and pending validation. Figures should be confirmed with the customer before external use.');
  }
  return lines;
}

function escBench(s) {
  return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function initBenchmarkProvenance() {
  updateBenchmarkBanner();
  const sel = document.getElementById('industry');
  if (sel && !sel._bpBound) {
    sel.addEventListener('change', updateBenchmarkBanner);
    sel._bpBound = true;
  }
}

if (typeof window !== 'undefined') {
  window.BENCHMARK_SOURCES = BENCHMARK_SOURCES;
  window.PLACEHOLDER_INDUSTRIES = PLACEHOLDER_INDUSTRIES;
  window.isPlaceholderIndustry = isPlaceholderIndustry;
  window.updateBenchmarkBanner = updateBenchmarkBanner;
  window.benchmarkProvenanceLines = benchmarkProvenanceLines;
  window.initBenchmarkProvenance = initBenchmarkProvenance;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BENCHMARK_SOURCES, PLACEHOLDER_INDUSTRIES, isPlaceholderIndustry, benchmarkProvenanceLines };
}

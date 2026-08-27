/* ═══════════════════════════════════════════════════════════════════
   src/shared/handoff-readiness.js — shared readiness scoring (UMD)
   Ported faithfully from the SE Solution Fit prototype's readiness() so
   client and server agree on the score. Pure function of the handoff
   state; no I/O. Loadable in Node (require) and the browser (global).
   ═══════════════════════════════════════════════════════════════════ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HandoffReadiness = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  /* Which gaps are "material" (need full detail to be estimable). */
  function materialGap(g) {
    return g.priority === 'Must Have'
      || g.goLive === 'Yes'
      || ['EXTENSION', 'INTEGRATION', 'DATA', 'NON-FUNCTIONAL', 'REPORT / PRINT'].includes(g.classification);
  }

  /* Compute readiness. Returns { miss:[{label,msg}], done:[{label}], score, status }. */
  function readiness(state) {
    state = state || {};
    const o = state.opportunity || {};
    const a = state.architecture || {};
    const p = state.partner || {};
    const processes = Array.isArray(state.processes) ? state.processes : [];
    const gaps = Array.isArray(state.gaps) ? state.gaps : [];

    const miss = [], done = [];
    const req = (ok, label, msg = 'is missing.') => { (ok ? done : miss).push({ label, msg }); };

    /* Business context */
    req(!!o.customer, 'Customer / prospect');
    req(!!o.solutionEngineer, 'Solution Engineer');
    req(Array.isArray(o.products) ? o.products.length > 0 : !!o.products, 'Cloud Inventory product(s)');
    req(!!o.locations, 'Locations / operating scope');
    req(!!o.users, 'Estimated users');
    req(!!o.problem, 'Business problem');
    req(!!o.outcome, 'Desired outcome');

    /* Architecture */
    req(!!a.relationship, 'Deployment relationship');
    req(!!a.erp, 'System of record / ERP');
    req(!!a.version, 'ERP / system version');
    const standalone = a.relationship === 'Standalone';
    if (!standalone) {
      req(!!a.integrationMethod, 'Primary integration method');
      req(!!a.integrationOwner, 'Integration delivery owner');
    }

    /* Partner */
    req(!!p.involved, 'Partner involvement answer');
    if (p.involved === 'Yes') {
      req(!!p.company, 'Partner company');
      req(!!p.contactName, 'Partner contact');
      req(!!p.email, 'Partner email');
    }

    /* Process scope + demo/fit capture */
    const selected = processes.filter(x => x.selected);
    req(selected.length > 0, 'Process scope', 'has not been selected.');
    const notDemo = selected.filter(x => x.demoStatus === 'Not reviewed');
    req(notDemo.length === 0, 'Demo status', notDemo.length ? `is not captured for ${notDemo.map(x => x.name).join(', ')}.` : '');
    const noFit = selected.filter(x => x.fit === 'Not reviewed');
    req(noFit.length === 0, 'Fit status', noFit.length ? `is not captured for ${noFit.map(x => x.name).join(', ')}.` : '');

    /* Material gaps need enough detail to be estimable */
    const must = gaps.filter(materialGap);
    for (const g of must) {
      req(!!g.need, `${g.id} customer need`);
      req(!!g.gapDescription || ['CONFIGURATION', 'PROCESS CHANGE', 'OUT OF SCOPE'].includes(g.classification),
        `${g.id} precise gap`, 'needs enough detail to explain the difference from standard behavior.');
      if (g.priority === 'Must Have' || g.goLive === 'Yes') {
        req(!!g.acceptance, `${g.id} acceptance criteria`, 'is missing for a go-live critical gap.');
        req(!!g.dependencies || !!g.assumptions, `${g.id} dependencies / assumptions`, 'is missing for a material gap.');
      }
    }

    /* Partner-owned integration implies partner involvement */
    if (a.integrationOwner === 'Partner') {
      req(p.involved === 'Yes', 'Partner involvement', 'must be Yes because the Partner owns integration.');
      if (p.involved === 'Yes') req(!!p.company, 'Partner company');
    }

    const total = miss.length + done.length;
    const score = total ? Math.round(done.length / total * 100) : 0;
    const status = miss.length === 0 ? 'ready' : score >= 75 ? 'conditional' : 'not_ready';
    return { miss, done, score, status };
  }

  return { readiness, materialGap };
});

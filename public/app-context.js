(function (root, factory) {
  const api = factory(root || null);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CIAppContext = api;
})(typeof window !== 'undefined' ? window : null, function (root) {
  'use strict';

  const STATES = Object.freeze({
    NO_CUSTOMER: 'no_customer',
    CUSTOMER_NO_SCENARIO: 'customer_no_scenario',
    WORKING_UNSAVED: 'working_unsaved_scenario',
    SAVED: 'saved_scenario',
    DIRTY_SAVED: 'dirty_saved_scenario'
  });

  function hasValidWorkingScenario(doc) {
    if (!doc) return false;
    const name = String(doc.getElementById('scenarioName')?.value || '').trim();
    if (!name || name === 'Unnamed scenario') return false;
    return ['revenue', 'inventoryValue', 'userCount'].some(id => Number(doc.getElementById(id)?.value || 0) > 0);
  }

  function derive(snapshot = {}) {
    if (!snapshot.customerId) return STATES.NO_CUSTOMER;
    if (snapshot.scenarioId) return snapshot.dirty ? STATES.DIRTY_SAVED : STATES.SAVED;
    return snapshot.hasValidWorkingScenario ? STATES.WORKING_UNSAVED : STATES.CUSTOMER_NO_SCENARIO;
  }

  function snapshot() {
    if (!root) return {};
    return {
      customerId: root.currentScenarioCustomerId || root._currentCustomerId || root._activeCustomerMeta?.id || null,
      scenarioId: root._calcScenarioId || null,
      dirty: Boolean(root.hasUnsavedChanges?.()),
      hasValidWorkingScenario: hasValidWorkingScenario(root.document)
    };
  }

  function setAction(control, available, hide) {
    if (!control) return;
    control.disabled = !available;
    control.setAttribute('aria-disabled', String(!available));
    control.hidden = Boolean(hide && !available);
    if (!available) control.setAttribute('tabindex', '-1'); else control.removeAttribute('tabindex');
  }

  function sync() {
    if (!root || !root.document) return STATES.NO_CUSTOMER;
    const current = snapshot();
    const state = derive(current);
    root.document.body.dataset.appContext = state;
    const canSave = !root.document.body.classList.contains('customer-readonly')
      && (state === STATES.WORKING_UNSAVED || state === STATES.SAVED || state === STATES.DIRTY_SAVED);
    const canUseSavedOutputs = state === STATES.SAVED;
    root.document.querySelectorAll('[data-context-action="save"]').forEach(node => setAction(node, canSave, false));
    root.document.querySelectorAll('[data-context-action="output"], [data-context-action="share"], [data-context-action="email"]').forEach(node => {
      setAction(node, canUseSavedOutputs, state === STATES.NO_CUSTOMER);
    });

    if (state === STATES.NO_CUSTOMER) {
      const labels = { 'lb-benefit': 'No business case', 'lb-roi': '—', 'lb-npv3': '—', 'lb-npv5': '—' };
      Object.entries(labels).forEach(([id, value]) => {
        const node = root.document.getElementById(id);
        if (node) { node.textContent = value; node.className = 'lb-value r-neu'; }
      });
      const roiLabel = root.document.getElementById('lb-roi-label');
      if (roiLabel) roiLabel.textContent = 'Contract ROI';
    }
    return state;
  }

  function requireSaved(actionLabel) {
    const state = sync();
    if (state === STATES.SAVED) return true;
    const message = state === STATES.NO_CUSTOMER
      ? `Select a customer and saved scenario before ${actionLabel}.`
      : state === STATES.DIRTY_SAVED
        ? `Save the current changes before ${actionLabel}.`
        : `Save a valid scenario before ${actionLabel}.`;
    root?.AppAlerts?.warning(message, { key: `context:${actionLabel}`, persist: true });
    return false;
  }

  const api = { STATES, derive, snapshot, sync, requireSaved, hasValidWorkingScenario };
  if (root && root.document) {
    root.addEventListener('load', sync);
    root.document.addEventListener('input', event => {
      if (event.target?.closest?.('#calcBody')) sync();
    });
  }
  return api;
});

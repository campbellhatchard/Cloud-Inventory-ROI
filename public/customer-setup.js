(function () {
  'use strict';
  let schema = null;
  let destinationAfterGuard = null;
  let discardOnCommit = false;

  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  async function loadSchema() {
    if (schema) return schema;
    const response = await apiFetch('/api/customers/setup-schema');
    if (!response?.ok) throw new Error('Customer Setup is unavailable. Please try again.');
    schema = await response.json();
    return schema;
  }

  function closeCustomerSetup() {
    document.getElementById('customerSetupDialog')?.remove();
    destinationAfterGuard = null;
    discardOnCommit = false;
    window.AppAlerts?.dismissKey('customer-context-unsaved');
  }

  function fieldMarkup(field) {
    const required = field.required === true;
    const badge = required ? 'Required' : field.classification === 'recommended' ? 'Recommended' : 'Optional';
    if (field.inputType === 'checkbox') {
      return `<div class="customer-setup-field customer-setup-checkbox" data-setup-field="${esc(field.key)}">`
        + `<label for="customerSetup_${esc(field.key)}"><input type="checkbox" id="customerSetup_${esc(field.key)}">`
        + `<span><strong>${esc(field.label)}</strong><small class="setup-badge setup-${esc(field.classification)}">${badge}</small>`
        + `<span class="setup-help">${esc(field.help || '')}</span></span></label></div>`;
    }
    return `<div class="customer-setup-field" data-setup-field="${esc(field.key)}">`
      + `<label for="customerSetup_${esc(field.key)}">${esc(field.label)} <small class="setup-badge setup-${esc(field.classification)}">${badge}</small></label>`
      + `<input type="text" id="customerSetup_${esc(field.key)}" maxlength="${Number(field.maxLength || 255)}" autocomplete="organization"`
      + ` aria-describedby="customerSetup_${esc(field.key)}_help customerSetup_${esc(field.key)}_error">`
      + `<span class="setup-help" id="customerSetup_${esc(field.key)}_help">${esc(field.help || '')}</span>`
      + `<span class="setup-field-error" id="customerSetup_${esc(field.key)}_error"></span></div>`;
  }

  function renderSetup(contract) {
    document.getElementById('customerSetupDialog')?.remove();
    const owner = window.ciAuth?.getUser?.()?.username || 'Signed-in user';
    const dialog = document.createElement('div');
    dialog.id = 'customerSetupDialog';
    dialog.className = 'customer-setup-overlay';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'customerSetupTitle');
    dialog.innerHTML = `<section class="customer-setup-panel">`
      + `<header><div><div class="customer-setup-eyebrow">Customer workspace</div><h2 id="customerSetupTitle">Customer Setup</h2>`
      + `<p>Complete the required customer information before creating the business case.</p></div>`
      + `<button type="button" class="customer-setup-close" aria-label="Cancel Customer Setup">×</button></header>`
      + `<div class="customer-setup-body"><div id="customerSetupValidation" class="customer-setup-validation" hidden tabindex="-1"></div>`
      + contract.fields.map(fieldMarkup).join('')
      + `<div class="customer-setup-owner"><span>Account Owner</span><strong>${esc(owner)}</strong><small>Assigned from your authenticated account.</small></div>`
      + `<div id="customerSetupDuplicate" class="customer-setup-duplicate" hidden></div></div>`
      + `<footer><button type="button" class="btn btn-ghost" data-setup-cancel>Cancel</button>`
      + `<button type="button" class="btn btn-primary" id="customerSetupSave">Save &amp; Continue</button></footer></section>`;
    document.body.appendChild(dialog);
    dialog.querySelector('.customer-setup-close').addEventListener('click', closeCustomerSetup);
    dialog.querySelector('[data-setup-cancel]').addEventListener('click', closeCustomerSetup);
    dialog.querySelector('#customerSetupSave').addEventListener('click', saveCustomerSetup);
    dialog.addEventListener('keydown', event => keepFocusInDialog(event, dialog, closeCustomerSetup));
    requestAnimationFrame(() => dialog.querySelector('input:not([type="checkbox"])')?.focus());
  }

  function keepFocusInDialog(event, dialog, onEscape) {
    if (event.key === 'Escape') { event.preventDefault(); onEscape(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]')]
      .filter(node => !node.hidden && node.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function clearValidation() {
    ['customer-setup-required','customer-setup-server','customer-setup-duplicate'].forEach(key => window.AppAlerts?.dismissKey(key));
    const summary = document.getElementById('customerSetupValidation');
    if (summary) { summary.hidden = true; summary.innerHTML = ''; }
    document.querySelectorAll('#customerSetupDialog [aria-invalid="true"]').forEach(field => field.removeAttribute('aria-invalid'));
    document.querySelectorAll('#customerSetupDialog .customer-setup-field.invalid').forEach(field => field.classList.remove('invalid'));
    document.querySelectorAll('#customerSetupDialog .setup-field-error').forEach(field => { field.textContent = ''; });
  }

  function valuesFromDialog(contract) {
    const values = {};
    contract.fields.forEach(field => {
      const control = document.getElementById(`customerSetup_${field.key}`);
      values[field.key] = field.inputType === 'checkbox' ? Boolean(control?.checked) : String(control?.value || '').trim();
    });
    return values;
  }

  function validate(contract, values) {
    return window.CustomerSetupCore.missingRequired(contract, values);
  }

  function showValidation(fields) {
    const summary = document.getElementById('customerSetupValidation');
    if (!summary) return;
    summary.hidden = false;
    summary.innerHTML = `<strong>${fields.length} required field${fields.length === 1 ? '' : 's'} need attention.</strong><ul>`
      + fields.map(field => `<li><a href="#customerSetup_${esc(field.key)}">${esc(field.label)}</a></li>`).join('') + '</ul>';
    fields.forEach(field => {
      const control = document.getElementById(`customerSetup_${field.key}`);
      control?.setAttribute('aria-invalid', 'true');
      control?.closest('.customer-setup-field')?.classList.add('invalid');
      const error = document.getElementById(`customerSetup_${field.key}_error`);
      if (error) error.textContent = `${field.label} is required.`;
    });
    fields[0] && document.getElementById(`customerSetup_${fields[0].key}`)?.focus();
    window.AppAlerts?.error('Required customer information is missing. Review the fields in Customer Setup.', {
      key: 'customer-setup-required', persist: true
    });
  }

  function showServerError(message) {
    const summary = document.getElementById('customerSetupValidation');
    if (summary) {
      summary.hidden = false;
      summary.innerHTML = `<strong>Customer could not be created.</strong><p>${esc(message)}</p><p>Your information has not been lost. Review the message and try again.</p>`;
      summary.focus();
    }
    window.AppAlerts?.error(`Customer could not be created. ${message}`, { key: 'customer-setup-server', persist: true });
  }

  async function saveCustomerSetup() {
    const button = document.getElementById('customerSetupSave');
    if (!button || button.disabled) return;
    clearValidation();
    document.getElementById('customerSetupDuplicate')?.setAttribute('hidden', '');
    const values = valuesFromDialog(schema);
    const missing = validate(schema, values);
    if (missing.length) { showValidation(missing); return; }
    button.disabled = true;
    button.textContent = 'Saving customer…';
    try {
      const payloadForServer = window.CustomerSetupCore.payloadFromContract(schema, values);
      const response = await apiFetch('/api/customers', { method: 'POST', body: JSON.stringify(payloadForServer) });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 409) {
        const duplicate = document.getElementById('customerSetupDuplicate');
        if (duplicate) {
          duplicate.hidden = false;
          duplicate.innerHTML = `<strong>A customer with this information may already exist.</strong>`
            + (payload.existingCustomer?.id
              ? `<p>You can open the existing authorized customer or review the information.</p><button type="button" class="btn btn-secondary btn-sm" id="customerSetupOpenExisting">Open Existing Customer</button>`
              : '<p>Review the name or contact an administrator if a previously removed account must be restored.</p>');
          document.getElementById('customerSetupOpenExisting')?.addEventListener('click', async () => {
            if (discardOnCommit) window.clearAllWorkingDirty?.();
            const ok = await window.selectCustomerContextById?.(payload.existingCustomer.id, { targetTab: 'calc' });
            if (ok) closeCustomerSetup();
          });
        }
        window.AppAlerts?.warning('A customer with this information may already exist.', { key: 'customer-setup-duplicate', persist: true });
        return;
      }
      if (!response.ok || !payload.customer?.id) {
        if (Array.isArray(payload.fieldErrors)) {
          const fields = payload.fieldErrors.map(error => schema.fields.find(field => field.key === error.field)).filter(Boolean);
          if (fields.length) { showValidation(fields); return; }
        }
        showServerError(payload.error || 'The server did not confirm the customer save. Please try again.');
        return;
      }
      window.invalidateCustomerWorkspaceCache?.();
      if (discardOnCommit) window.clearAllWorkingDirty?.();
      const selected = await window.selectCustomerContextById?.(payload.customer.id, { targetTab: 'calc' });
      if (!selected) {
        showServerError('The customer was saved, but the active workspace could not be established. Open it from Switch customer.');
        return;
      }
      ['customer-setup-required','customer-setup-server','customer-setup-duplicate','customer-context-unsaved','context-save-failed'].forEach(key => window.AppAlerts?.dismissKey(key));
      closeCustomerSetup();
      window.CIAppContext?.sync();
      window.AppAlerts?.success(`${payload.customer.name} was saved and is ready for a new business case.`, {
        key: `customer-created:${payload.customer.id}`
      });
    } catch (error) {
      showServerError('Check your connection and try again.');
    } finally {
      button.disabled = false;
      button.textContent = 'Save & Continue';
    }
  }

  async function openCustomerSetup() {
    try {
      const contract = await loadSchema();
      renderSetup(contract);
    } catch (error) {
      window.AppAlerts?.error(error.message || 'Customer Setup is unavailable. Please try again.', {
        key: 'customer-setup-load', persist: true
      });
    }
  }

  function closeContextGuard() {
    document.getElementById('customerContextGuard')?.remove();
    destinationAfterGuard = null;
    window.AppAlerts?.dismissKey('customer-context-unsaved');
  }

  async function guardSaveAndContinue() {
    const button = document.getElementById('contextGuardSave');
    if (button) { button.disabled = true; button.textContent = 'Saving…'; }
    const saved = await window.saveScenario?.({ skipDialog: true });
    if (!saved) {
      if (button) { button.disabled = false; button.textContent = 'Save & Continue'; }
      window.AppAlerts?.error('The current business case was not saved. You remain in the original customer workspace.', {
        key: 'context-save-failed', persist: true
      });
      return;
    }
    document.getElementById('customerContextGuard')?.remove();
    const next = destinationAfterGuard; destinationAfterGuard = null;
    await next?.();
  }

  async function guardDiscardAndContinue() {
    document.getElementById('customerContextGuard')?.remove();
    discardOnCommit = true;
    const next = destinationAfterGuard; destinationAfterGuard = null;
    await next?.();
  }

  function showContextGuard(onContinue) {
    destinationAfterGuard = onContinue;
    const company = String(document.getElementById('companyName')?.value || 'this customer').trim() || 'this customer';
    const overlay = document.createElement('div');
    overlay.id = 'customerContextGuard';
    overlay.className = 'customer-setup-overlay';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'contextGuardTitle');
    overlay.innerHTML = `<section class="context-guard-panel"><h2 id="contextGuardTitle">You have unsaved changes for ${esc(company)}.</h2>`
      + '<p>Save the current business case before creating another customer, discard these edits intentionally, or cancel.</p>'
      + '<div><button class="btn btn-primary" id="contextGuardSave">Save &amp; Continue</button>'
      + '<button class="btn btn-danger" id="contextGuardDiscard">Discard &amp; Continue</button>'
      + '<button class="btn btn-ghost" id="contextGuardCancel">Cancel</button></div></section>';
    document.body.appendChild(overlay);
    document.getElementById('contextGuardSave').addEventListener('click', guardSaveAndContinue);
    document.getElementById('contextGuardDiscard').addEventListener('click', guardDiscardAndContinue);
    document.getElementById('contextGuardCancel').addEventListener('click', closeContextGuard);
    overlay.addEventListener('keydown', event => keepFocusInDialog(event, overlay, closeContextGuard));
    window.AppAlerts?.warning(`You have unsaved changes for ${company}. Choose how to continue.`, {
      key: 'customer-context-unsaved', persist: true
    });
    document.getElementById('contextGuardSave').focus();
  }

  async function requestCreateNewCustomer() {
    if (typeof canCreateRoiCustomer === 'function' && !canCreateRoiCustomer()) {
      window.AppAlerts?.error('Creating ROI customers requires the Sales Rep or Admin role.', { key: 'customer-create-role', persist: true });
      return;
    }
    discardOnCommit = false;
    const proceed = async () => { window.closeCustomerSwitcher?.(); await openCustomerSetup(); };
    if (window.hasUnsavedChanges?.()) showContextGuard(proceed);
    else await proceed();
  }

  window.openCustomerSetup = openCustomerSetup;
  window.closeCustomerSetup = closeCustomerSetup;
  window.requestCreateNewCustomer = requestCreateNewCustomer;
  window.guardCustomerContextChange = showContextGuard;
})();

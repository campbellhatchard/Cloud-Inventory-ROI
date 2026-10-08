'use strict';

/* One customer-creation contract shared by the schema endpoint and the write
   endpoint. The browser renders this contract; PostgreSQL remains authoritative. */
const CUSTOMER_SETUP_CONTRACT = Object.freeze({
  version: 1,
  fields: Object.freeze([
    Object.freeze({
      key: 'name',
      label: 'Company Name',
      classification: 'required',
      inputType: 'text',
      required: true,
      maxLength: 255,
      help: 'Use the customer’s recognized company or account name.'
    }),
    Object.freeze({
      key: 'hasFieldInventory',
      label: 'Field Inventory',
      classification: 'optional',
      inputType: 'checkbox',
      required: false,
      help: 'Select when the customer manages inventory outside warehouses or stockrooms.'
    })
  ]),
  serverDerived: Object.freeze([
    Object.freeze({ key: 'ownerId', label: 'Account Owner', source: 'authenticated-user' })
  ])
});

function normalizeCustomerSetup(input = {}) {
  const rawName = String(input.name == null ? '' : input.name).normalize('NFKC');
  return {
    name: rawName.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim(),
    hasFieldInventory: input.hasFieldInventory === true
  };
}

function validateCustomerSetup(input = {}) {
  const value = normalizeCustomerSetup(input);
  const errors = [];
  if (!value.name) errors.push({ field: 'name', code: 'REQUIRED', message: 'Company Name is required.' });
  if (value.name.length > 255) errors.push({ field: 'name', code: 'MAX_LENGTH', message: 'Company Name must be 255 characters or fewer.' });
  return { valid: errors.length === 0, value, errors };
}

function publicCustomerSetupContract() {
  return {
    version: CUSTOMER_SETUP_CONTRACT.version,
    fields: CUSTOMER_SETUP_CONTRACT.fields.map(field => ({ ...field })),
    serverDerived: CUSTOMER_SETUP_CONTRACT.serverDerived.map(field => ({ ...field }))
  };
}

module.exports = {
  CUSTOMER_SETUP_CONTRACT,
  normalizeCustomerSetup,
  validateCustomerSetup,
  publicCustomerSetupContract
};

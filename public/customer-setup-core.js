(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CustomerSetupCore = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  function requiredFields(contract = {}) {
    return Array.isArray(contract.fields) ? contract.fields.filter(field => field.required === true) : [];
  }

  function missingRequired(contract = {}, values = {}) {
    return requiredFields(contract).filter(field => {
      const value = values[field.key];
      return value == null || (typeof value === 'string' && !value.trim());
    });
  }

  function payloadFromContract(contract = {}, values = {}) {
    const payload = {};
    for (const field of Array.isArray(contract.fields) ? contract.fields : []) {
      if (!Object.prototype.hasOwnProperty.call(values, field.key)) continue;
      payload[field.key] = field.inputType === 'checkbox' ? values[field.key] === true : String(values[field.key] || '').trim();
    }
    return payload;
  }

  return { requiredFields, missingRequired, payloadFromContract };
});

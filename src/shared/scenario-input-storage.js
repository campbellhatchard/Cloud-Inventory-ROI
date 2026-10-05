'use strict';

/*
 * Canonical ROI inputs use the questionnaire/display units. Scenario JSON uses
 * a small number of legacy storage keys and stores selected percentages as
 * decimal fractions. This module is the single translation boundary between
 * those two representations.
 */
const DEFINITIONS = Object.freeze({
  userCount: Object.freeze({ storageKey: 'users', domId: 'userCount', scale: 1 }),
  laborCost: Object.freeze({ storageKey: 'labor', domId: 'laborCost', scale: 1 }),
  labor: Object.freeze({ storageKey: 'labor', domId: 'laborCost', scale: 1 }),
  inventoryValue: Object.freeze({ storageKey: 'inventory', domId: 'inventoryValue', scale: 1 }),
  discRate: Object.freeze({ storageKey: 'discRate', domId: 'discRate', scale: 0.01 }),
  laborWastePct: Object.freeze({ storageKey: 'laborWastePct', domId: 'laborWastePct', scale: 0.01 }),
  pickRateGainPct: Object.freeze({ storageKey: 'pickRateGainPct', domId: 'pickRateGainPct', scale: 0.01 }),
  orderErrorPct: Object.freeze({ storageKey: 'orderErrorPct', domId: 'orderErrorPct', scale: 0.01 }),
  contributionMarginPct: Object.freeze({ storageKey: 'contributionMarginPct', domId: 'contributionMarginPct', scale: 0.01 })
});

function definitionFor(canonicalInput) {
  const key = String(canonicalInput || '');
  return DEFINITIONS[key] || { storageKey: key, domId: key, scale: 1 };
}

/* Strictly parse customer-entered numeric evidence. Formatting characters are
 * accepted, but a formatting-only value (for example "$" or "%") is missing,
 * never zero. This prevents absence from becoming an economic fact. */
function normalizeExternalNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value === null || value === undefined) return null;
  let text = String(value).trim();
  if (!text) return null;
  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  text = text.replace(/[$£€¥,%\s,]/g, '');
  if (!text || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
  const number = Number(text);
  if (!Number.isFinite(number)) return null;
  return negative ? -Math.abs(number) : number;
}

function toStoredValue(canonicalInput, displayValue) {
  const numeric = normalizeExternalNumber(displayValue);
  if (numeric === null) return null;
  return numeric * definitionFor(canonicalInput).scale;
}

function toDisplayValue(canonicalInput, storedValue) {
  const numeric = normalizeExternalNumber(storedValue);
  if (numeric === null) return null;
  return numeric / definitionFor(canonicalInput).scale;
}

function scenarioStoredValue(data, canonicalInput) {
  const definition = definitionFor(canonicalInput);
  return data && Object.prototype.hasOwnProperty.call(data, definition.storageKey)
    ? data[definition.storageKey]
    : undefined;
}

function scenarioDisplayValue(data, canonicalInput) {
  return toDisplayValue(canonicalInput, scenarioStoredValue(data, canonicalInput));
}

function setScenarioDisplayValue(data, canonicalInput, displayValue) {
  const storedValue = toStoredValue(canonicalInput, displayValue);
  if (storedValue === null) throw new TypeError('A valid numeric ROI value is required.');
  const definition = definitionFor(canonicalInput);
  return { ...data, [definition.storageKey]: storedValue };
}

function equivalentNumber(a, b) {
  const left = normalizeExternalNumber(a), right = normalizeExternalNumber(b);
  return left !== null && right !== null && Math.abs(left - right) <= 1e-9;
}

/* Snapshots produced before v6.9.30 may contain the scenario-storage fraction
 * for percentage fields. Treat that legacy representation as equal to the
 * canonical display percentage so an unchanged save does not manufacture a
 * new rep_updated event. */
function historicalSnapshotMatches(canonicalInput, historicalValue, currentDisplayValue) {
  if (equivalentNumber(historicalValue, currentDisplayValue)) return true;
  return definitionFor(canonicalInput).scale !== 1
    && equivalentNumber(toDisplayValue(canonicalInput, historicalValue), currentDisplayValue);
}

module.exports = {
  DEFINITIONS,
  definitionFor,
  normalizeExternalNumber,
  toStoredValue,
  toDisplayValue,
  scenarioStoredValue,
  scenarioDisplayValue,
  setScenarioDisplayValue,
  historicalSnapshotMatches
};

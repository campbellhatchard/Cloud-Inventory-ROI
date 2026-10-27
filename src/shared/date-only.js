'use strict';

// Canonical server contract for PostgreSQL DATE business facts. Parsing is
// deliberately strict so timestamps and Date objects cannot hide a boundary
// regression in presentation code.
function parseDateOnly(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day) return null;
  return Object.freeze({ year, month, day, date });
}

function normalizeDateOnly(value) {
  const parsed = parseDateOnly(value);
  if (!parsed) return null;
  return `${String(parsed.year).padStart(4, '0')}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`;
}

function formatDateOnlyDisplay(value, options = {}) {
  const parsed = parseDateOnly(value);
  if (!parsed) return '';
  const format = { month: options.month || 'short', day: options.day || 'numeric', timeZone: 'UTC' };
  if (options.year !== false) format.year = options.year || 'numeric';
  return new Intl.DateTimeFormat(options.locale || 'en-US', format).format(parsed.date);
}

module.exports = { parseDateOnly, normalizeDateOnly, formatDateOnlyDisplay };

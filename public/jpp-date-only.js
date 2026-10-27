/* ═══════════════════════════════════════════════════════════════════
   jpp-date-only.js — governed Joint Project Plan calendar dates

   A YYYY-MM-DD value is a calendar date, not an instant in time. This
   helper validates the calendar components and formats them with explicit
   UTC presentation semantics so a browser timezone can never change the
   governed day.
   ═══════════════════════════════════════════════════════════════════ */
(function attachJppDateOnly(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CIJppDateOnly = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createJppDateOnly() {
  'use strict';

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

  function formatDateOnly(value, options = {}) {
    const parsed = parseDateOnly(value);
    if (!parsed) return '';

    const format = {
      month: options.month || 'short',
      day: options.day || 'numeric',
      timeZone: 'UTC'
    };
    if (options.year !== false) format.year = options.year || 'numeric';

    return new Intl.DateTimeFormat(options.locale || 'en-US', format).format(parsed.date);
  }

  return Object.freeze({ parseDateOnly, formatDateOnly });
});

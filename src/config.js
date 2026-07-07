'use strict';

function getAppUrl() {
  const explicit = String(process.env.APP_URL || '').trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const renderHost = String(process.env.RENDER_EXTERNAL_HOSTNAME || '').trim();
  if (renderHost) return `https://${renderHost}`.replace(/\/$/, '');

  return '';
}

function envInt(name, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = Number.parseInt(process.env[name] || '', 10);
  if (!Number.isInteger(raw)) return fallback;
  return Math.min(max, Math.max(min, raw));
}

module.exports = { getAppUrl, envInt };

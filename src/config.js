function normalizeUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function getAppUrl() {
  const explicit = normalizeUrl(process.env.APP_URL);
  if (explicit && !(process.env.NODE_ENV === 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(explicit))) return explicit;

  const externalUrl = normalizeUrl(process.env.RENDER_EXTERNAL_URL);
  if (externalUrl) return externalUrl;

  const externalHost = String(process.env.RENDER_EXTERNAL_HOSTNAME || '').trim();
  if (externalHost) return `https://${externalHost}`;

  return '';
}

module.exports = { getAppUrl };

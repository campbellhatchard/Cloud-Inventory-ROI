'use strict';

(function exposeProspectRuntime(root, factory) {
  const runtime = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = runtime;
  if (root) root.CIProspectRuntime = runtime;
})(typeof window !== 'undefined' ? window : null, function createProspectRuntime() {
  function roiPreviewPath(session) {
    if (!session || !session.token) throw new Error('An active Prospect session is required.');
    return '/api/discovery/sessions/' + encodeURIComponent(session.token) + '/roi-preview';
  }

  return Object.freeze({ roiPreviewPath });
});

'use strict';

function problem({ status = 500, code = 'INTERNAL_ERROR', title = 'Request failed', detail = 'The request could not be completed.', instance = null, phase = null } = {}) {
  return {
    type: `https://cloud-inventory-roi.local/problems/${String(code).toLowerCase().replace(/_/g, '-')}`,
    title,
    status,
    detail,
    code,
    ...(instance ? { instance } : {}),
    ...(phase ? { phase } : {})
  };
}

function sendProblem(res, value) {
  const payload = value && value.status ? value : problem();
  return res.status(payload.status).type('application/problem+json').json({ ...payload, error: payload.detail });
}

module.exports = { problem, sendProblem };

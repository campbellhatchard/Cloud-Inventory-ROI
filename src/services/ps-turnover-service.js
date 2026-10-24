'use strict';

const { transaction } = require('../db');
const { solutionFitAccess } = require('../authorization');
const SolutionFitState = require('../../public/solution-fit-state');
const { buildPSTurnoverModel } = require('../shared/ps-turnover-model');

class TurnoverAccessError extends Error {
  constructor(message, status = 403, code = 'TURNOVER_ACCESS_DENIED') {
    super(message);
    this.name = 'TurnoverAccessError';
    this.status = status;
    this.code = code;
  }
}

async function loadPSTurnoverModel({ customerId, user, queryImpl, accessImpl = solutionFitAccess, transactionImpl = transaction, generatedAt } = {}) {
  const load = async scopedQuery => {
    const access = await accessImpl(user, customerId, 'view', scopedQuery);
    if (!access?.exists) throw new TurnoverAccessError('Customer not found.', 404, 'CUSTOMER_NOT_FOUND');
    if (!access.allowed) throw new TurnoverAccessError('You do not have permission for this Solution Fit.', 403);

    const handoff = await scopedQuery(`SELECT h.id,h.customer_id,h.data,h.updated_at,h.primary_se_id,
      pse.username primary_se_name,owner.username account_executive
    FROM handoffs h
    LEFT JOIN users pse ON pse.id=h.primary_se_id
    LEFT JOIN customers c ON c.id=h.customer_id
    LEFT JOIN users owner ON owner.id=c.owner_id
    WHERE h.customer_id=$1 AND h.deleted_at IS NULL`, [customerId]);
    if (!handoff.rows.length) throw new TurnoverAccessError('Save the Solution Fit before creating the turnover output.', 409, 'SOLUTION_FIT_NOT_SAVED');

    const row = handoff.rows[0];
    const attachmentResult = await scopedQuery(`SELECT a.*,u.username uploaded_by_name
    FROM handoff_attachments a
    LEFT JOIN users u ON u.id=a.uploaded_by
    WHERE a.handoff_id=$1 AND a.customer_id=$2
    ORDER BY a.created_at,a.id`, [row.id, customerId]);
    const active = attachmentResult.rows.filter(item => item.status === 'ACTIVE' && !item.removed_at);
    const pendingAttachmentCount = attachmentResult.rows.filter(item => ['PENDING', 'FAILED'].includes(item.status) && !item.removed_at).length;
    const model = buildPSTurnoverModel({
      data: row.data || {},
      attachments: active,
      customerId,
      solutionFitId: row.id,
      customerName: access.customer?.name || '',
      accountExecutive: row.account_executive || '',
      primarySeId: row.primary_se_id || '',
      primarySeName: row.primary_se_name || '',
      generatedAt,
      pendingAttachmentCount
    });
    const turnover = SolutionFitState.turnoverStats(model.state);
    return Object.freeze({ model, turnover, savedAt: row.updated_at });
  };

  if (queryImpl) return load(queryImpl);
  return transactionImpl(async client => {
    await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    return load(client.query.bind(client));
  });
}

module.exports = { loadPSTurnoverModel, TurnoverAccessError };

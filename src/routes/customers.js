'use strict';

const express = require('express');
const { requireAuth, requireAnyRole, requireRole } = require('../middleware/auth');
const { query, transaction } = require('../db');
const { log, ACTIONS } = require('../audit');
const { publicCustomerSetupContract } = require('../shared/customer-setup-contract');
const { createCustomerHandler } = require('../shared/customer-setup-service');
const {
  OwnershipTransferError,
  listEligibleOwners,
  previewCustomerOwnershipTransfer,
  transferCustomerOwnership
} = require('../shared/customer-ownership-transfer');

const router = express.Router();

router.get('/setup-schema', requireAuth, (_req, res) => {
  res.json(publicCustomerSetupContract());
});

router.get('/ownership-eligible-users', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    res.json({ owners: await listEligibleOwners(query) });
  } catch (error) {
    console.error('customer_ownership.eligible_users_failed', { message: error.message });
    res.status(500).json({ error: 'Eligible Sales Reps could not be loaded.', code: 'ELIGIBLE_OWNERS_UNAVAILABLE' });
  }
});

router.get('/:id/ownership-transfer-preview', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const newOwnerId = String(req.query.newOwnerId || '').trim();
    if (!newOwnerId) return res.status(400).json({ error: 'Select a new Sales Rep.', code: 'NEW_OWNER_REQUIRED' });
    const preview = await previewCustomerOwnershipTransfer({
      customerId: req.params.id,
      newOwnerId,
      dataQuery: query
    });
    res.set('Cache-Control', 'no-store').json(preview);
  } catch (error) {
    const known = error instanceof OwnershipTransferError;
    console.error('customer_ownership.preview_failed', {
      customerId: req.params.id,
      adminUserId: req.user.id,
      code: error.code || 'OWNERSHIP_PREVIEW_FAILED',
      message: error.message
    });
    res.status(known ? error.status : 500).json({
      error: known ? error.message : 'Ownership impact could not be prepared.',
      code: known ? error.code : 'OWNERSHIP_PREVIEW_FAILED'
    });
  }
});

router.post('/:id/ownership-transfer', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await transferCustomerOwnership({
      customerId: req.params.id,
      newOwnerId: String(req.body?.newOwnerId || '').trim(),
      expectedCurrentOwnerId: String(req.body?.expectedCurrentOwnerId || '').trim(),
      reason: req.body?.reason,
      adminUserId: req.user.id,
      ipAddress: req.ip,
      transaction
    });
    console.info('customer_ownership.transferred', {
      customerId: result.customer.id,
      oldOwnerId: result.oldOwner.id,
      newOwnerId: result.newOwner.id,
      adminUserId: req.user.id,
      transferId: result.transferId
    });
    res.status(200).json(result);
  } catch (error) {
    const known = error instanceof OwnershipTransferError;
    console.error('customer_ownership.transfer_failed', {
      customerId: req.params.id,
      adminUserId: req.user.id,
      code: error.code || 'OWNERSHIP_TRANSFER_FAILED',
      message: error.message
    });
    res.status(known ? error.status : 500).json({
      error: known ? error.message : 'Ownership could not be transferred. No changes were made.',
      code: known ? error.code : 'OWNERSHIP_TRANSFER_FAILED'
    });
  }
});

router.post('/', requireAuth, requireAnyRole('rep', 'admin'), createCustomerHandler({
  dataQuery: query,
  auditLog: log,
  customerCreatedAction: ACTIONS.CUSTOMER_CREATED
}));

module.exports = router;

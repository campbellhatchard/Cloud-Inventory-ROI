'use strict';

const express = require('express');
const { requireAuth, requireAnyRole } = require('../middleware/auth');
const { query } = require('../db');
const { log, ACTIONS } = require('../audit');
const { publicCustomerSetupContract } = require('../shared/customer-setup-contract');
const { createCustomerHandler } = require('../shared/customer-setup-service');

const router = express.Router();

router.get('/setup-schema', requireAuth, (_req, res) => {
  res.json(publicCustomerSetupContract());
});

router.post('/', requireAuth, requireAnyRole('rep', 'admin'), createCustomerHandler({
  dataQuery: query,
  auditLog: log,
  customerCreatedAction: ACTIONS.CUSTOMER_CREATED
}));

module.exports = router;

'use strict';

const { validateCustomerSetup } = require('./customer-setup-contract');

function createCustomerHandler({ dataQuery, auditLog, customerCreatedAction = 'customer.created' }) {
  if (typeof dataQuery !== 'function') throw new TypeError('dataQuery is required');
  if (typeof auditLog !== 'function') throw new TypeError('auditLog is required');
  return async (req, res) => {
    const validation = validateCustomerSetup(req.body || {});
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Review the required customer information and try again.',
        code: 'CUSTOMER_VALIDATION_FAILED',
        fieldErrors: validation.errors
      });
    }

    const { name, hasFieldInventory } = validation.value;
    try {
      const inserted = await dataQuery(
        `INSERT INTO customers (name, owner_id, has_field_inventory, status, created_by)
         VALUES ($1, $2, $3, 'active', $2)
         ON CONFLICT (owner_id, LOWER(name)) DO NOTHING
         RETURNING id, name, owner_id, has_field_inventory, status, created_at, updated_at`,
        [name, req.user.id, hasFieldInventory]
      );

      if (!inserted.rows.length) {
        const existing = await dataQuery(
          `SELECT id, name, owner_id, has_field_inventory, status, deleted_at
             FROM customers
            WHERE owner_id=$1 AND LOWER(name)=LOWER($2)
            LIMIT 1`,
          [req.user.id, name]
        );
        const row = existing.rows[0];
        return res.status(409).json({
          error: 'A customer with this information may already exist.',
          code: 'CUSTOMER_DUPLICATE',
          existingCustomer: row && !row.deleted_at && row.status === 'active'
            ? { id: row.id, name: row.name }
            : null
        });
      }

      const row = inserted.rows[0];
      await auditLog({
        userId: req.user.id,
        action: customerCreatedAction,
        entityType: 'customer',
        entityId: row.id,
        detail: { hasFieldInventory: row.has_field_inventory === true },
        ipAddress: req.ip
      });
      return res.status(201).json({
        customer: {
          id: row.id,
          name: row.name,
          ownerId: row.owner_id,
          ownerUsername: req.user.username,
          hasFieldInventory: row.has_field_inventory === true,
          status: row.status,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          opportunityCount: 0,
          versionCount: 0,
          scenarioCount: 0
        }
      });
    } catch (error) {
      console.error('customer_setup.failed', { userId: req.user.id, message: error.message });
      return res.status(500).json({
        error: 'Customer could not be created. Your information has not been lost. Please try again.',
        code: 'CUSTOMER_CREATE_FAILED'
      });
    }
  };
}

module.exports = { createCustomerHandler };

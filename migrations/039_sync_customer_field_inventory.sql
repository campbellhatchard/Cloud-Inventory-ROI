-- v6.9.26: make the customer-level Field Inventory flag agree with the
-- newest current scenario that explicitly saved the governed flag.
WITH ranked AS (
  SELECT customer_id,
         (data->>'hasFieldInventory')::boolean AS has_field_inventory,
         ROW_NUMBER() OVER (
           PARTITION BY customer_id
           ORDER BY updated_at DESC, version DESC, id DESC
         ) AS row_number
  FROM scenarios
  WHERE customer_id IS NOT NULL
    AND deleted_at IS NULL
    AND is_current = TRUE
    AND data ? 'hasFieldInventory'
    AND jsonb_typeof(data->'hasFieldInventory') = 'boolean'
)
UPDATE customers AS customer
SET has_field_inventory = ranked.has_field_inventory,
    updated_at = NOW()
FROM ranked
WHERE ranked.row_number = 1
  AND customer.id = ranked.customer_id
  AND customer.has_field_inventory IS DISTINCT FROM ranked.has_field_inventory;

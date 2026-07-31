# Cloud Inventory ROI v3.7.0 — Staging Deployment Notes

This package is prepared for a **separate Render staging Blueprint**, not the existing production Blueprint.

## Staging resource names

- Web service: `cloud-inventory-roi-staging`
- PostgreSQL database: `cloud-inventory-roi-staging-db`
- Git branch: `staging`
- Health endpoint: `/health`
- Expected health version: `3.7.0`

## Why staging needs a separate Render deployment

Migration `011_customers.sql` creates real customer rows and links existing scenarios to customers. It is additive, but it writes data. Do not run this first against production.

Create or use a separate staging web service and a separate staging PostgreSQL instance. Do not point staging at the production `DATABASE_URL`.

## Migration proving checklist

After deployment, verify:

```sql
SELECT filename FROM schema_migrations ORDER BY filename;
SELECT COUNT(*) FROM customers;
SELECT COUNT(*) FROM scenarios WHERE customer_id IS NULL AND company <> '';
```

Expected result: `011_customers.sql` appears, `customers` is populated if scenarios existed, and the final query returns `0` for active named scenarios.

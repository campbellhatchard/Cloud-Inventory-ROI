# Cloud Inventory ROI v6.9.15 Release Manifest

- Authoritative parent: `cloud-inventory-roi-v6.9.13-render-ready.zip`
- Parent SHA-256: `4a61dbdb2c64e6968acf240f107079dc58a014c44f382fb56a4fc134999ae562`
- ROI Model v2.8 / modelVersion 28
- Brand System v1.0
- Application Knowledge v1.0
- Christie Persona v1.0

This production-recovery release corrects the public Prospect ROI preview token scope, the PostgreSQL scenario-scoped Discovery lookup, the base scenario-list shared-state reference, and stale Executive PDF behavior. Executive PDF generation now fails closed while calculator changes are unsaved, requiring the rep to save the updated ROI as a governed scenario version before export.

The release also preserves the two production corrections introduced in v6.9.14: the scenario-create response includes `customer_id`, and current-version promotion after deletion uses PostgreSQL-valid SQL.

No ROI formula, authorization role, database migration, Render service, database resource, or production environment variable is changed.

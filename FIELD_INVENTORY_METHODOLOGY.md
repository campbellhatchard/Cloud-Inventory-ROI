# Field Inventory Methodology — Model v2.8

When Field Inventory is off, the questionnaire uses one inventory pool. When it is on, central and field inputs are mutually exclusive:

- Central inventory: warehouses and central locations only; excludes trucks, vans, contractor sites, job sites, remote field stores, and all field stock reported separately.
- Field inventory: those excluded distributed locations only; excludes central inventory.

Central write-off likewise excludes field loss. Field leakage is `fieldInvValue × fieldLeakageRate × mFieldLeakage`. Field carrying is `fieldInvValue × carryRate × effective recovery`. Accuracy may derive the recovery assumption, but accuracy alone creates no dollars.

Field reconciliation is `locations × reconciliations/location/year × person-hours/reconciliation × loaded hourly labor × mFieldCount`, where loaded hourly labor is annual loaded labor / 2,080. A location count by itself creates no benefit. Construction reuses its job-site location question and suppresses the generic field-location question.

Example: $8M central plus $2M field means the engine receives exactly $8M central and $2M field—not a $10M all-location central value plus $2M field. If central write-off is $100K and field leakage is $2M × 5%, the $100K central answer must exclude the field loss.

Generic labor excludes formal field reconciliation and repeat truck rolls. Reconciliation and first-time-fix therefore remain separately defined activities rather than duplicating the workforce-productivity pool.

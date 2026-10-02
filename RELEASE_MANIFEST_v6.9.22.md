# Cloud Inventory ROI v6.9.22 Release Manifest

## Baseline

- Parent archive: `cloud-inventory-roi-v6.9.21-render-ready.zip`
- Parent SHA-256: `486b641fc3c0e6781c44292ddd3557617763cb9627a2aa1e7e886be756e8bb01`
- Production parent commit: `cc9d5c0ca37eee6083383b409baeeb559cfaa73e`
- Developer source snapshot: `38af11c056f15e6491dbe2797b1165ae6845f76f`

## Corrective scope

- Makes the governed Executive Output Readiness dialog visible by applying the shared modal `open` state.
- Closes any existing readiness workflow before opening another, preventing duplicate hidden dialogs and unresolved export actions.
- Preserves the v6.9.21 rule that PDF and PowerPoint generation deadlines begin only after the user completes readiness.
- Preserves ROI Model v2.8, evidence provenance, authorization, native currency, and all prior output governance.

## Deployment

Deploy the root of `cloud-inventory-roi-v6.9.22-render-ready.zip`. Run the standard Render build and start commands. PostgreSQL integration must be certified in CI or a safe non-production database before a production readiness decision.

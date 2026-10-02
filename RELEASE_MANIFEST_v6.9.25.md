# Cloud Inventory ROI v6.9.25 Release Manifest

## Lineage

- Parent: `cloud-inventory-roi-v6.9.24-render-ready.zip`
- Parent SHA-256: `7f06565d76a4918f9c78fe8cc0debd1af64f71cc3a40ceeb474ec57726e0a7f2`
- Deployed parent Git commit: `fc348bd5cc43b31dd5b5611afd92a00d750afd2b`
- Developer source snapshot: `00b8163afc7e621061a7db521b3a6bab685452a1`
- Release: 6.9.25

## Corrective scope

- Preserve canonical customer identity across scenario versions and administrator on-behalf saves.
- Repair historical scenario/customer identity mismatches with migration 038.
- Replace failing popup/print PDF workflows for Joint Project Plan, Stakeholder Map, Solution Fit, Competitive Battlecard, and Impact Map with authenticated server-generated PDF downloads.
- Restore first-save reachability for Executive Proposal and preserve explicit save controls.
- Correct contract comparison projections, Solution Fit stage context, Christie Stakeholder/JPP context, JPP blank milestones, Prospect evidence contrast and warning precision, role labels, analytics autofill hardening, and payback precision.

## Preserved authorities

ROI Model v2.8 / modelVersion 28, Brand System v1.0, Application Knowledge v1.0, Christie Persona v1.0, immutable Prospect submissions, deliberate per-value application, Value History, Rep Confirmed provenance, native currency, governed output readiness, BuyCycle evidence, and SE cross-account Solution Fit scope remain authoritative.

## Package exclusions

The release archive is created from the validated Git commit and excludes `.git`, `node_modules`, environment files, local work products, and prior release archives.

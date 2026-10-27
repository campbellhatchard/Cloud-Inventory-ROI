# Deployment Validation — v6.9.52

## Controlled deployment checklist

1. Deploy only `cloud-inventory-roi-v6.9.52-render-ready.zip` and record its SHA-256.
2. Confirm `/health`, login, and Admin Version History show `6.9.52`.
3. Sign in as an owner and open a saved JPP with target close date `2027-03-31`.
4. Confirm All Plans displays `Close: Mar 31, 2027`.
5. Reopen the plan and confirm the date input is `2027-03-31` and all saved milestones hydrate.
6. Reload the browser and repeat steps 4–5.
7. Confirm the public prospect link displays March 31 and that owner sharing controls still work.
8. Sign in as an authorized non-owner and confirm review/PDF/PPTX remain available while editing and link mutation remain unavailable.
9. Generate internal/customer JPP PDF and PPTX and confirm the target date represents March 31.
10. Record live evidence in this document; do not infer live success from local tests.

## Live result

`NOT TESTED — deployment is controlled by the Product Owner.`

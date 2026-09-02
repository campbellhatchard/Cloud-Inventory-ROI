# Render Deployment Validation — v6.8.4

## Before deployment

- Run the complete automated regression suite with zero failures.
- Confirm the package reports application 6.8.4, ROI Model 2.8/modelVersion 28, Brand 1.0, Knowledge 1.0, and Christie Persona 1.0.
- Confirm the output registry validates and generated PPTX files open as OOXML packages.
- Confirm no production PowerPoint dependency loads from a public CDN.

## Render smoke test (pending deployment)

- Sign in and switch customers; confirm current scenario data refreshes.
- Generate every customer Executive and Proposal format and open each file.
- Generate customer and internal Joint Project Plan variants; confirm the correct footer and no audience leakage.
- Generate Solution Fit customer summary/risk ledger and internal handoff.
- Generate Competitive Word/PDF, Methodology PDF/PPTX, Impact Map, Champion Pack, Role One-Pager, and Stakeholder exports.
- Block popups once and confirm the persistent recovery action is usable.
- Confirm generated filenames include output type, customer/subject, and date.
- Log out and confirm protected output endpoints reject the expired session.

Do not mark Render certification passed until these checks are performed against the deployed service.

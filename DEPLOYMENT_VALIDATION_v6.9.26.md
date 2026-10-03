# Cloud Inventory ROI v6.9.26 Deployment Validation

After deployment, verify `/health` reports `6.9.26` and the login and Version History screens agree.

## Required live checks

1. Switch from a populated customer to a zero-scenario customer and confirm no prior values, scenario/version label, warnings, AI context, or KPIs remain.
2. Load current and historical scenarios; confirm the picker identifies historical versions and refreshes authoritative data.
3. Toggle Field Inventory, enter field values, save, reload, and switch CIP/MEP. Confirm the flag persists and product selection alone does not change ROI.
4. Complete and submit a Prospect Link. Confirm the calculator warns until each submitted value is deliberately applied and saved; confirm drafts are never treated as submitted evidence.
5. Type and AI-enhance all Three Whys, save, navigate away, log out/in, and confirm persistence. Generate Executive Web/PDF/Word/PPTX and verify the latest saved narrative appears.
6. Validate Joint Project Plan owner editing, team read-only behavior, saved-state output blocking, and customer/internal PDF/PPTX.
7. Validate Solution Fit creation/search as SE, scope counts, save-before-output, and all three PDF variants.
8. Validate Competitive Research CIP/MEP context, recoverable AI failure, approved Battlecard PDF/Word, Christie internal coaching, customer email tone, and deterministic AI formula Help.
9. Download and inspect all 25 active registered outputs for non-empty valid PDF/DOCX/PPTX/HTML, correct audience/footer, native currency, and saved authoritative data.
10. Exercise password reset, welcome, Prospect submission/update, and purge-confirmation email flows.

Render and disposable PostgreSQL validation remain Product Owner deployment activities and are not inferred from local tests.

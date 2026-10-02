# Deployment Validation — v6.9.20

After Render deployment, verify the deployed version and commit, then repeat:

1. Generate a Prospect Link immediately after selecting a saved opportunity.
2. Enter answers rapidly across multiple questionnaire sections, submit, and confirm immutable history count equals the submitted count.
3. Confirm SE-only users cannot create or save ROI customers but retain cross-account Solution Fit access.
4. Confirm Calculator, timeline, Saved Scenarios, Executive output, and Sales Manager show the same contract ROI/NPV/payback.
5. Save Three Whys, create a new version, log out/in, and verify the rendered Executive story.
6. Double-click Save and confirm only one opportunity/version action occurs.
7. Confirm Sales Manager search opens blank after account switching.
8. Download Executive PDF; on any failure confirm controls recover, Retry appears, and Admin Error Log receives `executive_pdf`.

Do not use production customer data for automated tests.

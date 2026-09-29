# Deployment Validation — v6.9.15

## Before pushing

1. Confirm production `main` is still commit `95df1c80543c9851df3d0b995fb262804d779a63` (v6.9.14).
2. Confirm the deployment ZIP matches its published SHA-256.
3. Run the PowerShell script without `-Deploy` and require every validation gate to pass.
4. Do not perform a Render Blueprint sync or create a new service/database.

## Deployment

Run the same PowerShell command with `-Deploy`. The script creates and pushes a timestamped backup branch for the current production commit before pushing the validated v6.9.15 commit to `main`. Render auto-deploy should then start once from the GitHub push.

## Required production smoke tests

1. Confirm the latest Render deployment is Live.
2. Confirm `/health` returns HTTP 200, application version 6.9.15, and database connected.
3. Confirm startup completes without migration or PostgreSQL errors. No new migration is expected beyond 037.
4. Open a public Prospect Link and confirm the ROI progress/value panel renders.
5. Change a material prospect answer and confirm the displayed modeled annual benefit changes.
6. Submit the prospect answers, reopen the opportunity as the rep, and confirm answers refresh.
7. Change a material ROI input without saving and confirm Executive PDF is blocked with the governed save instruction.
8. Save a new scenario version, generate Executive PDF, and confirm the updated ROI values appear.
9. Create a scenario and confirm its customer identity is retained.
10. Delete a current scenario version in controlled test data and confirm another valid version becomes current.

If any check fails, stop testing, preserve the Render logs and release commit, and redeploy the timestamped backup branch. Do not make an unreviewed production hotfix.

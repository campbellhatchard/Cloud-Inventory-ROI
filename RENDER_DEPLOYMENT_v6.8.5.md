# Render deployment — v6.8.5

## Service

- Runtime: Node.js 22
- Build command: `npm ci --omit=dev --no-audit --no-fund`
- Start command: `node server.js`
- Health check: `/health`
- Database: Render PostgreSQL via `DATABASE_URL`
- Persistent disk: not required. Executive exports are generated in memory and streamed to the authenticated requester.

## Required environment variables

Set `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, and `BCRYPT_ROUNDS=12`. On the first deployment, also set `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_PASSWORD`, and `BOOTSTRAP_ADMIN_EMAIL`. Set `APP_URL` to the public HTTPS origin.

Optional integrations use `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL`, `SENDGRID_API_KEY`, and `FROM_EMAIL`. Never commit their values.

## GitHub deployment

1. Commit the validated v6.8.5 source and push it to the production branch.
2. In Render, connect the repository or synchronize the existing Blueprint from `render.yaml`.
3. Confirm the PostgreSQL attachment supplies `DATABASE_URL` and enter all `sync: false` values in the Render dashboard.
4. Deploy the exact validated commit. Do not deploy a local working directory or extracted ZIP contents with runtime artifacts.
5. Confirm `/health` returns a healthy process response, then sign in and complete the post-deploy checks below.

## Post-deploy verification

1. Sign in as Admin and as one non-admin authorized role.
2. Confirm authorized customers load, switch customers, refresh, and verify the selected customer's latest saved scenario remains isolated.
3. Edit and save a scenario, reload it, and verify the saved values and 12–60 month contract calculations.
4. Open Executive View and inspect the contract-value and benefit charts at desktop, laptop, tablet, and mobile widths.
5. Generate and open PDF, PowerPoint, and Word exports. Confirm customer name, ROI values, charts, Cloud Inventory branding, footers, and professional filenames.
6. Verify an unauthorized scenario ID returns 403/404 without customer data.
7. Restart the service and repeat customer/scenario loading to prove PostgreSQL persistence.

## Operational notes

Exports create no local files, so no export cleanup job or writable persistent filesystem is required. The release `.gitignore` excludes local logs, caches, temporary folders, and generated Office/PDF artifacts so local QA cannot dirty the deployment commit.

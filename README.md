# Cloud Inventory ROI Business Case Builder

Database-backed Node.js/Express application for creating and managing Cloud Inventory ROI business cases. The package includes a Render Blueprint that creates both the web service and its PostgreSQL database.

## GitHub repository structure

Upload the **contents of this folder** to the root of a GitHub repository. `render.yaml`, `server.js`, and `package.json` must all be at the repository root.

## Deploy with a Render Blueprint

1. Push the package contents to GitHub.
2. In Render, open **Blueprints** and select **New Blueprint Instance**.
3. Connect the GitHub repository containing this package.
4. Render reads `render.yaml` and creates:
   - the `cloud-inventory-roi` Node web service;
   - the `cloud-inventory-roi-db` PostgreSQL database;
   - the `DATABASE_URL` connection automatically;
   - a generated `JWT_SECRET`.
5. During initial Blueprint creation, provide optional values when prompted:
   - `ANTHROPIC_API_KEY` for AI Enhance;
   - `SENDGRID_API_KEY` and `FROM_EMAIL` for password-reset and welcome emails.
6. Apply the Blueprint and monitor the deploy logs.
7. Confirm the service health endpoint returns JSON at `/health`.
8. Open `/login.html` and sign in with the initial administrator account below.

## Initial administrator account

- **Username:** `admin`
- **Initial password:** `CloudInventory2026!`
- **Role:** Administrator
- **First-login behavior:** the application requires the password to be changed immediately.

These values are intentionally hardcoded in `render.yaml` under `BOOTSTRAP_ADMIN_*`. Anyone who can read the repository can see them. Use a private repository and change the password at first login.

The bootstrap routine is idempotent:

- it creates the administrator only when the account does not exist;
- it upgrades the legacy package password `CI2026` to the configured password;
- it does not overwrite a password that an administrator has already changed.

## Application URL

No manual `APP_URL` setting is required for a standard Render deployment. The application uses Render's automatically provided `RENDER_EXTERNAL_URL`.

Set `APP_URL` manually only when you want generated email and prospect links to use a custom domain instead of the `onrender.com` address.

## Blueprint configuration

The corrected `render.yaml` includes:

- `runtime: node` for the Express application;
- `plan: free` for both the web service and PostgreSQL database;
- `healthCheckPath: /health`;
- `autoDeployTrigger: commit` for GitHub pushes;
- Node `22.22.0`, avoiding unexpected upgrades to a newer Render default runtime;
- automatic private-network database connection through `fromDatabase`;
- `ipAllowList: []` so PostgreSQL is not exposed to the public internet;
- a generated JWT secret;
- hardcoded bootstrap administrator settings.

Custom `headers` are not defined in the Blueprint because Render supports that field only for static sites. Security headers are applied by Helmet in `server.js`.

## Important Free-plan limitation

Render's Free PostgreSQL databases expire 30 days after creation. The Free web service can also spin down when idle. Use the Free plans for validation or demonstration, not durable production use. Change the database and web-service plans in `render.yaml` before production deployment.

## Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | Yes | Injected automatically by Render from PostgreSQL |
| `JWT_SECRET` | Yes | Generated automatically by Render |
| `NODE_VERSION` | Yes | Pinned to `22.22.0` |
| `BOOTSTRAP_ADMIN_USERNAME` | Yes | Initial administrator username |
| `BOOTSTRAP_ADMIN_PASSWORD` | Yes | Initial administrator password |
| `BOOTSTRAP_ADMIN_EMAIL` | Yes | Initial administrator email |
| `ANTHROPIC_API_KEY` | No | Enables AI Enhance |
| `ANTHROPIC_MODEL` | No | Defaults to the configured Claude model |
| `SENDGRID_API_KEY` | No | Enables application emails |
| `FROM_EMAIL` | No | Verified SendGrid sender address |
| `APP_URL` | No | Optional custom-domain override |

## Local development

```bash
npm install

export DATABASE_URL='postgresql://...'
export JWT_SECRET='replace-with-a-long-random-secret'
export BOOTSTRAP_ADMIN_USERNAME='admin'
export BOOTSTRAP_ADMIN_PASSWORD='CloudInventory2026!'
export BOOTSTRAP_ADMIN_EMAIL='admin@cloudinventory.com'

npm start
```

The server listens on `PORT` when supplied and otherwise uses port `3000` locally.

## Database migrations

Migrations run automatically before the web server starts. Applied migration filenames are recorded in `schema_migrations`, so redeployment is safe and does not rerun completed migrations.

## Main components

- `render.yaml` — Render Blueprint
- `server.js` — Express application and API routes
- `src/migrate.js` — migrations and administrator bootstrap
- `migrations/` — PostgreSQL schema and seed data
- `src/routes/` — authentication, users, scenarios, help, and logs
- `src/middleware/auth.js` — JWT/session authorization
- `public/` — browser-delivered HTML, JavaScript, CSS, and images

# Discovery Link Auth Fix — v2.9.3

## Issue

Public prospect questionnaire links were returning HTTP 401 with:

```json
{"error":"Authentication required.","code":"NO_TOKEN"}
```

The token format was valid, but the request was being intercepted before the public discovery route could perform the token lookup.

## Root cause

`src/routes/analytics.js` was mounted broadly at `/api` and applied `requireAuth` to the entire router with router-level middleware. Because the router was loaded before the discovery routes, requests such as:

```text
/api/discovery/sessions/:token
```

entered the analytics router and were rejected for missing user authentication.

## Fix

- Removed router-level authentication from `src/routes/analytics.js`.
- Applied `requireAuth` only to the analytics and benchmark routes declared in that router.
- Left prospect discovery lookup and answer-save routes public bearer-token routes.
- Added no-store headers for `/api/discovery/sessions` responses.
- Added strict 64-character hexadecimal token validation.
- Added privacy-safe token hash logging for invalid/missing discovery links.
- Updated `public/prospect.html` so `401`, `403`, `404`, `410`, `429`, and server errors produce distinct user-facing messages.

## Verification

After deployment, this command should return 200, 404, or 410. It should not return 401 unless the route is still being intercepted by authentication middleware:

```powershell
$token = "PASTE_64_CHARACTER_TOKEN"
Invoke-WebRequest `
  -Uri "https://cloud-inventory-roi.onrender.com/api/discovery/sessions/$token" `
  -Method GET `
  -SkipHttpErrorCheck `
  -UseBasicParsing
```

Expected interpretation:

- `200`: token exists and questionnaire is accessible.
- `400`: token is malformed or truncated.
- `404`: token does not exist in the current database.
- `410`: token exists but is expired or inactive.
- `401`: public route is still incorrectly blocked by authentication.
- `429`: rate-limit issue.

# CSP login and UI event-handler repair — v2.0.3

## Root cause

Helmet merges its default Content Security Policy directives with the application overrides. Its default `script-src-attr` value is `'none'`. The application uses inline HTML event handlers such as `onsubmit="handleLogin(event)"` and numerous `onclick` handlers. Browsers therefore blocked those handlers before the JavaScript functions could run.

For the login form, the blocked `onsubmit` caused the browser to perform a normal GET form submission and reload `login.html`, making it appear that the Sign in button did nothing. The same policy would also disable many controls after login.

## Repair

`server.js` now explicitly sets:

```js
scriptSrcAttr: ["'unsafe-inline'"]
```

This is a compatibility repair for the existing UI architecture. A later hardening release should remove inline event attributes, bind handlers with `addEventListener()`, and restore `script-src-attr 'none'`.

## Verification

After deployment:

1. Open `/health` and confirm `"version":"2.0.3"`.
2. Hard-refresh `/login.html`.
3. Enter the bootstrap credentials and submit.
4. The browser should navigate to `/change-password.html?first=1`.
5. Complete the password change and confirm the main application controls respond.

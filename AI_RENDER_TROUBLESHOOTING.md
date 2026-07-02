# AI Enhance — Render / Anthropic Troubleshooting

## What changed in this package

The previous build sent a hard-coded model value from the browser. This package moves model selection to the server and defaults to:

```env
ANTHROPIC_MODEL=claude-sonnet-4-6
```

Anthropic lists `claude-sonnet-4-6` as a current Claude API model ID. If your corporate license gives access to a different model or gateway, set `ANTHROPIC_MODEL` and/or `ANTHROPIC_BASE_URL` in Render.

## Required Render variables

In Render → Service → Environment, set:

```env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
```

Recommended:

```env
ANTHROPIC_MODEL=claude-sonnet-4-6
```

Only if your corporate Cloud AI license uses a private gateway/proxy instead of Anthropic's public API:

```env
ANTHROPIC_BASE_URL=https://your-company-ai-gateway.example.com
```

If your license is through AWS Bedrock, Google Vertex AI, or Microsoft Foundry, this direct Anthropic proxy will not work without a provider-specific integration. Those services use different auth, model identifiers, and endpoint patterns.

## Safe configuration test

After redeploy, open this URL in the browser:

```text
https://<your-render-service>/api/enhance/health
```

Expected response:

```json
{
  "status": "ok",
  "anthropicKeyConfigured": true,
  "anthropicBaseUrl": "https://api.anthropic.com",
  "anthropicModel": "claude-sonnet-4-6",
  "baseUrlValid": true,
  "baseUrlError": null
}
```

If `anthropicKeyConfigured` is `false`, Render does not have the key available to the running service. Re-check spelling, save, and redeploy.

If `baseUrlValid` is `false`, `ANTHROPIC_BASE_URL` is set to a malformed URL — check `baseUrlError` for the parsing error.

## What to look for in Render logs

Bad signs:

- `ANTHROPIC_API_KEY is not set`
- `401` / `authentication_error`: wrong key or key not valid for this endpoint
- `403` / `permission_error`: key exists but account/model access is blocked
- `404` / model not found: wrong `ANTHROPIC_MODEL`
- timeout / DNS errors: corporate gateway or outbound network issue

## Most likely issue if you still get the same error

If the API key is definitely set and `/api/enhance/health` shows `anthropicKeyConfigured: true`, the problem is likely one of these:

1. The corporate license is not a direct Anthropic API key.
2. The key is restricted to a different provider endpoint.
3. The old hard-coded model was not available to your account.
4. Render redeployed the wrong branch/package.

This package addresses #3 and improves diagnostics for #1, #2, and #4.

# v6.8.0 Release Validation

## Automated result

- ROI engine: **34 passed, 0 failed**
- Node regression suite: **346 passed, 0 failed, 4 skipped**
- Total executed passes: **380**
- Skips: **4** real-PostgreSQL integration cases because `DATABASE_URL` was not configured in the packaging workspace
- Application Knowledge generated-artifact drift check: **passed**
- JavaScript syntax checks for server, AI Help and Christie client: **passed**

## Human Help coverage

Application Knowledge 1.0 supplies a baseline topic for all major workspaces and the curated Help catalog supplies workflow detail. Each baseline covers purpose, primary action, non-automatic boundaries and next workflow.

## AI Help architecture

`POST /api/ai-help` is authenticated, rate limited and server grounded. The browser no longer contains the large product knowledge base. Governed field metadata comes from the existing questionnaire/ROI registry.

## Field and Prospect Help

Internal field Help sends identifiers rather than authoritative facts. Prospect-Link Help validates the link token and resolves the exact question from the linked discovery session. Client field labels and mappings are ignored. Internal sales content is excluded before model invocation.

## Christie Persona and coaching

Christie Persona 1.0 is server configured. Coach Me uses authorized scenario context and contract-term economics. Quick/Standard/Detailed and Supportive/Balanced/Challenging preferences are saved per user, with Standard + Challenging defaults. Tone cannot change facts. Christie has no write path to governed ROI, stage, evidence, stakeholders, plans, approvals, proof or proposal data.

## Context and authorization

Scenario authorization runs before context loading. A deterministic context revision changes only when material context changes. Requested manager/SE perspectives are reduced to rep when the authenticated role does not permit them.

## Email readiness

SendGrid is configured only when both `SENDGRID_API_KEY` and a verified `FROM_EMAIL` exist. No fallback sender is used. Production localhost URLs are rejected in favour of Render external URLs. Safe logging records state, message type, failure category and optional provider message ID—not tokens, temporary passwords, bodies or secrets. Provider failure does not roll back a valid business transaction.

No live SendGrid message was sent during automated testing. Production smoke tests remain a deployment step.

## Locked foundations

- ROI Model: **v2.8 / modelVersion 28**, unchanged
- Brand System: **v1.0**, unchanged
- Application Knowledge: **v1.0**, new
- Christie Persona: **v1.0**, new

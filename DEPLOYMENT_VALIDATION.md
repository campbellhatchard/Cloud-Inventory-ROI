# Cloud Inventory ROI v6.8.5 Deployment Validation

Complete the output-specific checklist in `DEPLOYMENT_VALIDATION_V6.8.4.md`. Render output certification remains pending until those checks run against the deployed service.

## Render deployment configuration

- The Blueprint is defined by `render.yaml` at the repository root.
- Render provisions the Node web service and PostgreSQL database.
- The production build uses `npm ci --omit=dev --no-audit --no-fund`.
- The service binds to Render's `PORT` on `0.0.0.0`.
- `/health` verifies database connectivity and returns a non-success response when PostgreSQL is unavailable.
- Database migrations run automatically before the server begins accepting traffic.
- `SIGTERM` triggers graceful HTTP and database shutdown.

## Required values during Blueprint creation

Render prompts for these values because they are declared with `sync: false`:

- `BOOTSTRAP_ADMIN_USERNAME`
- `BOOTSTRAP_ADMIN_PASSWORD` (at least 12 characters)
- `BOOTSTRAP_ADMIN_EMAIL`

Production startup fails rather than using default administrator credentials when any required value is absent.

## Optional integrations

Add these in the Render dashboard when the corresponding feature is needed:

- `ANTHROPIC_API_KEY`
- `SENDGRID_API_KEY`
- `FROM_EMAIL`

`APP_URL` is optional on Render because the application uses Render's external URL automatically.


## Production-baseline hardening applied during v6.8.5 validation

This deployment candidate is validated against live production v6.8.2 commit `810e7f6d48c8c74a01d53c0c52309210a2f5db11`. It retains the approved v6.8.3 customer-loading and Executive-output recovery plus the v6.8.5 output-certification work while preserving the v6.8.2 production locks: one canonical early `requireAuth` binding, explicit-zero ramps, `fieldInvSav`, customer-input-only Medical Devices / Life Sciences behavior, server-authoritative contract-term metrics, historical shared-business-case recomputation, bounded prospect AI history, authenticated Three Whys persistence, complete CI coverage, and the governed ROI/Brand/Knowledge/Christie versions. The final package restores the cumulative production-lock test and includes the v6.8.3/v6.8.5 suites.

Migration 026 intentionally replaces only the governed `buycycle_stage_config` reference rows. Every migration is executed inside the migration runner's per-file PostgreSQL transaction, so a failure rolls back the entire migration before `schema_migrations` is updated. No migration 025–034 contains destructive customer/opportunity data deletion.

## Release validation

Before uploading or syncing the Blueprint:

1. Run `npm ci` with Node.js 22.
2. Run `npm run migrate` against a disposable PostgreSQL 16 database.
3. Run `npm test`; it includes the complete application regression suite, v6.8.1/v6.8.2/v6.8.3/v6.8.5 completion tests, and production-lock regression tests.
4. Confirm `package.json`, `package-lock.json`, the UI version, and version history all report `6.8.4`.
5. After deployment, confirm `/health` reports version `6.8.4` and `database: connected`.
6. Configure both `SENDGRID_API_KEY` and a SendGrid-verified `FROM_EMAIL`. Configure `APP_URL` with the public HTTPS origin or allow Render external URL discovery. Never use localhost in production.
7. Perform one password-reset and one Prospect notification smoke test. Confirm only status/category/provider message ID are logged; never tokens, temporary passwords, message bodies or API keys.

## v6.6.4 Competitive Product Identity Integrity smoke test

1. With Microsoft Power Apps already present, add Dynamics 365 Supply Chain Management using a `microsoft.com` URL. Confirm Microsoft is reused as the company while a distinct product record is created.
2. Repeat with Oracle Warehouse Management versus Oracle Inventory Management and SAP EWM versus SAP Inventory Management. Confirm root domains never collapse sibling products.
3. Confirm exact product names, governed aliases such as RF Gen, and exact non-root governed product URLs still resolve true duplicates.
4. In Admin Sources, reject a Proposed source and confirm it remains inspectable, is not canonical, and cannot support finding approval. Reconsider it and confirm it returns to Proposed rather than Approved.
5. Confirm an opportunity owner can view and link competitive context, an unrelated rep receives 403, and a shared read-only user can view but cannot link.
2. Confirm research with an unauthorized `opportunityBaseId` is rejected before AI or persistence and creates no opportunity association.
3. Confirm CIP includes SAP WM/EWM, Oracle WMS, and relevant status-quo alternatives; MEP lists RFgen and RF-SMART separately; and EPP can research or associate products.
4. Open historical scenarios using `sap`, `oracle`, and `excel`; confirm each resolves without changing scenario JSON.
5. Open a historical `mep_rfgen` scenario; confirm it requires a deliberate RFgen or RF-SMART choice and creates no association beforehand.
6. In Admin, edit company, product name, aliases, category, website, CIP/MEP/EPP relevance, and status. Confirm the product UUID and historical research remain unchanged.
7. Approve, reject, retire, view, and set a canonical competitor source. Confirm a proposed-source finding cannot be approved until its direct source is approved.
8. Merge a duplicate into a product that already has a Battlecard. Confirm research, findings, sources, aliases, opportunity links, recent references, and revisions are visible on the survivor while its prior current revision stays current.
9. Inspect Research History and Battlecard revisions without database access. Confirm source, status, change summary, publisher, date, and finding count are visible.
10. Run Customer Proof regression and confirm `CUSTOMER_PROOF_LEGACY_AUDIT.md` is present in the deployment archive.

## v6.4.13 opportunity-value smoke test

1. Enter Estimated Opportunity Value before the first save, save, reload, and create a new version. Confirm the value and native currency persist in the governed Opportunity Profile.
2. Confirm Customer Switcher displays Opportunity Value—not Annual Customer Benefit—and shows **Not entered** when commercial value is unknown.
3. Confirm Sales Manager table and exposures use Opportunity Value, while its drawer separately shows Modeled Investment, Annual Customer Benefit, Total Contract Benefit, Net Economic Benefit, and Contract ROI.
4. Filter a mixed USD/GBP/EUR portfolio and confirm totals remain grouped by currency with valued and missing counts; no synthetic USD total is shown.
5. Change ROI investment assumptions and confirm Opportunity Value remains unchanged. Change Opportunity Value and confirm ROI results remain unchanged.
6. Close one Won and one Lost opportunity and confirm the close snapshot preserves Opportunity Value separately from the final ROI value case. Historical records without a captured value must remain **Not captured**.

## v6.4.12 analytics outcome-authority smoke test

1. Create an analytical fixture with one governed Won, one governed Lost, and one active governed opportunity whose legacy scenario outcome says Won. Confirm Won = 1, Lost = 1, Decided = 2, and Win Rate = 50%.
2. Repeat the conflict inside one industry and confirm the active governed record does not inflate industry win rate.
3. Confirm the active governed legacy-Won record is absent from Provenance vs Outcome and Stakeholder Coverage vs Outcome closed populations.
4. Confirm governed Won overrides legacy Lost, governed Lost overrides legacy Won, and a legacy Won/Lost remains available only when no governance row exists.
5. Confirm Customer Switcher, Sales Manager, Buyer Readiness, Christie, and Close Opportunity behavior are unchanged and governed-only.

## v6.4.11 outcome-integrity smoke test

1. Open an active opportunity in Saved Scenarios and confirm **Close Opportunity** opens Buyer Evidence & Stage Readiness; there is no second outcome editor.
2. Call the retired `PUT /api/scenarios/group/:baseId/outcome` endpoint with any payload and confirm it returns `410 Gone` without changing stage, outcome, history, or realized value.
3. Close one opportunity Won and one Lost in Buyer Readiness. Confirm both become governed Stage 7 and Customer Switcher shows them as closed; use **No Decision** only as a Closed Lost reason.
4. Create a new version of each closed opportunity. Confirm governed stage/outcome and the compatibility mirror carry forward without adding a second close-history event.
5. For Closed Won, record realized value and confirm the outcome remains Won. Confirm active and Closed Lost opportunities reject realized-value updates.
6. Seed a legacy row whose scenario outcome says Won while governance remains active. Confirm the workspace and switcher show it as active; confirm historical analytics may still use the explicitly documented governed-first legacy fallback.

## Governed close smoke test (introduced in v6.4.7)

1. Confirm Close Opportunity opens explicit Won and Lost choices without native browser prompts.
2. Confirm Lost works from Stages 2–6, requires a controlled reason and customer feedback, and preserves the server-derived Stage at Loss.
3. Confirm Competitor loss requires a confirmed competitor while No Decision, Status Quo, and Project Cancelled remain distinct.
4. Confirm Won requires Stage 6 readiness and five unchecked certifications; a Sales Leader/Admin role alone does not bypass governance.
5. Confirm an exceptional Won requires a current relevant Manager Exception and explicit exception acknowledgement.
6. Confirm the server generates final ROI, maturity, value-driver, stakeholder, evidence, readiness, and team snapshots and ignores browser-supplied ROI figures.
7. Confirm Stage 7 shows an outcome summary and no Advance, Regress, or Close actions.

## v6.4.6 criterion-specific evidence smoke test

1. Confirm a generic stakeholder does not complete Process Owner, Financial Authority, or Decision Stakeholders.
2. Confirm an engaged mapped Economic Buyer completes Financial Authority only.
3. Confirm a proposal, competitor selection, generic Discovery response, or Joint Project Plan does not complete an unrelated customer-agreement criterion.
4. Confirm Solution Fit requires every selected workflow to have Demo and Fit captured; workflow validation additionally requires every selected workflow to be Customer validated.
5. Confirm Stage 6 Implementation requires a Ready Solution Fit/Handoff plus current criterion-specific customer evidence.
6. Confirm stale, unvalidated, wrong-criterion, or empty `Complete` evidence cannot advance readiness.

## v6.4.5 Buyer Commitment smoke test

1. Confirm an engaged Economic Buyer plus one future customer milestone produces Moderate, not Very Strong.
2. Confirm seller-owned and overdue milestones do not increase Buyer Commitment.
3. Confirm current validated funding or decision-process evidence produces Strong.
4. Confirm ROI approval and preference remain Strong, while selection or funding reconfirmation produces Very Strong.
5. Confirm a Stage 6 opportunity with only Moderate evidence shows a commitment blocker and stage gap without automatically changing its stage.

## v6.4.4 evidence freshness smoke test

1. Open old saved Buyer Evidence and confirm freshness follows Evidence Date rather than Last Updated.
2. Edit notes without changing Evidence Date and confirm stale evidence remains stale.
3. Reconfirm with the customer, intentionally update Evidence Date, and confirm the evidence becomes Current.
4. Confirm future and malformed Evidence Dates are rejected.
5. Confirm stale ROI validation lowers maturity to Level 2 and stale executive approval lowers it to Level 3 without changing historical stage snapshots.

## v6.4.3 OTIF maturity smoke test

1. With revenue prospect-verified and OTIF baseline and target blank, confirm OTIF uses the industry-risk fallback and remains seller-supported.
2. Confirm the ROI Maturity explanation identifies the industry-risk fallback and requests a current customer OTIF baseline.
3. Enter a current OTIF baseline below the target, give revenue and the baseline customer provenance, and confirm gap-mode OTIF value becomes customer-supported.
4. Confirm the annual ROI value is unchanged when switching only the maturity provenance state.

## v6.4.2 ROI maturity smoke test

1. Confirm seller-estimated ROI inputs produce Level 1 even when an unrelated Prospect Discovery answer exists.
2. Mark baseline inputs Customer Provided, enter source and date, save, reload, and confirm provenance persists.
3. Confirm Level 2 is awarded only when customer-supported drivers represent at least 50% of annual benefit.
4. Capture customer value-case validation from a mapped stakeholder and confirm Level 3.
5. Confirm an engaged Economic Buyer alone does not create Level 4; capture explicit approval from the mapped Economic Buyer and confirm Level 4.

## v6.4.1 BuyCycle stage-model smoke test

1. Open legacy opportunities saved at Stages 6 and 7 and confirm neither displays as Stage 5.
2. Save Buyer Evidence on a Stage 6 opportunity and confirm it remains Stage 6 after reload.
3. Confirm normal advancement proceeds from Stage 2 through Stage 6 but does not offer Stage 6 → Stage 7.
4. Confirm Close Opportunity records Stage 7 with an explicit Won or Lost outcome.
5. Confirm the retired `/api/stage-readiness/:id/advance` endpoint returns `410 Gone`.

## v6.4.0 Sales Team administration smoke test

1. Create a team with one Primary Sales Leader, four Sales Reps, and two Sales Engineers. Save, reload, and confirm all assignments and counts persist.
2. Confirm multi-role users appear in every eligible picker while retaining one user account and one team-membership relationship.
3. Assign an SE to two teams, remove the SE from one, and confirm the other membership and historical Solution Fit attribution remain.
4. Remove or move a Rep and confirm customer ownership and ROI records remain while team-derived Leader, SE, switcher, dashboard, and Christie access refreshes.
5. Remove an assigned functional role in User Management and confirm the team editor flags the mismatch rather than granting capability through membership.
6. Deactivate a team and confirm direct customer, scenario, Solution Fit, attachment, customer-switcher, dashboard, and Christie access no longer succeeds unless another authorization path applies.

## v6.3.0 customer-workspace smoke test

1. Sign in as a Rep, SE, Sales Leader, and Admin test user. Confirm each sees only customers authorized by the centralized role and team rules.
2. From Calculator, Executive View, Solution Fit, and Deal Coach, select **Switch customer**. Confirm the authorized customer opens in the same functional area rather than returning to the landing screen.
3. Test customer-first search and, for broader-scope roles, Rep, SE, team, BuyCycle stage, Solution Fit, and state filters.
4. Make an unsaved edit and switch customers. Verify **Save & switch**, **Switch without saving**, and **Cancel** all behave as labelled.
5. Confirm the selected customer's current scenario, versions, discovery session, AI context, Christie context, and field inventory are isolated from the previous customer.
6. Remove a test user's customer access, focus the open browser again, and confirm the application blocks the stale customer context.
7. Confirm broader-role users get a read-only customer view unless they also have record edit authority.
8. Repeat the switcher test at a 390-pixel mobile width. Confirm the full-height panel, one-column results, and 44-pixel controls remain usable.

## v6.8.5 stabilization validation

v6.8.5 adds centralized customer ROI report data plus authenticated server-generated Executive PDF and Word outputs, aligns PowerPoint to the same report source, and restores contract-value visualization in Executive View/customer outputs. The release is rebuilt from the live v6.8.4 tree and preserves all production regression locks. Migrations remain 001-034 and the dependency graph is unchanged.

The guarded deployment must pass `npm ci`, the complete cumulative `npm test` suite (including v6.8.5 and production locks), route tests, and the exact canonical Git tree comparison before commit/push.

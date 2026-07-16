/* ═══════════════════════════════════════════════════════════════════
   002_seed_data.sql  —  Default data

   Seeds:
   1. Six How to Use help pages
   2. Initial audit log entry confirming seed was applied

   The initial Admin account is created by src/migrate.js from the
   BOOTSTRAP_ADMIN_* configuration values in render.yaml.

   Uses INSERT ... ON CONFLICT DO NOTHING so re-running is safe.
   ═══════════════════════════════════════════════════════════════════ */

/* ── 1. How to Use help pages ───────────────────────────────────────
   Six pages seeded with initial content.
   Admin can edit content in the UI without a code deploy.
   ────────────────────────────────────────────────────────────────── */
INSERT INTO help_pages (slug, title, content, sort_order) VALUES

('getting-started', 'Getting started', '
<h2>Getting started with the ROI Builder</h2>
<p>Welcome to the Cloud Inventory ROI Business Case Builder. Follow these steps to build your first business case:</p>
<ol>
  <li><strong>Log in</strong> — Use the credentials provided by your Administrator. You will be prompted to set a new password on first login.</li>
  <li><strong>Create a scenario</strong> — Go to the Calculator tab. Enter a <strong>Company name</strong> and <strong>Scenario name</strong> — these are required before you can save.</li>
  <li><strong>Select an industry</strong> — The Industry dropdown auto-populates benchmark assumptions and loads industry-specific discovery questions. Always select an industry first.</li>
  <li><strong>Run discovery</strong> — Switch to the Discovery tab and work through the questions with your prospect. Generate a Prospect Link so the prospect can fill in their own answers securely.</li>
  <li><strong>Enter financial inputs</strong> — Revenue, inventory value, users, IT cost. The more of these confirmed by the prospect, the higher your model confidence score.</li>
  <li><strong>Review the results</strong> — The Results section updates in real time as you enter data. Check the Model Confidence panel — aim for Confirmed (green) on as many inputs as possible.</li>
  <li><strong>Generate the PDF</strong> — Switch to Executive Presentation, select your audience (CFO / COO / CEO / CIO / Mixed), complete the Three Whys, and click Download PDF.</li>
  <li><strong>Save the scenario</strong> — Click Save at any time. Each save creates a new version so you can always return to a previous state.</li>
</ol>
', 1),

('calculator', 'Using the ROI calculator', '
<h2>ROI Calculator</h2>
<p>The calculator is the core of the application. It has five main sections:</p>

<h3>1. Prospect details</h3>
<p>Enter the prospect company name, your name as rep, industry, deal stage, and audience. Industry selection is the most important step — it auto-populates all benchmark assumptions and loads industry-specific discovery questions.</p>

<h3>2. Investment</h3>
<p>Enter the Cloud Inventory investment: one-time costs (professional services, hardware, training) and the annual subscription fee. These are used to calculate payback period, NPV, and Year 1 ROI.</p>

<h3>3. Implementation timeline and ramp-up</h3>
<p>Set the delivery duration in months. Benefits are zero during implementation — ROI starts at go-live. The ramp-up fields (default 40% / 75% / 100%) account for the time it takes users to reach full efficiency after go-live. Year 1 benefit is calculated from these settings, not from the full annual steady-state figure.</p>

<h3>4. Losses and OTIF baselines</h3>
<p>Enter the prospect''s actual write-off dollar amount if known — this is more accurate than deriving it from the shrinkage rate. Enter OTIF baseline and target if the prospect tracks these. Enter current and benchmark inventory turns if relevant.</p>

<h3>5. Improvement benchmarks</h3>
<p>All assumption fields start blank and fall back to the selected industry benchmark at calculation time. The "Avg: X%" label shows you the benchmark. Leave blank to use the industry average; enter a specific figure once the prospect has confirmed it. Entering a value flags it as <strong>Estimated (orange)</strong>. Click the chip in the Model Confidence panel to mark it as <strong>Confirmed (green)</strong> once the prospect has validated it.</p>

<h3>Model confidence score</h3>
<p>The confidence score is a weighted assessment of how many inputs are confirmed vs estimated. A score below 40% triggers a warning before you can download the PDF. Aim for at least 60% before presenting to an executive.</p>
', 2),

('discovery-guide', 'Discovery guide and prospect link', '
<h2>Discovery guide</h2>
<p>The Discovery tab contains industry-specific questions designed to surface the data you need for an accurate ROI model. Questions are tailored to the industry selected in the Calculator.</p>

<h3>How to use discovery questions</h3>
<ul>
  <li>Work through the questions during a discovery call with the prospect.</li>
  <li>Enter answers as the prospect provides them — the rep entry shows in <strong>blue</strong>.</li>
  <li>Numeric answers automatically sync to the matching calculator field.</li>
  <li>Click <strong>Apply all answers to calculator</strong> when done to populate the model.</li>
</ul>

<h3>Prospect link</h3>
<p>The Prospect Link allows your prospect to fill in answers on their own, before or after a call. Their answers show in <strong>green</strong> so you can see what came from them vs what you entered.</p>

<ol>
  <li>Click <strong>Generate prospect link</strong> in the Discovery tab.</li>
  <li>Copy the link and share it with the prospect via email or Teams.</li>
  <li>The prospect sees only the discovery questions — no ROI results, no financial model, no executive content.</li>
  <li>Their answers are saved to the database immediately as they type.</li>
  <li>Return to the Discovery tab to see their responses in real time.</li>
</ol>

<h3>Security</h3>
<ul>
  <li><strong>Rotate link</strong> — generates a new token, immediately invalidating the old link if you need to revoke access.</li>
  <li><strong>Revoke</strong> — permanently disables the link. The prospect sees a "link no longer active" message.</li>
  <li>Prospect links have no expiry by default. The Admin can configure expiry if required.</li>
</ul>
', 3),

('executive-pdf', 'Executive presentation and PDF', '
<h2>Executive presentation</h2>
<p>The Executive tab generates a full business case document ready to present to a prospect''s leadership team.</p>

<h3>Audience selector</h3>
<p>Select the primary audience for this presentation:</p>
<ul>
  <li><strong>Mixed</strong> — Shows all four persona cards (CFO, COO, CEO, CIO/CTO) at equal weight. Use when presenting to a group.</li>
  <li><strong>CFO</strong> — Leads with financial metrics: NPV, ROI, payback period, total cost of ownership.</li>
  <li><strong>COO / VP Operations</strong> — Focuses on efficiency, accuracy, headcount, cycle time.</li>
  <li><strong>CEO</strong> — Strategic framing: growth, competitive differentiation, risk.</li>
  <li><strong>CIO / CTO</strong> — Technology integration, IT displacement, architecture, scalability.</li>
</ul>
<p>When a specific audience is selected, the PDF shows <strong>only that persona''s headline card</strong> — not all four.</p>

<h3>Scenario range</h3>
<p>Toggle between Conservative (70%), Base (100%), and Aggressive (130%) before generating the PDF. This scales all improvement assumptions proportionally — investment costs remain fixed. The scenario range table always shows all three cases for comparison.</p>

<h3>Three Whys</h3>
<p>Complete the three narrative sections before downloading:</p>
<ul>
  <li><strong>Why act at all?</strong> — The cost of the status quo.</li>
  <li><strong>Why Cloud Inventory?</strong> — Why this solution over alternatives.</li>
  <li><strong>Why now?</strong> — The urgency to act in this window.</li>
</ul>
<p>Click <strong>AI Enhance</strong> to generate industry and audience-specific content automatically. You can edit the result before downloading.</p>

<h3>Downloading the PDF</h3>
<p>Click <strong>Download PDF</strong>. This opens a new tab with the full executive document rendered for printing. Use your browser''s Print function (Ctrl+P / Cmd+P) and select "Save as PDF". The document is optimised for US Letter size.</p>
', 4),

('version-control', 'Saving and version history', '
<h2>Scenario version control</h2>
<p>Every time you save a scenario, a new version is created. This lets you track how the business case evolved through the deal cycle and restore any previous state.</p>

<h3>Saving a scenario</h3>
<ol>
  <li>Enter a <strong>Company name</strong> and <strong>Scenario name</strong> — both are required.</li>
  <li>Click <strong>Save</strong> (or the save FAB button at the bottom right of the Calculator).</li>
  <li>If this is the first save, it creates v1 with no dialog.</li>
  <li>On subsequent saves of the same company + scenario name, a dialog appears showing the current version and the new version to be created. Add an optional note (e.g. "Updated SOW cost after procurement review").</li>
</ol>

<h3>Viewing version history</h3>
<p>In the Saved Scenarios tab, scenarios with multiple versions show a <strong>📋 N versions</strong> button. Click it to open the version history modal, which shows:</p>
<ul>
  <li>Version number and date saved</li>
  <li>Annual benefit, ROI, and 5-yr NPV at that point in time</li>
  <li>Version note if one was entered</li>
  <li>Load and Delete buttons per version</li>
</ul>

<h3>Restoring a version</h3>
<p>Click <strong>Load</strong> on any version to restore it in the calculator. You can then save it as a new version if you want to branch from that point.</p>

<h3>Deleting</h3>
<p>Deleting a scenario from the list deletes all versions of that scenario. This action cannot be undone.</p>
', 5),

('admin', 'Admin guide', '
<h2>Admin guide</h2>
<p>Admin users have access to additional functionality not visible to Rep/SE users.</p>

<h3>User management</h3>
<p>Found in the Admin tab → User Management.</p>
<ul>
  <li><strong>Create user</strong> — Enter username, email, and role (Rep/SE or Admin). A temporary password is generated and emailed to the new user. The temporary password is also shown on screen immediately after creation — it is only shown once.</li>
  <li><strong>Edit user</strong> — Update username, email, or role.</li>
  <li><strong>Reset password</strong> — Generates a new temporary password and emails it to the user. Their account is unlocked if it was locked.</li>
  <li><strong>Deactivate / Reactivate</strong> — Deactivated users cannot log in. Their scenarios remain in the database. You cannot deactivate your own account.</li>
</ul>

<h3>Audit log</h3>
<p>Found in the Admin tab → Audit Log.</p>
<p>Shows a filterable, paginated log of all user and system actions. Filter by user, action type, or date range. Export to CSV for compliance reporting.</p>
<p>Audit logs are retained for 2 years. On the 1st of each month, the system checks for records older than 2 years. If any exist, <strong>all Admin users receive an email</strong> with a summary and a confirmation link. The purge only proceeds after an Admin clicks the confirmation link. If no action is taken within 48 hours, nothing is deleted.</p>

<h3>How to Use content</h3>
<p>Admin users can edit this content directly in the browser. Click <strong>Edit</strong> on any page to activate the inline editor. Changes are saved immediately to the database.</p>

<h3>Default Admin account</h3>
<p>Username: <code>admin</code> | Initial password: <code>CloudInventory2026!</code></p>
<p>Log in directly — no forced password change on first login. Change it at your convenience via the Profile page (top-right avatar → My profile → Change password).</p>
', 6)

ON CONFLICT (slug) DO NOTHING;

/* ── 2. Bootstrap audit log entry ───────────────────────────────────
   Records that the initial schema and seed were applied.
   user_id is NULL because no user context exists at migration time.
   ────────────────────────────────────────────────────────────────── */
INSERT INTO audit_log (action, entity_type, detail)
VALUES (
  'system.migration_applied',
  'schema',
  jsonb_build_object(
    'migration', '002_seed_data',
    'note', 'Initial schema and seed data applied',
    'applied_at', NOW()
  )
);

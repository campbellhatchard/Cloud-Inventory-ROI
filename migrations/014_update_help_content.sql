/* ═══════════════════════════════════════════════════════════════════
   014_update_help_content.sql

   Refreshes the "How to Use" guide to reflect current functionality
   (AE/SE roles, Solution Fit & Handoff, the admin Customers landing,
   dictation, customer search, responsive layout) AND removes the
   default admin credentials from the Admin guide.

   Runs once (tracked in schema_migrations). Uses UPDATE so it also
   corrects databases that were seeded by 002 before this change, and
   INSERT ... ON CONFLICT for the new Solution Fit page. It will not
   repeatedly overwrite later admin edits, because it runs a single time.
   ────────────────────────────────────────────────────────────────── */

/* ── Admin guide — credentials removed, role terminology updated ── */
UPDATE help_pages SET content = '
<h2>Admin guide</h2>
<p>Admin users have access to functionality not visible to Account Executive (AE) or Solution Engineer (SE) users, and can view and edit data across the whole team.</p>

<h3>User management</h3>
<p>Found in the Admin tab &rarr; User Management.</p>
<ul>
  <li><strong>Create user</strong> &mdash; Enter username, email, and role: Account Executive (AE), Solution Engineer (SE), or Admin. A temporary password is generated and emailed to the new user, and shown on screen once immediately after creation.</li>
  <li><strong>Edit user</strong> &mdash; Update username, email, or role. You can change an existing user&rsquo;s role at any time (for example, promote an AE to SE).</li>
  <li><strong>Reset password</strong> &mdash; Generates a new temporary password and emails it to the user. Their account is unlocked if it was locked.</li>
  <li><strong>Deactivate / Reactivate</strong> &mdash; Deactivated users cannot log in. Their scenarios remain in the database. You cannot deactivate your own account.</li>
</ul>

<h3>Roles at a glance</h3>
<ul>
  <li><strong>Account Executive (AE)</strong> &mdash; Owns and edits their own scenarios and business cases. On the Solution Fit &amp; Handoff tab, an AE has read + print access.</li>
  <li><strong>Solution Engineer (SE)</strong> &mdash; Completes the Solution Fit &amp; Handoff for any customer (read + write across customers), supporting multiple AEs.</li>
  <li><strong>Admin</strong> &mdash; Full access. Can view and edit any user&rsquo;s scenarios and handoffs. Admin edits made on another user&rsquo;s behalf preserve the original owner and are recorded in the audit log.</li>
</ul>

<h3>Customers landing (Admin)</h3>
<p>Admins get a dedicated <strong>Customers</strong> tab: a searchable view of every customer across the team. Select a customer to see their saved scenarios and open one, or start a new scenario for that customer.</p>

<h3>Audit log</h3>
<p>Found in the Admin tab &rarr; Audit Log. A filterable, paginated log of all user and system actions &mdash; filter by user, action type, or date range, and export to CSV for compliance reporting.</p>
<p>Audit logs are retained for 2 years. On the 1st of each month the system checks for records older than 2 years; if any exist, <strong>all Admin users receive an email</strong> with a summary and a confirmation link. The purge only proceeds after an Admin confirms, and nothing is deleted if no action is taken within 48 hours.</p>

<h3>How to Use content</h3>
<p>Admin users can edit this guide directly in the browser. Click <strong>Edit</strong> on any page to activate the inline editor; changes save immediately.</p>

<h3>Admin account &amp; security</h3>
<p>Admin credentials are provided separately to authorized administrators &mdash; they are intentionally not documented here. Change your password at any time via the Profile page (top-right avatar &rarr; My profile &rarr; Change password), and reset other users&rsquo; passwords from User Management.</p>
' WHERE slug = 'admin';

/* ── Getting started — mention the newer capabilities ── */
UPDATE help_pages SET content = '
<h2>Getting started with the ROI Builder</h2>
<p>Welcome to the Cloud Inventory ROI Business Case Builder. Follow these steps to build your first data-driven business case:</p>
<ol>
  <li><strong>Log in</strong> &mdash; Use the credentials provided by your Administrator. You will be prompted to set a new password on first login.</li>
  <li><strong>Find or start a customer</strong> &mdash; On the Calculator, use <strong>Find an existing customer</strong> to search and open a customer&rsquo;s most recent scenario, or enter a new Company name and Scenario name (both required before you can save).</li>
  <li><strong>Select an industry</strong> &mdash; The Industry dropdown auto-populates benchmark assumptions and loads industry-specific discovery questions. Always select an industry first.</li>
  <li><strong>Run discovery</strong> &mdash; Switch to the Discovery tab and work through the questions with your prospect. Generate a Prospect Link so they can fill in their own answers securely.</li>
  <li><strong>Enter financial inputs</strong> &mdash; Revenue, inventory value, users, IT cost. The more the prospect confirms, the higher your model confidence score. The headline ROI figures activate once a customer is selected and data is entered.</li>
  <li><strong>Review the results</strong> &mdash; Results update in real time. Aim for Confirmed (green) on as many inputs as possible in the Model Confidence panel.</li>
  <li><strong>Generate the PDF</strong> &mdash; In Executive Presentation, choose your audience, complete the Three Whys, and download the PDF. You can also export to PowerPoint, or share a live business-case link.</li>
  <li><strong>Solution Fit &amp; Handoff (SE)</strong> &mdash; A Solution Engineer captures demo fit, gaps, integration drivers, and readiness, then produces internal and customer-facing handoff documents.</li>
  <li><strong>Save the scenario</strong> &mdash; Each save creates a new version, so you can always return to a previous state.</li>
</ol>
<p><strong>Any device</strong> &mdash; the app adapts to phone, tablet, and desktop. Free-text fields also support microphone dictation in supported browsers.</p>
' WHERE slug = 'getting-started';

/* ── New page: Solution Fit & Handoff (SE) ── */
INSERT INTO help_pages (slug, title, content, sort_order) VALUES
('solution-fit', 'Solution Fit &amp; Handoff (SE)', '
<h2>Solution Fit &amp; Handoff</h2>
<p>The Solution Fit &amp; Handoff tab is where a Solution Engineer (SE) captures the technical discovery for a customer and produces a clean handoff to Professional Services. Account Executives have read + print access; SEs and Admins can edit.</p>

<h3>Choosing a customer</h3>
<p>Open the tab with a scenario already loaded (it attaches to that customer), or pick a customer from the selector. Admins can reach it directly from the Customers landing tab.</p>

<h3>The five sections</h3>
<ul>
  <li><strong>Context</strong> &mdash; Solution Engineer, stage, Cloud Inventory products (MEP, CIP, CPP, Platform, or Other), estimated users, business problem and desired outcome, business and technical owners (name, title, and optional email/phone), the system-of-record relationship (including Standalone), and any known SOR customizations with an impact rating.</li>
  <li><strong>Demo &amp; Fit</strong> &mdash; Track each business process: demo status, fit, and notes. Add your own processes with the Add process button.</li>
  <li><strong>Gaps</strong> &mdash; Record gaps and exceptions with classification, priority, acceptance criteria, dependencies, and open questions.</li>
  <li><strong>Integration drivers</strong> &mdash; Capture interfaces and delivery drivers (offline, devices, volumes, custom outputs).</li>
  <li><strong>Readiness</strong> &mdash; An automatic readiness score highlights what is still missing before handoff.</li>
</ul>

<h3>Handoff documents</h3>
<p>From the Readiness tab, generate two branded documents and print or save them as PDF:</p>
<ul>
  <li><strong>Internal handoff</strong> &mdash; Full detail for Services: gaps, ownership, assumptions, and readiness blockers.</li>
  <li><strong>Customer-facing summary</strong> &mdash; Internal scoping language removed; focuses on shared understanding, functionality reviewed, requirements to validate, responsibilities, and items to confirm together. It is explicitly not a Statement of Work.</li>
</ul>
<p>Everything saves to the server automatically as you work.</p>
', 7)
ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, sort_order = EXCLUDED.sort_order;

/* ── Record the update ── */
INSERT INTO audit_log (action, entity_type, detail)
VALUES (
  'system.migration_applied',
  'schema',
  jsonb_build_object(
    'migration', '014_update_help_content',
    'note', 'Refreshed How to Use guide; removed default admin credentials from Admin guide; added Solution Fit page',
    'applied_at', NOW()
  )
);

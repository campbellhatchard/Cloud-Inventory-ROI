const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const src=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Sales Team editor separates leadership, reps and engineers',()=>{
  const ui=src('public/teams-admin.js');
  for(const text of ['Primary Sales Leader','Additional Sales Leaders','Sales Reps','Sales Engineers'])assert.match(ui,new RegExp(text));
  assert.doesNotMatch(ui,/team-member-list/);
  assert.match(ui,/Search current team members/);
});

test('role-aware pickers support additive roles and multi-select without assigning roles',()=>{
  const ui=src('public/teams-admin.js');
  assert.match(ui,/function roles\(u\)/);
  assert.match(ui,/hasRole\(u,fn\)/);
  assert.match(ui,/type=\"\$\{single\?'radio':'checkbox'\}/);
  assert.match(ui,/Roles are managed separately in User Management/);
  assert.match(ui,/This user does not currently have the/);
  assert.doesNotMatch(ui,/api\/users.*PUT/);
});

test('one membership stores the union of functional sections',()=>{
  const route=src('src/routes/sales-teams.js');
  assert.match(route,/function normalizeMembers/);
  assert.match(route,/new Set\(\[\.\.\.prior\.functions/);
  assert.match(route,/ON CONFLICT\(team_id,user_id\)/);
  assert.match(src('migrations/027_sales_teams_permissions.sql'),/UNIQUE\(team_id,user_id\)/);
});

test('server validates active users and matching role membership before save',()=>{
  const route=src('src/routes/sales-teams.js');
  assert.match(route,/validateMembers/);
  assert.match(route,/must first receive the/);
  assert.match(route,/User Management/);
  assert.match(route,/Primary Sales Leader must be an active user with the Sales Leader role/);
  assert.match(route,/eligibility_warnings/);
});

test('inactive and expired teams cannot continue granting centralized record scope',()=>{
  const auth=src('src/authorization.js');
  assert.match(auth,/active_team\.status='active'/);
  assert.match(auth,/owner_m\.effective_start<=CURRENT_DATE/);
  assert.match(auth,/ft\.status='active'/);
  assert.match(auth,/me\.effective_start<=CURRENT_DATE/);
});

test('team cards and live editor show composition and scope counts',()=>{
  const ui=src('public/teams-admin.js'),route=src('src/routes/sales-teams.js');
  for(const token of ['leader_count','rep_count','se_count','customer_count','solution_fit_count']){assert.match(ui,new RegExp(token));assert.match(route,new RegExp(token));}
  assert.match(ui,/teamLiveCounts/);
});

test('removal and deactivation preserve history while warning about access',()=>{
  const ui=src('public/teams-admin.js'),route=src('src/routes/sales-teams.js');
  assert.match(ui,/Prior work, ownership, attachments, Created By attribution, and audit history remain intact/);
  assert.match(route,/CONFIRM_DEACTIVATE/);
  assert.match(route,/sales_team\.deactivated/);
  assert.match(route,/sales_team\.rep_added/);
  assert.match(route,/sales_team\.se_removed/);
  assert.doesNotMatch(route,/DELETE FROM (customers|handoffs|handoff_change_history)/);
});

test('Team SE remains distinct from opportunity-level Primary SE',()=>{
  const ui=src('public/teams-admin.js'),migration=src('migrations/027_sales_teams_permissions.sql');
  assert.match(ui,/Team SE may collaborate/);
  assert.match(ui,/Primary SE remains assigned per opportunity/);
  assert.match(migration,/handoffs ADD COLUMN IF NOT EXISTS primary_se_id/);
  const teamTable=migration.match(/CREATE TABLE IF NOT EXISTS sales_teams \([\s\S]*?\n\);/)?.[0]||'';
  assert.doesNotMatch(teamTable,/primary_se_id/);
});

test('Help explains role, team scope and team-SE boundaries',()=>{
  const help=src('public/help-v6.js'),assistant=src('public/assistant.js');
  assert.match(help,/Administer Sales Teams/);
  assert.match(help,/Roles determine capability\. Team membership determines record scope/);
  assert.match(help,/A Team SE may collaborate/);
  assert.match(help,/Primary SE owns technical responsibility/);
});

test('mobile Sales Team management uses stacked panels and full-screen picker',()=>{
  const css=src('public/teams-admin.css');
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/\.team-picker\{width:100%;height:100%;max-height:none;border-radius:0\}/);
  assert.match(css,/min-height:44px/);
});

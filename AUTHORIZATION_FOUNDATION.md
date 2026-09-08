# Sales Team, Multi-Role, and Solution Fit Authorization Foundation

## Sales Team model

`sales_teams` is the first-class team record. `sales_team_memberships` is a many-to-many relationship with active dates and membership functions. A user may belong to multiple teams. Primary leadership is explicit on the team; additional leaders are team members with the Sales Leader role.

## Role model

The existing `users.roles` array remains the normalized effective role source, with the legacy `role` retained as the primary label for backward compatibility. Authentication exposes `roleKeys`. Permissions are the union of all assigned roles; users never switch personas.

## Permission model

`src/authorization.js` contains the centralized capability matrix and reusable scope services. Roles grant capabilities. Ownership, explicit scenario sharing, team membership, Solution Fit assignment, and global Admin capability grant record scope. Multiple authorization paths are unioned and do not duplicate records.

Reusable services include effective roles/permissions, current teams, authorized reps/customers, customer access, scenario access, Solution Fit access, team SEs, and team leaders. `/api/sales-teams/me` exposes the current user's roles, permissions, and teams for later role-aware UI work.

## Customer authorization

- Rep: owned customers and explicit shares.
- SE: customers owned by reps sharing an active team, for permitted Solution Fit work.
- Sales Leader: customers owned by reps sharing an active managed team.
- Admin: all customers.

Customer fetch, list, scenario fetch, stage-readiness load, manager dashboard, and Solution Fit routes enforce scope on the server. Opening a record never changes ownership.

## Solution Fit authorization

Solution Fit remains customer-linked. `created_by`, `primary_se_id`, and `additional_se_ids` are separate. Created By is historical attribution. Primary/additional SEs represent responsibility. Team access and capabilities control authorization. Same-team SEs can edit; unrelated teams cannot. Leaders receive team read access but no technical edit capability by default. Every changed field is written to `handoff_change_history` with user, old value, new value, and timestamp.

Attachment metadata is customer/handoff linked so download routes can apply the same Solution Fit policy. No unprotected attachment URL was introduced.

## Migration and backward compatibility

Migration 027 is additive. Existing roles, users, customers, scenarios, sharing, and handoffs remain intact. Existing users without teams keep owned/shared access; existing Admins keep global access. Existing Solution Fits retain data and infer only Created By from the prior last editor where available—Primary SE is not silently invented. Team removal changes future derived access without deleting history or responsibility.

Closing an opportunity stores owner, teams, leaders, Primary SE, and contributing SEs in `opportunity_team_snapshot` for historical reporting independent of later team changes.

## Administration

Admin → Sales Teams supports create/edit/activate/deactivate, primary leader, searchable multi-role member selection, reps, leaders, and SEs in one workflow. User management supports additive Rep, SE, Sales Leader, and Admin role selection. Team changes warn that access changes while ownership and history remain.

## Known limitations reserved for Prompt 2

- The complete role-aware customer-switching redesign is intentionally not included.
- The attachment table and authorization foundation are present; binary storage/upload UX remains dependent on the selected storage provider.
- Fine-grained Rep editing of individual Solution Fit fields remains read-only by default.
- Temporary coverage notifications and assignment-review queues are future workflow features.

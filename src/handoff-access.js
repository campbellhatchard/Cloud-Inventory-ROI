/* ═══════════════════════════════════════════════════════════════════
   src/handoff-access.js — access policy for Solution Fit handoffs
   One place that answers: can THIS user READ or WRITE this customer's
   handoff? Keeps the role rules auditable and unit-testable.

   Deprecated compatibility helper. New routes use async solutionFitAccess()
   from authorization.js so team membership is resolved at the data layer.
   ═══════════════════════════════════════════════════════════════════ */

/* canRead(user, customerOwnerId) — may the user view/print this handoff? */
function canRead(user, customerOwnerId, inAuthorizedTeam=false) {
  if (!user) return false;
  const roles = [...new Set([...(user.roleKeys||[]),user.role].filter(Boolean))];
  if (roles.includes('admin')) return true;
  if (customerOwnerId === user.id) return true;
  return inAuthorizedTeam && (roles.includes('se') || roles.includes('sales_manager'));
}

/* canWrite(user, customerOwnerId) — may the user create/update this handoff? */
function canWrite(user, customerOwnerId, inAuthorizedTeam=false) {
  if (!user) return false;
  const roles=[...new Set([...(user.roleKeys||[]),user.role].filter(Boolean))];
  return roles.includes('admin') || (inAuthorizedTeam && roles.includes('se'));
}

/* Whether a user has cross-customer visibility (for list/scoping widening). */
function isCrossCustomer(user) {
  const roles=user?[...(user.roleKeys||[]),user.role]:[];
  return roles.includes('admin');
}

module.exports = { canRead, canWrite, isCrossCustomer };

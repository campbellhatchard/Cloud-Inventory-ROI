/* ═══════════════════════════════════════════════════════════════════
   src/handoff-access.js — access policy for Solution Fit handoffs
   One place that answers: can THIS user READ or WRITE this customer's
   handoff? Keeps the role rules auditable and unit-testable.

   Roles:
     • admin — full read + write on any customer.
     • se    — Solution Engineer: read + write on ANY customer's handoff
               (an SE supports multiple AEs, so they are cross-customer).
     • rep   — AE: read + PRINT only, and only on customers they OWN.
               AEs do not write handoffs (that is the SE's job).
   ═══════════════════════════════════════════════════════════════════ */

/* canRead(user, customerOwnerId) — may the user view/print this handoff? */
function canRead(user, customerOwnerId) {
  if (!user) return false;
  const roles = user.roleKeys || [];
  if (roles.includes('sales_manager')) return true;
  if (user.role === 'admin' || user.role === 'se') return true;   // cross-customer
  if (user.role === 'rep') return customerOwnerId === user.id;     // own customers only
  return false;
}

/* canWrite(user, customerOwnerId) — may the user create/update this handoff? */
function canWrite(user, customerOwnerId) {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'se') return true;   // SE owns handoff content
  /* AE (rep) is intentionally read+print only — no write. */
  return false;
}

/* Whether a user has cross-customer visibility (for list/scoping widening). */
function isCrossCustomer(user) {
  if (!user) return false;
  const roles = user.roleKeys || [];
  return user.role === 'admin' || user.role === 'se' || roles.includes('sales_manager');
}

module.exports = { canRead, canWrite, isCrossCustomer };

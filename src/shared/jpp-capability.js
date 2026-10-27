'use strict';

/* Joint Project Plan mutation authority is intentionally owner-only. Viewing
   and exporting may be broader, but role combinations never imply edit. */
function canEditPlan(user, plan) {
  return Boolean(user?.id && plan?.owner_id && String(user.id) === String(plan.owner_id));
}

module.exports = { canEditPlan };

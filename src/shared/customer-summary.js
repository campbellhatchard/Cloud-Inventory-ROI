'use strict';

/* Customer summaries distinguish an opportunity (stable base_id) from its
   saved scenario versions. scenarioCount remains a compatibility alias for
   opportunityCount so older clients cannot silently revert to version counts. */
function mapCustomerSummaryRow(row = {}) {
  const opportunityCount = Number(row.opportunity_count ?? row.scenario_count) || 0;
  const versionCount = Number(row.version_count) || 0;
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    ownerUsername: row.owner_username || null,
    opportunityCount,
    versionCount,
    scenarioCount: opportunityCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = { mapCustomerSummaryRow };

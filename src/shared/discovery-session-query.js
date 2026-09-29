'use strict';

function discoverySessionScope({ scenarioId, userId } = {}) {
  if (scenarioId) return { predicate: 'ds.scenario_id = $1', values: [scenarioId] };
  return { predicate: 'ds.owner_id = $1', values: [userId] };
}

module.exports = { discoverySessionScope };

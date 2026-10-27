'use strict';

const SolutionFitState = require('../../public/solution-fit-state');
const { readiness } = require('./handoff-readiness');

function normalizeSolutionFitState(input) {
  const data = SolutionFitState.migrateState(JSON.parse(JSON.stringify(input || {})));
  if(data.opportunity){
    if(data.opportunity.solutionEngineer&&!data.opportunity.legacySolutionEngineerDisplay)data.opportunity.legacySolutionEngineerDisplay=data.opportunity.solutionEngineer;
    delete data.opportunity.solutionEngineer;
    delete data.opportunity.solutionEngineerId;
  }
  return SolutionFitState.synchronizeAuthority(data);
}

function projectSolutionFitReadiness(input, { primarySeId = null } = {}) {
  const data = normalizeSolutionFitState(input);
  const result = readiness(data, { primarySeId });
  return Object.freeze({ data, readiness: result.score, status: result.status, missing: result.miss, complete: result.done });
}

module.exports = { normalizeSolutionFitState, projectSolutionFitReadiness };

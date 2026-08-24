/* ═══════════════════════════════════════════════════════════════════
   src/deal-queries.js — fixed query catalog for natural-language
   deal data questions (Admin Analytics "Ask about your deals").

   SECURITY: the AI never generates SQL. It only selects which of these
   pre-written, parameterized queries to run and supplies parameter
   values, which are validated against a strict allow-list before
   execution. This is the same shape as tool-use / function-calling,
   done by hand: the model picks a tool name and arguments, the server
   validates and executes, the model never touches the database layer.
   ═══════════════════════════════════════════════════════════════════ */

const QUERY_CATALOG = {
  win_rate_by_rep: {
    description: 'Win rate (won / (won + lost)) for each rep, with deal counts.',
    params: [],
    sql: `
      SELECT u.username AS rep,
             COUNT(*) FILTER (WHERE s.outcome = 'won')  AS won,
             COUNT(*) FILTER (WHERE s.outcome = 'lost') AS lost,
             COUNT(*) FILTER (WHERE s.outcome IN ('won','lost')) AS decided,
             ROUND(100.0 * COUNT(*) FILTER (WHERE s.outcome = 'won')
               / NULLIF(COUNT(*) FILTER (WHERE s.outcome IN ('won','lost')), 0), 1) AS win_rate_pct
      FROM scenarios s
      JOIN users u ON u.id = s.owner_id
      WHERE s.is_current = TRUE AND s.deleted_at IS NULL
      GROUP BY u.username
      HAVING COUNT(*) FILTER (WHERE s.outcome IN ('won','lost')) > 0
      ORDER BY win_rate_pct DESC NULLS LAST
      LIMIT 50`
  },

  win_rate_by_industry: {
    description: 'Win rate broken down by industry vertical.',
    params: [],
    sql: `
      SELECT s.industry,
             COUNT(*) FILTER (WHERE s.outcome = 'won')  AS won,
             COUNT(*) FILTER (WHERE s.outcome = 'lost') AS lost,
             ROUND(100.0 * COUNT(*) FILTER (WHERE s.outcome = 'won')
               / NULLIF(COUNT(*) FILTER (WHERE s.outcome IN ('won','lost')), 0), 1) AS win_rate_pct
      FROM scenarios s
      WHERE s.is_current = TRUE AND s.deleted_at IS NULL AND s.industry IS NOT NULL
      GROUP BY s.industry
      HAVING COUNT(*) FILTER (WHERE s.outcome IN ('won','lost')) > 0
      ORDER BY win_rate_pct DESC NULLS LAST
      LIMIT 50`
  },

  provenance_vs_outcome: {
    description: 'Correlates the % of discovery answers supplied by the prospect (vs the rep) with deal outcome. Answers whether prospect-verified data correlates with winning.',
    params: [],
    sql: `
      WITH provenance AS (
        SELECT ds.scenario_id,
               COUNT(*) FILTER (WHERE da.entered_by = 'prospect') AS prospect_answers,
               COUNT(*) AS total_answers
        FROM discovery_sessions ds
        JOIN discovery_answers da ON da.session_id = ds.id
        WHERE ds.scenario_id IS NOT NULL
        GROUP BY ds.scenario_id
      )
      SELECT
        CASE
          WHEN p.total_answers = 0 THEN 'no discovery data'
          WHEN (p.prospect_answers::float / p.total_answers) >= 0.5 THEN 'majority prospect-supplied'
          ELSE 'majority rep-supplied'
        END AS provenance_bucket,
        COUNT(*) FILTER (WHERE s.outcome = 'won')  AS won,
        COUNT(*) FILTER (WHERE s.outcome = 'lost') AS lost,
        ROUND(100.0 * COUNT(*) FILTER (WHERE s.outcome = 'won')
          / NULLIF(COUNT(*) FILTER (WHERE s.outcome IN ('won','lost')), 0), 1) AS win_rate_pct
      FROM scenarios s
      LEFT JOIN provenance p ON p.scenario_id = s.id
      WHERE s.is_current = TRUE AND s.deleted_at IS NULL AND s.outcome IN ('won','lost')
      GROUP BY provenance_bucket
      ORDER BY win_rate_pct DESC NULLS LAST`
  },

  resonance_vs_outcome: {
    description: 'Which resonating drivers appear most often in deals that closed won vs stalled/lost.',
    params: [],
    sql: `
      SELECT jsonb_array_elements_text(r.drivers_resonated) AS driver,
             r.meeting_outcome,
             COUNT(*) AS occurrences
      FROM driver_resonance r
      WHERE r.drivers_resonated != '[]' AND r.meeting_outcome IS NOT NULL
      GROUP BY driver, r.meeting_outcome
      ORDER BY occurrences DESC
      LIMIT 50`
  },

  stakeholder_coverage_vs_outcome: {
    description: 'Compares the number of mapped stakeholders in won vs lost deals — tests whether more stakeholder coverage correlates with winning.',
    params: [],
    sql: `
      SELECT s.outcome,
             ROUND(AVG(stake_count.n), 1) AS avg_stakeholders,
             COUNT(DISTINCT s.id) AS deal_count
      FROM scenarios s
      LEFT JOIN (
        SELECT company, COUNT(*) AS n
        FROM stakeholders
        GROUP BY company
      ) stake_count ON stake_count.company = s.company
      WHERE s.is_current = TRUE AND s.deleted_at IS NULL AND s.outcome IN ('won','lost')
      GROUP BY s.outcome
      ORDER BY avg_stakeholders DESC NULLS LAST`
  },

  rep_activity_summary: {
    description: 'Scenario counts, discovery link usage, and average annual benefit per rep.',
    params: [],
    sql: `
      SELECT u.username AS rep,
             COUNT(DISTINCT s.base_id) AS scenario_count,
             ROUND(AVG((s.data->>'annualBenefit')::numeric)) AS avg_annual_benefit
      FROM scenarios s
      JOIN users u ON u.id = s.owner_id
      WHERE s.is_current = TRUE AND s.deleted_at IS NULL
      GROUP BY u.username
      ORDER BY scenario_count DESC
      LIMIT 50`
  },

  deal_stage_breakdown: {
    description: 'Count of open (non-decided) deals by current deal stage.',
    params: [],
    sql: `
      SELECT s.deal_stage, COUNT(*) AS count
      FROM scenarios s
      WHERE s.is_current = TRUE AND s.deleted_at IS NULL
        AND (s.outcome IS NULL OR s.outcome = 'no_decision')
        AND s.deal_stage IS NOT NULL
      GROUP BY s.deal_stage
      ORDER BY count DESC
      LIMIT 20`
  }
};

/* Only these query names are ever executable. The AI's job is to pick
   one (or a small number) of these names — never to write SQL itself. */
const VALID_QUERY_NAMES = Object.keys(QUERY_CATALOG);

function getCatalogDescriptions() {
  return VALID_QUERY_NAMES.map(name => `- ${name}: ${QUERY_CATALOG[name].description}`).join('\n');
}

async function runCatalogQuery(name, query) {
  if (!VALID_QUERY_NAMES.includes(name)) {
    throw new Error('Unknown query name: ' + name);
  }
  const { rows } = await query(QUERY_CATALOG[name].sql);
  return rows;
}

module.exports = { QUERY_CATALOG, VALID_QUERY_NAMES, getCatalogDescriptions, runCatalogQuery };

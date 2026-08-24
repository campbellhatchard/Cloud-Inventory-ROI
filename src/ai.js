/* ═══════════════════════════════════════════════════════════════════
   src/ai.js — internal server-side Anthropic helper

   For AI calls triggered by SYSTEM events (not a logged-in rep clicking
   a button) — e.g. interpreting a prospect's assumption changes before
   emailing the rep, or summarizing resonance data for Admin Analytics.

   This is separate from /api/enhance in server.js, which is the
   rep-facing, auth-gated, rate-limited proxy used by assistant.js,
   narrative.js, map.js, and stakeholders.js. Those stay exactly as
   they are — this file exists for calls that happen with no logged-in
   user in the request (e.g. a prospect's browser hitting a public
   endpoint) or for scheduled/batch summarization.

   Every call here is wrapped in try/catch by its caller and must NEVER
   block a user-facing operation. If ANTHROPIC_API_KEY isn't set, or the
   call fails or times out, callers fall back to showing the raw data
   with no interpretation — never an error the person can see.
   ═══════════════════════════════════════════════════════════════════ */

const https = require('https');

const ANTHROPIC_MODEL    = process.env.ANTHROPIC_MODEL    || 'claude-sonnet-4-6';
const ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';

/* Low-level call — mirrors the proxy logic in server.js /api/enhance
   so behavior (timeout, headers, model selection) stays consistent
   across every AI touchpoint in the app. */
function callAnthropic({ system, messages, max_tokens = 500, timeoutMs = 12000 }) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return reject(new Error('ANTHROPIC_API_KEY not set'));

    let baseUrl;
    try { baseUrl = new URL(ANTHROPIC_BASE_URL); }
    catch (e) { return reject(new Error('Bad ANTHROPIC_BASE_URL')); }

    const payload = { model: ANTHROPIC_MODEL, max_tokens, messages };
    if (typeof system === 'string' && system.trim()) payload.system = system;
    const body = JSON.stringify(payload);

    const req = https.request({
      hostname: baseUrl.hostname, path: '/v1/messages', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    }, (r) => {
      let data = '';
      r.on('data', c => data += c);
      r.on('end', () => {
        if (r.statusCode !== 200) return reject(new Error('Anthropic API status ' + r.statusCode + ': ' + data.slice(0, 200)));
        resolve(data);
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('Anthropic request timeout')); });
    req.write(body);
    req.end();
  });
}

/* Extract plain text from an Anthropic response body */
function extractText(responseBody) {
  const parsed = JSON.parse(responseBody);
  return (parsed.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
}

/* ── Feature 1: interpret a prospect's assumption-slider changes ──
   Input: { company, adjustments: {label: value, ...}, baseValues: {label: value, ...} }
   Output: a single short sentence of sales guidance, or null on any failure. */
async function interpretAssumptionChange({ company, adjustments, baseValues }) {
  try {
    const lines = Object.keys(adjustments).map(k => {
      const base = baseValues && baseValues[k];
      return base ? `${k}: ${base} → ${adjustments[k]}` : `${k}: ${adjustments[k]}`;
    });
    const prompt = `A prospect at ${company || 'a company'} just adjusted assumptions on a shared ROI business case for Cloud Inventory (inventory management SaaS). This tells the sales rep which parts of the pitch they're skeptical of.

Changes made:
${lines.join('\n')}

In ONE sentence (under 25 words), tell the rep what this signals and what to do about it on their next call. Be direct and specific — no preamble, no "it appears that". Example style: "They're skeptical of the labor savings claim — lead with the OTIF driver instead, which they didn't touch."`;

    const resp = await callAnthropic({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 120,
      timeoutMs: 10000
    });
    const text = extractText(resp).trim();
    return text || null;
  } catch (e) {
    console.error('interpretAssumptionChange failed (non-blocking):', e.message);
    return null;
  }
}

/* ── Feature 2: summarize driver resonance patterns for Admin Analytics ──
   Input: array of { industry, meeting_outcome, driver, resonance_count }
   Output: 2-4 sentence plain-English summary, or null on any failure. */
async function summarizeResonancePatterns(rows) {
  try {
    if (!rows || !rows.length) return null;
    const dataStr = rows.slice(0, 100).map(r =>
      `${r.industry || 'unknown industry'} | ${r.driver} | outcome: ${r.meeting_outcome || 'not recorded'} | count: ${r.resonance_count}`
    ).join('\n');

    const prompt = `This is aggregated data from Cloud Inventory sales reps logging which ROI drivers resonated with prospects after sales meetings, across many deals.

Format: industry | driver | meeting outcome | how many times reps logged this driver resonating

Data:
${dataStr}

Write a 2-4 sentence summary a VP of Sales could act on immediately. Call out: (1) which driver resonates most overall, (2) any notable pattern by industry, (3) any pattern connecting a specific driver to deals that progressed or closed, if the data supports it. Be concrete and use the actual numbers. No preamble — start directly with the finding. If the data is too sparse for a pattern, say so honestly rather than inventing one.`;

    const resp = await callAnthropic({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      timeoutMs: 12000
    });
    const text = extractText(resp).trim();
    return text || null;
  } catch (e) {
    console.error('summarizeResonancePatterns failed (non-blocking):', e.message);
    return null;
  }
}

/* ── Feature 3: extract numeric ROI figures from a free-text discovery answer ──
   Context questions ("What operational event exposed this problem?") have no
   sync field and their numbers never reach the ROI model unless the rep
   separately notices and re-enters them elsewhere. This reads one free-text
   answer and suggests which numeric fields it implies, with values, for the
   rep to review and apply — never written automatically.
   Input: { questionText, answerText }
   Output: array of { field, value, reason } or [] on any failure/no findings. */
const VALID_SYNC_FIELDS = [
  'annualWriteOff','costPerError','costPerOrder','countDaysYr','countPeople',
  'currentAccuracy','discRate','downtimeCostPerHr','downtimeEventsYr',
  'downtimeHrsPerEvent','expediteSpendYr','fieldInvValue','fieldLeakageRate',
  'fieldLocations','invTurnsCurrent','inventoryValue','itCost','laborWastePct',
  'orderErrorPct','ordersPerYr','otifBaseline','otifTarget','pickRateGainPct',
  'revenue','userCount'
];

async function extractDiscoveryFigures({ questionText, answerText }) {
  try {
    if (!answerText || answerText.trim().length < 10) return [];
    /* Cheap pre-filter: skip the AI call entirely if there's no digit in the
       text at all — nothing to extract, save the API call. */
    if (!/\d/.test(answerText)) return [];

    const prompt = `A sales rep for Cloud Inventory (inventory management SaaS) typed this free-text answer during a discovery call:

Question: "${questionText}"
Answer: "${answerText}"

Valid ROI model fields you may reference (use these exact names only):
${VALID_SYNC_FIELDS.join(', ')}

Field meanings: annualWriteOff=annual $ inventory write-off, costPerError=$ per order error, costPerOrder=$ per order, countDaysYr=count days per year, countPeople=people per count, currentAccuracy=inventory accuracy %, discRate=hurdle rate %, downtimeCostPerHr=$ cost per downtime hour, downtimeEventsYr=downtime events per year, downtimeHrsPerEvent=hours lost per event, expediteSpendYr=annual $ expedite spend, fieldInvValue=field inventory $ value, fieldLeakageRate=field inventory leakage %, fieldLocations=number of field locations, invTurnsCurrent=current inventory turns/yr, inventoryValue=total inventory $ value, itCost=annual IT system $ cost, laborWastePct=% of labor time wasted, orderErrorPct=order error rate %, ordersPerYr=orders shipped per year, otifBaseline=current OTIF %, otifTarget=target OTIF %, pickRateGainPct=pick rate improvement %, revenue=annual revenue $, userCount=number of inventory users.

If the answer contains a number that clearly maps to one of these fields, extract it. If it doesn't contain any usable number, or the number is ambiguous, return an empty array.

Respond ONLY with a JSON array (no markdown fences, no preamble). Each element: {"field": "one of the exact field names above", "value": number (no currency symbols or commas), "reason": "under 12 words explaining the extraction"}. Maximum 3 suggestions. If nothing extractable, return [].`;

    const resp = await callAnthropic({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      timeoutMs: 10000
    });
    const text = extractText(resp).trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) return [];

    /* Validate every suggestion before returning — never trust the model's
       field names or value types blindly. */
    return parsed
      .filter(s => s && VALID_SYNC_FIELDS.includes(s.field) && typeof s.value === 'number' && isFinite(s.value) && s.value >= 0)
      .slice(0, 3)
      .map(s => ({ field: s.field, value: s.value, reason: String(s.reason || '').slice(0, 80) }));
  } catch (e) {
    console.error('extractDiscoveryFigures failed (non-blocking):', e.message);
    return [];
  }
}

/* ── Feature 4: natural-language question answering over deal data ──
   The model NEVER writes SQL. It picks which pre-written catalog query
   (or queries) answers the question, the server runs them, then the
   model phrases the result in plain English. See src/deal-queries.js
   for the fixed, parameterized query catalog and the security rationale.
   Input: { question, catalogDescriptions }
   Output: { queryNames: string[] } chosen by the first call, phrased
   answer produced by the second call over the actual query results. */
async function pickDealQueries({ question, catalogDescriptions }) {
  try {
    const prompt = `A sales manager asked this question about Cloud Inventory deal data:

"${question}"

Available pre-built queries:
${catalogDescriptions}

Pick the ONE query (or up to two, if the question genuinely needs both) that would answer this question. Respond ONLY with a JSON array of query name strings from the list above, e.g. ["win_rate_by_rep"]. If none of the available queries could answer this question, respond with [].`;

    const resp = await callAnthropic({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      timeoutMs: 8000
    });
    const text = extractText(resp).trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('pickDealQueries failed (non-blocking):', e.message);
    return [];
  }
}

async function phraseQueryResults({ question, results }) {
  try {
    const dataStr = Object.entries(results)
      .map(([name, rows]) => `${name}:\n${JSON.stringify(rows, null, 0)}`)
      .join('\n\n');

    const prompt = `A sales manager asked: "${question}"

Query results:
${dataStr}

Answer their question directly in 2-4 sentences using ONLY the numbers in the data above. Be concrete — cite actual figures. If the data doesn't fully answer the question, say what it does show and note the limitation. No preamble, start directly with the answer.`;

    const resp = await callAnthropic({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 350,
      timeoutMs: 12000
    });
    return extractText(resp).trim() || null;
  } catch (e) {
    console.error('phraseQueryResults failed (non-blocking):', e.message);
    return null;
  }
}

module.exports = {
  callAnthropic,
  extractText,
  interpretAssumptionChange,
  summarizeResonancePatterns,
  extractDiscoveryFigures,
  pickDealQueries,
  phraseQueryResults,
  VALID_SYNC_FIELDS
};

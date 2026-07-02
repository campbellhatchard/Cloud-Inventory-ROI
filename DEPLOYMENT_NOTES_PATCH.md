# Patch Notes — Logo, Model Confidence, AI Enhance, Calculation Audit

## What changed

### 1. Logo handling
Added two logo assets:
- `ci-logo-negative.png` — used on dark backgrounds.
- `ci-logo-full-color.png` — used on light backgrounds.

Updated placement:
- Top navigation: negative logo.
- Executive cover page: negative logo.
- Footer / light-background placements: full-color logo.
- Partner/prospect logo pairing: full-color Cloud Inventory logo.

### 2. Model Confidence behavior
The Model Confidence panel uses a three-state model per field: **empty** (no value, chip disabled), **estimated** (orange — a value is present but not yet confirmed by the prospect), and **confirmed** (green — the rep has clicked to confirm the prospect supplied this figure).

Actual behavior:
- Entering any value auto-flags the chip as **estimated/orange**. This is intentional: a number a rep typed in (or that defaulted from an industry benchmark) is not the same as a number the prospect has actually confirmed, and the confidence score should reflect that distinction rather than treat every keystroke as equivalent to prospect-validated data.
- Clicking an orange chip promotes it to **confirmed/green**. Clicking a green chip reverts it to estimated.
- If a value is removed entirely, the chip returns to **empty** and is disabled again.
- Three of the eight improvement assumption fields (Labor productivity gain, Shrinkage rate, Carrying cost rate) participate in the weighted Model Confidence score — see `CONFIDENCE_FIELDS` in `features.js` for the exact list and weights. None of the 8 fields carry a hardcoded default value anymore: every assumption field starts blank with "Use industry avg until confirmed" placeholder guidance, falls back to the selected industry's benchmark at calculation time, and is flagged as industry-estimated (orange) automatically once an industry is selected.

The "Prospect inputs" group label is unchanged.

### 3. AI Enhance instructions
The app currently uses an Anthropic Claude API proxy through `server.js` and expects this Render environment variable:

```text
ANTHROPIC_API_KEY
```

If your corporate Cloud AI license is an Anthropic/Claude key, add it directly in Render under Environment Variables.

If the license is an OpenAI key, this package will need a separate endpoint change because the current frontend parses Anthropic's response shape: `data.content[0].text`.

### 4. Calculation logic review
Added `CALCULATION_LOGIC_REVIEW.md` with a red-team assessment of double-count and logic risks.

## Render environment variable setup

1. Open Render.
2. Go to the deployed service.
3. Open **Environment**.
4. Add:

```text
Key: ANTHROPIC_API_KEY
Value: <your corporate API key>
```

5. (Optional) Add `ANTHROPIC_MODEL` to override the default `claude-sonnet-4-6`, and `ANTHROPIC_BASE_URL` only if routing through a corporate AI gateway instead of Anthropic's public API directly.
6. Save changes.
7. Redeploy the service.
8. Visit `https://<your-render-service>/api/enhance/health` to confirm configuration without spending an API call.
9. Open the app, go to Executive Presentation, and test **AI Enhance**.

## Validation checklist

- Dark top bar shows the negative logo.
- Executive cover page shows the negative logo.
- Light-background logo placements show the full-color logo.
- All Improvement Assumption fields start blank with placeholder guidance — no hardcoded numbers.
- Entering a value in Model Confidence turns the relevant chip orange/estimated.
- Clicking an orange chip turns it green/confirmed; clicking it again reverts to orange.
- Removing a value clears the chip back to empty/disabled.
- Selecting an industry flags blank assumption fields as estimated (orange) automatically.
- `/api/enhance/health` returns `"status": "ok"` with the correct model and base URL once `ANTHROPIC_API_KEY` is set.
- AI Enhance returns personalized Three Whys content after the environment variable is set.
- The executive PDF shows only the selected audience persona (not all four) when a specific audience is chosen.
- The 3-year and 5-year cash flow totals reflect ramp-adjusted Year 1 benefit, not steady-state × 3 or × 5.

# Cloud Inventory ROI Patch Notes

## Logo behavior

- Light backgrounds use `ci-logo-color.png`.
- Dark executive cover / Business Value Assessment areas use `ci-logo-negative.png`.
- The co-branded prospect logo row now uses the negative Cloud Inventory logo.

## Improvement assumptions

- Removed prepopulated “Your Estimate” values from Improvement Assumptions — all 8 fields now start blank with placeholder guidance, not just some of them.
- Industry averages remain visible as benchmark guidance only ("Avg: X%" label).
- Calculations use industry benchmark fallback when a field is blank (via `metricPct()`), consistently across all 8 fields including the rate fields that previously bypassed this fallback.
- Selecting an industry automatically flags blank assumption fields as estimated/orange in the confidence model.
- Of the improvement assumption fields, three currently participate in the weighted Model Confidence score:
  - Labor productivity gain
  - Shrinkage rate
  - Carrying cost rate

  The remaining assumption fields (shrinkage reduction %, carrying cost reduction %, OTIF improvement %, IT displacement %) do not yet carry a confidence weight — see `CONFIDENCE_FIELDS` in `features.js` if you want to extend scoring to cover them.

## AI Enhance

- Server now owns model selection.
- Added `/api/enhance/health` for safe Render configuration checks.
- Added optional `ANTHROPIC_MODEL` and `ANTHROPIC_BASE_URL` support.
- Improved frontend error detail so the UI shows the actual configuration/API failure instead of a generic failure.

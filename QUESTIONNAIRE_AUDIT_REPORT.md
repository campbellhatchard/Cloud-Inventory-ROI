# Questionnaire Integrity Audit — v6.5.1

Source: actual visible Prospect questionnaire produced by `getProspectQuestions()` and validated against the executable registry for Field Inventory OFF and ON. VE count is the four prospect-facing value-engineering questions. Context includes industry context and conditional field context.

| Industry | OFF questions | ON questions | Financial OFF / ON | VE | Context OFF / ON | Conditional field questions | Duplicate canonical inputs | Conditional suppression | Newly connected / collisions corrected |
|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| Default | 35 | 42 | 23 / 28 | 4 | 4 / 6 | 7 | 0 | none required | contribution margin; duplicate generic questions removed |
| Telecommunications | 37 | 44 | 26 / 31 | 4 | 4 / 6 | 7 | 0 | none required | truck-roll companions; penalties separated from downtime/expedite |
| Manufacturing | 36 | 43 | 24 / 29 | 4 | 4 / 6 | 7 | 0 | none required | service penalties separated; order-error boundary corrected |
| Engineering & Construction | 36 | 42 | 23 / 27 | 4 | 4 / 6 | 6 | 0 | generic `fi1` suppressed; construction `dq3` is authoritative | field locations connected once; per-person hours corrected |
| Oil & Gas | 35 | 42 | 23 / 28 | 4 | 4 / 6 | 7 | 0 | none required | contribution margin; downtime boundary corrected |
| Wholesale Distribution | 36 | 43 | 24 / 29 | 4 | 4 / 6 | 7 | 0 | none required | per-person hours; penalties/expedite/error pools separated |
| Food & Beverage | 36 | 43 | 24 / 29 | 4 | 4 / 6 | 7 | 0 | none required | counting question consolidated; service pools separated |
| Medical Devices / Life Sciences | 36 | 43 | 24 / 29 | 4 | 4 / 6 | 7 | 0 | none required | lost sales uses margin; downtime now internal operating cost only |
| Minerals & Mining | 35 | 42 | 23 / 28 | 4 | 4 / 6 | 7 | 0 | none required | contribution margin; downtime boundary corrected |

## Exact integrity corrections

- Every `countDaysYr` question now asks for formal count/event days and explicitly says **not person-days**.
- Every `hoursPerWeek` conversion asks for average hours per affected employee per week.
- All current-accuracy rationales identify the 99.5% target as a Cloud Inventory v2.8 internal modeling assumption, not an industry benchmark.
- All downtime hourly-cost questions exclude lost sales, penalties/credits, and expedited freight captured separately.
- With Field Inventory ON, central inventory explicitly excludes field stock and central write-offs explicitly exclude field losses.
- Construction displays exactly one `fieldLocations` question.
- Cost per error excludes expedite, penalties, credits, deductions, and lost sales.
- No visible questionnaire under either condition contains two financial questions mapped to the same canonical input.

Automated coverage: all nine industries × two Field Inventory states, every visible financial question, the actual four VE questions, all industry-context questions, conditional wording, conversion semantics, formula availability, and duplicate canonical-input detection.

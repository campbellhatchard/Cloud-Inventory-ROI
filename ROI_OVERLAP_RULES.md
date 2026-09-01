# ROI Overlap Rules — Model v2.8

| Boundary | Economic pool | Counted / winning method | Explicit exclusion and reason |
|---|---|---|---|
| Labor vs throughput | workforce productivity | measured labor-waste method when present; otherwise throughput | alternative is shown but not added; both describe the same workforce capacity |
| Labor vs physical count | workforce activity | generic labor excludes scheduled formal counts; count labor is separate | prevents generic time-recovery from absorbing count days |
| Labor vs field reconciliation | workforce activity | generic labor excludes formal field reconciliation; reconciliation uses locations/frequency/person-hours | distinct activity must be entered once |
| Labor vs repeat truck rolls | workforce / field service | labor method excludes repeat-visit truck-roll cost | truck roll includes visit cost and is counted separately |
| Central write-off vs field leakage | inventory loss | central write-off excludes field losses; field leakage uses field-only stock | mutually exclusive loss pools |
| Central vs field inventory | inventory capital | central input excludes trucks/sites/field stores when field mode is on | $8M central + $2M field, never $10M central + $2M field |
| Carrying vs turns | central carrying | higher of direct carrying and turns carrying estimate | lower overlapping estimate removed |
| Direct lost sales vs modeled OTIF | service revenue | direct lost sales takes precedence | both estimate recovered contribution margin |
| Lost sales vs Retail downtime | service vs operating disruption | lost sales uses margin; downtime uses incremental internal operating/labor cost | downtime wording excludes lost sales |
| Error handling vs penalties | fulfillment vs service consequence | internal rework/return/normal reship and penalties remain separate | cost/error excludes penalties, credits, deductions |
| Error handling vs expedite | fulfillment vs emergency premium | both only when bases are distinct | cost/error excludes expedited freight |
| Downtime vs credits/penalties | risk avoidance vs direct cost | both only when downtime is internal operating cost | downtime excludes credits and penalties |

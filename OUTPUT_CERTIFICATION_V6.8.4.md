# Output Certification — v6.8.4

Release status: locally certified. Render smoke testing remains pending until deployment.

## Release correction certification

- `_reqAuthCompanies` occurrences in `server.js`: **0**.
- Canonical `requireAuth` imports from `src/middleware/auth`: **1**, initialized before protected route use.
- The four affected company, Solution Engineer, customer-list, and customer-detail routes retain authentication with the canonical middleware.
- Public authentication and prospect endpoints were not changed by the correction.
- Role, capability, team-scope, and customer authorization regression tests remain unchanged and pass.
- Release Git history begins at the exact archived v6.8.2 production package, followed by the approved v6.8.3 delta and corrected v6.8.4 delta.

The authoritative machine-readable inventory is `src/shared/output-registry.js`. Every polished output declares its audience, format, source of truth, logo role, readiness requirement, generation mode, and customer-safety classification.

| Output family | Audience | Formats | Authoritative source | Certification |
|---|---|---|---|---|
| Executive Business Case | Customer | Web, PDF, PowerPoint | Executive Value Story | Certified locally |
| Executive Proposal | Customer | Preview, PDF, Word | Saved Proposal + Executive Value Story | Certified locally |
| Joint Project Plan | Customer and Internal variants | PDF, PowerPoint | Saved Joint Project Plan | Certified locally |
| Stakeholder Map | Internal | PDF, PowerPoint | Saved Stakeholder Map | Certified locally |
| Solution Fit | Customer summary/risk; internal handoff | PDF | Saved Solution Fit Handoff | Certified locally |
| Competitive Battlecard | Internal | PDF, Word | Governed Battlecard Revision | Certified locally |
| ROI Methodology | Internal | PDF, PowerPoint | ROI Model v2.8 Registry | Certified locally |
| Discovery Impact Map | Internal | PDF | Questionnaire + ROI Model v2.8 registries | Certified locally |
| Champion Pack | Internal | PowerPoint | Executive Value Story + objection guidance | Certified locally |
| Role One-Pager | Internal | PowerPoint | Executive Value Story | Certified locally |
| Customer Share Page | Customer | HTML | Published customer-safe business case | Certified locally |

Certification rules: customer outputs use the customer confidentiality footer and exclude internal strategy; internal outputs are explicitly labelled; Office exports use valid OOXML MIME/content; browser exports open synchronously where popup blocking is relevant; failed generation retains an actionable retry; active PowerPoint dependencies are local rather than CDN-hosted.

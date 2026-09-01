# Competitive Intelligence Migration Audit — v6.6.3

The legacy `COMP` catalog is retained only as `LEGACY_CURATED_COMPETITIVE_CONTENT` for historical compatibility and migration review. It is not approved corporate intelligence. Historical scenario JSON is never rewritten by this migration.

| Legacy key | Legacy label | New subject type | New company | New product/alternative | Migration status | Attribution status | Approval status | Notes |
|---|---|---|---|---|---|---|---|---|
| `sap` | SAP WM / Extended WH Mgmt | Competitive product | SAP | SAP WM / Extended Warehouse Management | Migrated product | Product family identified | Requires research | Legacy curated content — provenance requires review. |
| `rf` | Legacy RF / Paper-based | Status quo | — | Legacy RF / Paper-based | Migrated status quo | Direct | Not applicable | Alternative, not a vendor product. |
| `oracle` | Oracle WMS | Competitive product | Oracle | Oracle Warehouse Management | Migrated product | Product family identified | Requires research | Legacy curated content — provenance requires review. |
| `excel` | Spreadsheets / Manual | Status quo | — | Spreadsheets / Manual | Migrated status quo | Direct | Not applicable | Available to CIP, MEP, and EPP. |
| `erp` | ERP-Native Module | Status quo | — | ERP-Native Module | Migrated status quo | Direct | Not applicable | Generic alternative; not attributed to an ERP vendor. |
| `mep_lowcode` | Microsoft Power Apps | Competitive product | Microsoft | Microsoft Power Apps | Split into separate product | Direct | Requires research | No Mendix/Appian claims copied to this product. |
| `mep_rfgen` | RFgen / RF-SMART legacy combined record | Ambiguous legacy selection | — | Human must choose RFgen or RF-SMART | Ambiguous legacy combined content | Product attribution required | Not approved | Never auto-mapped to RFgen and never duplicated to both products. Claims remain in `competitive_legacy_claim_review`. |
| `mep_rfsmart` | RF-SMART | Competitive product | RF-SMART | RF-SMART | Migrated product | Direct | Requires research | Separate from RFgen. |
| `mep_mendix` | Mendix | Competitive product | Mendix | Mendix | Migrated product | Direct | Requires research | Separate product record. |
| `mep_appian` | Appian | Competitive product | Appian | Appian | Migrated product | Direct | Requires research | Separate product record. |
| `other` | Other WMS | Category | — | Other WMS | Migrated category | Direct | Not applicable | Used to begin research for an identified WMS product. |

Additional active v6.6.2 persistent products—Deposco, Infios, Fishbowl Inventory, and Cin7—remain separate CIP records. RFgen, RF-SMART, Microsoft Power Apps, Mendix, and Appian remain separate MEP records. EPP is a governed product context and supports new or existing relevant products without inventing default competitors.

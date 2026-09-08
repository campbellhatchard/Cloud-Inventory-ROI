# Release work in this repository
Read BUILD_GOVERNANCE_CONTRACT.md and the latest RELEASE_MANIFEST and RELEASE_READINESS reports before changing code. Start from the exact currently deployed production Git commit/tree verified from `main`; use a validated artifact only when it reproduces that tree exactly. Never substitute a convenient work folder or raw prior ZIP.
Preserve protected authorities, canonical authorization, migrations and existing regression coverage. Every approved change needs a differential audit and truthful test evidence.
Do not declare a release Production Ready or assign a final readiness colour. Product Owner approval is required.
Package only a reviewed, committed Git state. Exclude dependencies, secrets, repository internals and obsolete application trees. Validate a fresh extraction, including generated brand and knowledge assets.

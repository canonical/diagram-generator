# Research: Diagram Review Workspace

## Known reference implementations

### Brand-aligned Mermaid

The mature reference implementation already provides:

- corpus manifest preparation for normal and extended diagram sets;
- bulk FigJam import with managed identities;
- plugin bundle validation;
- comment collection and normalization;
- conversion of ingested comments into specification inputs;
- audits for manifest identity, plugin packaging, and ingested-comment output.

At specification time, the planning project recorded green audits for 222 normal
entries and 584 corpus-inclusive entries, with zero duplicate identities,
duplicate variants, or missing required fields. T001/T002 must replace this
summary with exact paths, commits, commands, and fresh output.

### Diagram generator planning

The planning repository contains a related plugin/corpus adapter and owns the
cross-route workflow, registry proposal, delivery ladder, Jira/Coda mirrors, and
user research. Its adapter-specific behaviour must be mapped to the Mermaid
reference before extraction.

## Decisions to make before product extraction

| Decision | Current direction | Gate |
|---|---|---|
| Permanent home | Neutral `canonical-diagram-review` repo/package set | Record owner and migration plan |
| Initial UI | FigJam plugin | Confirm Figma distribution and auth route |
| Portable storage | Versioned JSON contracts | Approve schemas and migrations |
| Default issue flow | Findings first, explicit adapter routing | Prove idempotency and dedupe |
| First route adapters | Generator and Mermaid | Parity fixtures pass |
| First spec adapter | Spec Kit | Non-destructive deterministic output |
| Registry role | Review summary and staleness projection | Registry contract approved |
| Unknown images | Provisional P3 intake | Cannot weaken stable identity |

## Required source audit

T001 must fill in:

- repository URLs and commit SHAs;
- plugin source and compiled bundle paths;
- manifest preparation and validation scripts;
- comment-readback and spec-generation scripts;
- current plugin-data keys and versions;
- Figma/FigJam API assumptions;
- tests, fixtures, size limits, and known failure cases;
- license and dependencies that affect extraction.

## Rejected approaches

- **Keep two copied plugins**: guarantees drift and incompatible findings.
- **Write comments straight to Jira**: creates issue spam and loses a portable
  audit record.
- **Use board node IDs as diagram identity**: refresh and board duplication
  invalidate them.
- **Recreate every node on refresh**: destroys the low-friction feedback loop.
- **Block on a perfect hosted service**: local manifests and CLI orchestration
  are sufficient for the first reusable release.
- **Put product logic into preview scripts**: violates generator architecture
  and makes the tool route-specific.

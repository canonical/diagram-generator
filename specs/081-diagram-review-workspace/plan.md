# Implementation Plan: Diagram Review Workspace and Feedback Loop

**Branch**: `feat/081-diagram-review-workspace` | **Date**: 2026-07-19  
**Spec**: [`spec.md`](spec.md)

## Summary

Freeze the neutral review-set and review-finding contracts, capture parity
fixtures from the existing Mermaid/FigJam and planning-repo plugins, and extract
their reusable behaviour into a TypeScript package with a FigJam plugin, CLI,
core library, service boundary, and adapters. The generator is the incubation
and specification home; the intended distribution home is a neutral
`canonical-diagram-review` repository/package set.

## Technical Context

**Language/Version**: TypeScript on Node.js 20+  
**Primary Dependencies**: Figma Plugin API, JSON Schema validation, existing
repository test/build tooling; dependency choice finalized after extraction
inventory  
**Storage**: Versioned JSON manifests/findings and Figma plugin data; optional
registry/Jira adapters  
**Testing**: Unit, schema/fixture, plugin bundle, corpus-scale audit, and live
FigJam acceptance evidence  
**Target Platform**: Node CLI plus Figma/FigJam plugin runtime  
**Project Type**: Multi-package tool with a plugin and adapters  
**Performance Goals**: Prepare/import 100+ variants without identity loss;
incremental refresh avoids replacing unchanged managed nodes  
**Constraints**: Preserve comments; idempotent collection; no credentials in
artifacts; no new Python product logic; no product code in `scripts/preview/`  
**Scale/Scope**: First-class support for generator and Mermaid routes, then
registry, Spec Kit, Jira, and unknown-image adapters

## Constitution Check

- [x] Spec branch and package share ID 081.
- [x] Behaviour is contract-first and fixture-backed.
- [x] Existing implementations are inventoried before extraction.
- [x] New product logic is TypeScript/Node.
- [x] Preview legacy surface does not grow.
- [x] Route-specific concerns stay behind adapters.
- [x] Live Figma behaviour has an explicit manual acceptance gate.
- [x] No external write occurs during dry-run/preparation.

## Architecture

```text
folder / corpus / registry query
              |
      prepare adapter(s)
              v
       ReviewSet contract
              |
      FigJam review plugin
       import / refresh
              |
      ordinary comments
              |
       collect + normalize
              v
    ReviewFindings contract
       /       |        \
 Spec Kit    Jira     registry
 adapter    adapter     adapter
```

Proposed neutral package layout:

```text
apps/figjam-review-plugin/
packages/review-contract/
packages/review-core/
packages/review-service/
packages/review-cli/
packages/adapters/generator/
packages/adapters/mermaid/
packages/adapters/spec-kit/
packages/adapters/jira/
packages/adapters/registry/
fixtures/reference/
docs/
```

The plugin owns board mutation and plugin-data association. `review-core` owns
validation, stable identities, refresh planning, normalization, and
idempotency. The CLI owns local preparation/collection orchestration.
Route/target adapters own input discovery and output transformation. No adapter
may redefine the neutral contracts.

## Phases

### Phase 0 - Preserve the proven baseline

Inventory both existing plugins and their scripts, tests, bundle process,
manifest shapes, comment identity rules, and current limitations. Copy only
representative, sanitized fixtures and record source commit SHAs. Run the
existing manifest, plugin-bundle, and ingested-comment audits before refactoring.

### Phase 1 - Freeze contracts and compatibility

Approve the schemas in `contracts/`, publish the data-model rules, define
version negotiation/migration, and add positive/negative fixtures. Add
compatibility readers for existing plugin data without changing live boards.

### Phase 2 - Extract core and CLI

Extract validation, hashing, refresh planning, comment normalization, and
idempotent finding merge into `review-core`. Implement:

```text
diagram-review prepare
diagram-review validate
diagram-review collect
diagram-review route --adapter <name>
```

Commands default to dry-run where they could create or update external state.

### Phase 3 - Extract the FigJam plugin

Move reusable import/refresh/association behaviour behind the neutral contract.
Retain a migration path for existing boards. Prove import and refresh at corpus
scale; record live comment-preservation evidence.

### Phase 4 - Ship adapters

Implement generator and Mermaid preparation adapters first, then Spec Kit. Add
registry and Jira adapters only after guarded create/update semantics and
deduplication keys are tested.

### Phase 5 - Pilot and package

Document maintainer and reviewer workflows. Run one maintainer audit and one
ordinary-user feedback pilot. Decide repository ownership and package names,
then publish or vendor through one canonical source—not copied forks.

## Parallel Work Boundaries

The following lanes can run concurrently after Phase 0 records the reference
commits:

| Lane | Owns | Must not edit |
|---|---|---|
| Contract | schemas, fixtures, migrations | plugin UI and adapters |
| Core/CLI | validation, refresh plan, findings merge, commands | Figma UI |
| Plugin | FigJam UI, board mutation, plugin-data bridge | neutral schemas |
| Adapters | generator/Mermaid/Spec Kit/registry transforms | core identity rules |
| Docs/pilot | install, audit and reviewer guidance, evidence | product logic |

Each lane uses its own worktree and lands behind the approved schema fixtures.
Changes to a neutral schema require all lanes to rebase and update compatibility
tests before merge.

## Risks and Mitigations

- **Comment APIs or node association differ between FigJam contexts**:
  preserve the proven plugin bridge and require live evidence.
- **Extraction accidentally forks two products**: one neutral contract and one
  published source; route repos contain adapters only.
- **Refresh destroys feedback**: compute a dry-run change plan, update managed
  nodes by stable identity, and gate on comment-preservation acceptance.
- **Issue/spec spam**: collect to neutral findings first; external adapters use
  explicit selection and deduplication keys.
- **Private diagram leakage**: manifests reference local/approved artifacts;
  adapters redact secrets and never embed credentials.
- **Neutral repo decision blocks implementation**: contract and fixture work
  can land on this feature branch; extraction starts only after ownership is
  recorded in `research.md`.

## Validation Gates

1. Schema positive/negative and migration fixtures pass.
2. Existing Mermaid manifest/plugin/comment audits remain green.
3. Normalized collection is idempotent.
4. Corpus import/refresh preserves comments and unmanaged board content.
5. Generator and Mermaid adapters emit the same neutral contract version.
6. Spec Kit adapter is deterministic and non-destructive.
7. Registry staleness and artifact-lineage fixtures pass.
8. Plugin bundle contains no token, local absolute path, or unapproved asset.
9. Live maintainer and ordinary-reviewer evidence is recorded before closeout.

## Generated Artifacts

- [`research.md`](research.md)
- [`data-model.md`](data-model.md)
- [`quickstart.md`](quickstart.md)
- [`contracts/review-set.schema.json`](contracts/review-set.schema.json)
- [`contracts/review-findings.schema.json`](contracts/review-findings.schema.json)
- [`tasks.md`](tasks.md)

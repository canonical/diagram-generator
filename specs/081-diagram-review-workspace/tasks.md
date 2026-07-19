# Tasks: Diagram Review Workspace and Feedback Loop

**Input**: [`spec.md`](spec.md), [`plan.md`](plan.md), contracts, and reference
implementations in the Mermaid and planning repositories.

## Phase 1: Baseline and decisions

- [ ] T001 Record the exact source repos, commits, plugin paths, build commands,
  audits, manifest shapes, and comment identity rules in `research.md`.
- [ ] T002 Run and preserve results for the Mermaid manifest, plugin-bundle, and
  ingested-comment audits before extraction.
- [ ] T003 Inventory the planning-repo corpus adapter and map its differences
  from the Mermaid implementation.
- [ ] T004 Decide neutral repository ownership, package names, license, release
  channel, and Figma distribution route; record decisions in `research.md`.
- [ ] T005 Sanitize representative existing manifests, plugin data, and
  findings as reference fixtures with source commit metadata.

## Phase 2: Contracts (parallel lane A)

- [ ] T010 Finalize `review-set.schema.json`, including stable identities,
  variants, artifacts, hashes, source context, and optional lineage.
- [ ] T011 Finalize `review-findings.schema.json`, including comment identity,
  target resolution, disposition, routing links, and reviewed source hash.
- [ ] T012 Add positive, negative, duplicate-identity, legacy-version, and
  unknown-target fixtures.
- [ ] T013 Define schema version negotiation and migrations from both existing
  plugin-data formats.
- [ ] T014 Add a registry review-summary projection fixture covering canonical
  YAML, Figma, SVG, PNG, review URL, finding counts, and staleness.

## Phase 3: Core and CLI (parallel lane B after T010-T013)

- [ ] T020 Extract manifest validation and stable identity generation into
  `review-core`.
- [ ] T021 Implement a deterministic import/refresh change planner that
  distinguishes create, update, unchanged, orphaned, and invalid entries.
- [ ] T022 Extract comment normalization and ambiguous-target retention.
- [ ] T023 Implement idempotent finding merge and guarded routed-reference
  preservation.
- [ ] T024 Implement `prepare`, `validate`, `collect`, and `route` CLI commands
  with dry-run defaults for external mutations.
- [ ] T025 Add unit, fixture, property, and 100+-variant performance tests.

## Phase 4: FigJam plugin (parallel lane C after T010-T013)

- [ ] T030 Extract the reusable plugin UI and board-mutation bridge without
  changing existing live board behaviour.
- [ ] T031 Store/recover neutral review identities through versioned plugin
  data and add legacy readers.
- [ ] T032 Implement pre-mutation change summary and post-run result summary.
- [ ] T033 Implement managed-node refresh that preserves comments, manual
  position, and unmanaged annotations where the contract permits.
- [ ] T034 Add bundle audit, secret/path audit, simulated plugin tests, and a
  migration test for an existing board fixture.
- [ ] T035 Record live FigJam import/refresh/comment-preservation evidence.

## Phase 5: Route and output adapters (parallel lane D after T010-T013)

- [ ] T040 Implement the diagram-generator adapter for folder, canonical YAML,
  SVG/PNG, Figma lineage, and registry metadata.
- [ ] T041 Implement the Mermaid adapter and prove parity with its reference
  corpus manifest.
- [ ] T042 Implement the Spec Kit adapter with deterministic draft updates and
  authored-content protection.
- [ ] T043 Implement the registry projection/update adapter with review
  staleness and artifact lineage.
- [ ] T044 Implement an opt-in Jira adapter with explicit selection,
  deduplication keys, dry-run, and guarded create/update.
- [ ] T045 Add provisional unknown-image intake without assigning false source
  identity.

## Phase 6: Packaging and documentation (parallel lane E)

- [ ] T050 Write maintainer quickstart: install, prepare, import, refresh,
  collect, triage, route, and recover.
- [ ] T051 Write a one-page reviewer guide using ordinary FigJam comments.
- [ ] T052 Document privacy, local-only assets, credentials, board ownership,
  schema compatibility, and rollback.
- [ ] T053 Add package/build/release automation in the chosen neutral home and
  replace route-local copies with adapters.
- [ ] T054 Publish a compatibility matrix for generator, Mermaid, Figma/FigJam,
  Spec Kit, registry, and Jira versions.

## Phase 7: Pilot and closeout

- [ ] T060 Run a visual-system maintainer audit across at least 100 variants.
- [ ] T061 Run an ordinary-user feedback pilot with at least one reviewer who
  has no repository access.
- [ ] T062 Verify all SC-001–SC-008 outcomes and record evidence.
- [ ] T063 Run full neutral package, generator adapter, Mermaid adapter, plugin
  bundle, schema, secret, and diff gates.
- [ ] T064 Obtain adversarial review, remediate findings, update the catalog,
  archive the completed spec, and merge/delete the feature worktree.

## Dependencies and parallel execution

- T001–T005 are the shared baseline. Do not refactor before they complete.
- T010–T013 freeze the contract gate.
- After that gate, lanes B, C, D, and E are intentionally parallel and have
  disjoint file ownership as defined in `plan.md`.
- T035 is a live Figma gate and may run while adapters are implemented.
- T060–T064 require all product lanes; T061 does not require the Jira adapter.

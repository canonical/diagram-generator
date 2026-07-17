# Opus adversarial review request — Spec 028 diagram interchange

**Branch:** `feat/028-diagram-interchange-mermaid-d2` (review against `main`)

Review this complete branch as a skeptical pre-merge maintainer. This is review
only: do not edit product code, tests, fixtures, generated bundles, diagrams,
or the spec package.

Write the review, and only the review, to:

`docs/spec-reviews/opus-adversarial-review-findings-2026-07-17-spec-028.md`

Do not overwrite this request. Start with one verdict: **Merge ready**,
**Merge with follow-ups**, or **Do not merge**. For every finding, include
severity, exact file/symbol evidence, a reproduction or proof path,
user-visible impact, and the smallest safe disposition. State which validation
commands you ran or could not run. Record `No findings` only after examining
both the CLI/API paths and the real preview import/export workflow.

## Scope

Spec 028 adds a deliberately lossy Mermaid/D2 interchange surface:

- typed import/export/serialization under `packages/layout-engine/src/diagram-author/`;
- import/export CLIs under `packages/layout-engine/scripts/`;
- preview HTTP routes and Document-panel import/export UI;
- import-as-new-YAML persistence and navigation behavior.

Frame YAML remains the sole canonical source. Read the branch diff, the spec,
the fidelity matrix, and the post-review remediation history before concluding
that a checked task is evidence of a complete contract.

## Required adversarial checks

1. **Import fidelity and parser boundaries**
   - Challenge the claim that imports handle real hand-authored Mermaid/D2,
     rather than merely this repository's exporter output.
   - Probe frontmatter, class/style syntax, labels, subgraphs/nesting,
     alternate and chained edges, quoted/special-character IDs, malformed
     statements, duplicate IDs, missing endpoints, and D2 attribute blocks.
   - Confirm every unsupported construct is diagnosed without silently
     creating phantom nodes, dropping supported neighbours, or emitting invalid
     YAML. `--strict` must fail for a real diagnostic and not for harmless
     formatting that the documented subset promises to accept.

2. **Canonical YAML and round trips**
   - Trace imported source through AST validation, YAML serialization, disk
     save, reload, layout, and later export. Check IDs, nesting, arrows,
     multiline labels, title/metadata, diagnostics, and arrow-object policy.
   - Confirm the fidelity matrix agrees with implementation and tests. Reject
     a test that proves only exporter → importer symmetry while missing a
     documented real-world input shape.

3. **Preview and API correctness**
   - Audit slug validation/path containment, file type/size/error handling,
     cache invalidation, HTTP status/content types, export filename generation,
     and route ownership.
   - Exercise import of Mermaid and D2 as a *new* diagram, then save/reload and
     navigate. Verify failure cannot overwrite an existing YAML or leave dirty
     state/navigation stranded. Export must not persist overrides or alter dirty
     state.

4. **Architecture and release hygiene**
   - Confirm behavior belongs in TypeScript owners, not widened
     `scripts/preview/*.js`; reject duplicate parser/persistence authority or
     a stale browser-bundle assumption.
   - Inspect the optional D2 compile gate and CLI error handling for false-green
     coverage. Check tests assert product behavior rather than mocks alone.
   - Flag stale claims, review artifacts presented as current findings, or
     unrelated changes that should be split before merge.

## Minimum evidence targets

- `specs/028-diagram-interchange-mermaid-d2/`
- `packages/layout-engine/src/diagram-author/`
- `packages/layout-engine/scripts/import-*.mjs`
- `apps/preview/src/preview-host/`
- `packages/layout-engine/src/preview-shell/app-save-client.ts`
- `apps/preview/src/persistence/interchange-export.test.ts`
- `packages/layout-engine/tests/diagram-author-*.test.ts`

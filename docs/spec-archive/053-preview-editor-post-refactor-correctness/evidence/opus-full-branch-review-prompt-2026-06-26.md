# Opus full-branch review prompt

You are reviewing the entire `feat/053-preview-editor-post-refactor-correctness`
branch in the `diagram-generator` repo.

Review mode:

- Read diffs and current source, not just summaries.
- Findings first, ordered by severity, with file/line references.
- Focus on bugs, architectural regressions, client/server contract drift,
  persistence hazards, relayout/routing correctness, and missing durable tests.
- Keep summary brief after findings.

Repo workflow constraints:

- Read `AGENTS.md` and `docs/agent-index.md` first.
- Treat `scripts/preview/*.js` as legacy compatibility shell, not a valid new
  ownership surface.
- Do not penalize the branch for unrelated dirty local fixture edits unless they
  mask or invalidate real product-path behavior.

Scope to inspect:

1. Preview save/persistence hardening across the branch:
   - `packages/layout-engine/src/preview-shell/app-save-payload.ts`
   - `packages/layout-engine/src/preview-shell/app-save-client.ts`
   - `apps/preview/src/persistence/frame-diagram.ts`
   - `apps/preview/src/persistence/frame-engine-layout-namespaces.ts`
   - `scripts/preview/component-model.js`
2. Preview arrow identity/routing/save path:
   - `packages/layout-engine/src/preview-arrow-component-ids.ts`
   - `packages/layout-engine/src/arrow-routing.ts`
   - `packages/layout-engine/src/preview-shell/app-arrow-render.ts`
   - `packages/layout-engine/src/preview-shell/app-diagram-data.ts`
   - `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts`
   - `apps/preview/src/persistence/frame-diagram.ts`
3. Override manifest / branch-wide contract changes:
   - `packages/layout-engine/src/preview-shell/frame-override-manifest.ts`
   - `packages/layout-engine/src/index.ts`
   - tests added/changed under `packages/layout-engine/tests/` and
     `apps/preview/src/persistence/`
4. Repo guidance / closeout-gate changes:
   - `docs/agent-index.md`
   - `docs/specs.md`
   - `AGENTS.md`
   - `specs/054-preview-persistence-model-typescript/spec.md`

Important branch context:

- The original spec 053 save bug class was “UI change exists, Save fails or
  persists the wrong thing”.
- The branch added typed save normalization, typed arrow component ids, arrow
  override manifest keys, and save round-trip coverage.
- A later follow-up fixed a deeper preview-routing identity bug: preview routing
  had been overwriting authored `Arrow.id` with preview component ids before
  calling the core router, which breaks `arrow:<id>` / `@id` branch-attachment
  routing. The fix separates authored routing ids from preview selection/save
  ids.

Known local-state caveat:

- There are local dirty frame YAML fixtures in the working tree. In particular,
  `scripts/diagrams/frames/example-platform-architecture.yaml` is currently
  dirty and no longer matches the historical `preview-host-contract.test.ts`
  expectation of `elk-layered`. Treat that as local fixture drift unless you can
  prove a product-path branch change caused it.

Please answer:

1. What are the highest-severity remaining defects or regressions on this branch?
2. Is there any remaining client/server mismatch in preview save payloads,
   override ids, or routing identity?
3. Does the new preview-routing identity split have hidden regressions in
   selection, save, arrow refs, or duplicate-edge behavior?
4. Are the new tests sufficient for the durable contracts they claim to protect?
5. What should be fixed before declaring the branch ready for closeout/review?

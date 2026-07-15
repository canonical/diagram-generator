# Adversarial Review: Text-block inline editing

Reviewed against the landed diff for spec 041 on 2026-06-13.

## Findings

| Severity | Area | Finding | Evidence | Recommended fix |
|----------|------|---------|----------|-----------------|
| P2 | Architecture | Preview-only text-block metadata now ships through the generic SVG renderer, so exported SVG artifacts carry editor-facing `data-dg-text-*` attributes. This is acceptable for now but couples preview interaction concerns to batch/export output. | `packages/layout-engine/src/svg-render.ts:111`, `packages/layout-engine/src/svg-render.ts:129`, updated goldens under `packages/layout-engine/tests/fixtures/svg/` | Add a render option such as `includeEditorMetadata` and enable it only for preview-facing renders. Keep export SVG output clean if downstream consumers should not see editor metadata. |
| P2 | Test coverage | The critical interaction changes live in `scripts/preview/editor.js`, but automated preview tests still cover persistence only. The current suite proves the render contract and persistence path, not actual double-click targeting or dark-surface edit legibility. | `apps/preview/package.json`, `scripts/preview/editor.js:3252`, `scripts/preview/editor.js:4448`, `scripts/preview/editor.js:4547` | Extract block-target resolution and text-override merge into a testable module or add a lightweight DOM test harness for preview-shell text editing. |

## What I Tried To Break

- synthetic `__heading` ownership leaking into preview editing
- heading/body edits overwriting the non-clicked semantic field
- highlight-theme editing losing contrast
- renderer and browser relayout drifting on block-role identity
- golden SVG regressions after adding text-block metadata

## Result

No P0/P1 issues remain in the landed implementation.

The main remaining risks are:

1. editor metadata is now part of the generic SVG surface
2. preview interaction behavior still depends on manual browser verification more than automated DOM tests


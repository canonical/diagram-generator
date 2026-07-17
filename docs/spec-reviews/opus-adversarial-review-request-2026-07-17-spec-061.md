# Opus adversarial review request — Spec 061 preview grid regression

**Branch:** `feat/061-preview-grid-regression` (review against `main`)

Review this complete branch as a skeptical pre-merge maintainer. This is review
only: do not edit product code, tests, fixtures, generated bundles, diagrams,
or the spec package.

Write the review, and only the review, to:

`docs/spec-reviews/opus-adversarial-review-findings-2026-07-17-spec-061.md`

Do not overwrite this request. Start with one verdict: **Merge ready**,
**Merge with follow-ups**, or **Do not merge**. For every finding, include
severity, exact file/symbol evidence, a reproduction or proof path,
user-visible impact, and the smallest safe disposition. State which validation
commands you ran or could not run. Record `No findings` only after exercising
both a V3 grid-capable document and an ELK non-grid document in the live preview.

## Scope

Spec 061 investigates and contains a preview regression in which grid and
9-dot alignment controls appeared on engines without a grid model and could
dispatch a failing relayout. The intended boundary is a single typed capability
predicate: V3 grid affordances remain usable; ELK/Force/Sequence/Dagre do not
receive them. The branch also records a root-cause classification in
`specs/061-preview-grid-regression/findings.md`.

Read the branch diff, the spec, its finding, and the active preview-shell
contracts. Do not accept a green unit test or a hidden DOM element as proof
that a stale interaction or engine-switch path cannot still schedule relayout.

## Required adversarial checks

1. **Capability authority and engine transitions**
   - Trace the capability from preview-engine manifest through UI-context,
     inspector, grid host, and render/runtime wiring. Confirm there is one
     typed authority rather than parallel predicates or legacy JavaScript
     exceptions.
   - Exercise initial load, V3 → ELK → V3 switching, persisted authored ELK,
     engine selection during a pending repaint, and stale direct callbacks.
     The non-grid path must not expose the grid section or 9-dot widget in DOM
     or tab order, and must not create an override or relayout request.

2. **V3 regression protection**
   - Verify grid-capable V3 still exposes functional grid controls and guide
     overlay behavior, including a guide-mode change and a control update.
   - Trace `resolvePreviewGridInfo`, overlay mounting/replacement, and canvas
     geometry. Challenge the finding's claim that the prior “lost grid” report
     is an intentional support boundary rather than an unfixed V3 defect.

3. **Inspector, persistence, and error containment**
   - Verify hiding is not merely cosmetic: keyboard focus, inspector actions,
     stale event handlers, undo/redo, save/reload, and direct host calls must
     not re-enter a non-grid relayout path.
   - Confirm grid state/overrides cannot leak between V3 and ELK buckets and
     that the corrective path has not widened `scripts/preview/editor.js` or
     `scripts/preview/layout-bridge.js`.

4. **Test and review integrity**
   - Check browser/contract tests prove user-visible capability behavior rather
     than only mocked wiring. Scrutinize the shared ELK option-default test
     normalization: it may ignore only the two specified blank numeric UI
     defaults and must continue to detect meaningful blank enum loss.
   - Flag stale test counts, unsupported root-cause claims, or missing
     save→reload coverage. Report whether the documented closeout criteria are
     actually met.

## Minimum evidence targets

- `specs/061-preview-grid-regression/`
- `packages/layout-engine/src/preview-shell/preview-ui-context.ts`
- `packages/layout-engine/src/preview-shell/app-grid-editor-install-unit.ts`
- `packages/layout-engine/src/preview-shell/app-grid-host.ts`
- `packages/layout-engine/src/preview-shell/grid-*.ts`
- `packages/layout-engine/tests/preview-ui-context.test.ts`
- `apps/preview/src/persistence/editor-live-repaint-regression.test.ts`

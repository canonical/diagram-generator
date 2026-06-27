# Spec 054: Preview Persistence Model TypeScript Migration

**Feature Branch**: `feat/054-preview-persistence-model-typescript`  
**Status**: Closeout Ready — typed payload ownership, contract-linked keys, round-trip save coverage, and closeout validation are all landed on this branch.  
**Created**: 2026-06-27  
**Owner doc**: this file + `tasks.md`

## 1. Problem

Spec 053 closed the immediate save failures by adding typed guard rails around
preview save payload normalization and arrow/frame persistence. That fixed the
symptoms, but not the structural source of the bug class.

Today the save payload is still born in untyped legacy JS:

- `scripts/preview/component-model.js::toOverridePayload()` assembles the
  persisted override payload;
- frame overrides still originate as transient `dx/dy/dw/dh` deltas;
- arrow, grid, removal, and engine-layout state are emitted from a loose,
  JS-owned object bag;
- TypeScript validation and rejection happen later in
  `packages/layout-engine/src/preview-shell/app-save-payload.ts` and
  `apps/preview/src/persistence/frame-diagram.ts`.

That split is the recurring failure mode behind the 053 save bugs:

- UI state mutates successfully;
- the save payload diverges from the server contract;
- the mismatch is discovered only at save time or reload time.

As long as payload assembly remains JS-owned and untyped, every new
override-bearing editor feature is save-unsafe by default.

## 2. Goal

Move preview override state and save-payload assembly into a typed owner so the
model emits already-canonical, contract-aligned overrides before POST.

At the end of this spec:

1. preview override state is owned by TypeScript, not `component-model.js`;
2. emitted save payloads are canonical and type-linked to the persistence
   allowlists;
3. save round-trip coverage is part of the closeout gate for save-path work;
4. legacy JS becomes a thin delegation layer instead of a persistence owner.

## 3. Non-Goals

- No redesign of the editor UI or interaction model.
- No schema redesign for frame YAML beyond existing canonical fields.
- No engine-layout feature expansion beyond preserving current save behavior.
- No new behavior-heavy ownership in `scripts/preview/*.js`.
- No reopening of `force.js` layout internals.

## 4. Reference Files

| Area | Files |
|---|---|
| Current JS payload owner | `scripts/preview/component-model.js` |
| Typed save guard | `packages/layout-engine/src/preview-shell/app-save-payload.ts` |
| Save client | `packages/layout-engine/src/preview-shell/app-save-client.ts` |
| Canonical allowlists | `packages/layout-engine/src/preview-shell/frame-override-manifest.ts` |
| Arrow identity | `packages/layout-engine/src/preview-arrow-component-ids.ts` |
| YAML persistence | `apps/preview/src/persistence/frame-diagram.ts` |
| Namespace persistence | `apps/preview/src/persistence/frame-engine-layout-namespaces.ts` |
| Existing save flow map | `docs/spec-archive/053-preview-editor-post-refactor-correctness/preview-editor-post-refactor-flow.md` |
| Agent guidance to fix | `docs/agent-index.md`, `AGENTS.md`, `docs/specs.md` |

## 5. Requirements

- **FR-001**: A typed preview override owner in
  `packages/layout-engine/src/preview-shell/` must own override state and save
  payload assembly instead of `scripts/preview/component-model.js`.
- **FR-002**: Frame save payloads emitted by that owner must never contain
  `UNSUPPORTED_PERSIST_FRAME_KEYS` (`dx`, `dy`, `dw`, `dh`, transient
  waypoint-only keys, etc.).
- **FR-003**: Frame, arrow, grid, removal, and engine-layout payload shapes must
  share TypeScript-owned key allowlists with the persistence owners instead of
  re-declaring contracts in JS.
- **FR-004**: `app-save-payload.ts` must become a guard/assertion layer over an
  already-canonical payload, not the primary behavioral converter of frame
  deltas.
- **FR-005**: `scripts/preview/component-model.js` must retain only thin
  browser-shell compatibility delegation for persistence-related behavior.
- **FR-006**: Existing saved YAML semantics must remain stable for current
  fixtures and workflows, including duplicate arrows, `arrow:<id>` branch
  attachments, headed containers, Dagre/ELK engine controls, and removals.
- **FR-007**: Save-path closeout for future specs touching preview persistence
  must require repo-owned save round-trip coverage, not aspirational
  "Closeout Ready" status.

## 6. Success Criteria

- **SC-001**: A typed preview override model exists and is the owner used by the
  preview save path instead of JS-local payload assembly.
- **SC-002**: The emitted payload for drag, resize, keyboard nudge, multi-select
  movement, arrow waypoint edits, and removals is already canonical before it
  reaches the save normalizer.
- **SC-003**: Round-trip coverage exists for at least these save workflows:
  frame drag, frame resize, keyboard nudge, multi-select drag, duplicate-edge
  arrow waypoint save, explicit-id arrow waypoint save, and node removal.
- **SC-004**: `docs/agent-index.md` correctly marks
  `scripts/preview/component-model.js` as a persistence-critical trap file and
  reinforces excluding generated `dist/**` artifacts from broad searches.
- **SC-005**: `docs/specs.md` and/or `AGENTS.md` make a save round-trip gate
  explicit for specs that touch the preview override/save path.
- **SC-006**: Closeout validation passes:
  `npm --prefix packages/layout-engine test`; `npm --prefix apps/preview test`;
  `npm --prefix packages/layout-engine run build:browser`;
  `node scripts/check-browser-bundle-fresh.mjs`;
  `node scripts/check_no_new_python.mjs`.

## 7. Notes

- This spec is a follow-up architecture package, not a continuation of spec 053.
- The branch split is deliberate: spec 053 is merged and archived on `main`;
  this package owns the wider persistence-model migration that should not have
  been folded into the correctness triage branch.
- Keep fixture diffs minimal and treat authored frame YAML as source of truth.

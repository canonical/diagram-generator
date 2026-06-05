# Agent Inbox

Machine-generated handoffs, long diagnostics, and cross-repo follow-up notes go here.

Do not use this file for user notes. User-authored async notes belong in `INBOX.md`.

The agent should triage anything durable from this file into `TODO.md`, `STATUS.md`, `HISTORY.md`, or `docs/specs.md`, then empty this file back to this header template.

## 2026-06-05 handoff — close spec 023, then start spec 022

Use a fresh chat for token efficiency.

Current repo state:

- Focused force/spec-bookkeeping commit already landed on `main`: `984b5ef` (`force: land TS force follow-up and spec cleanup`).
- Preview server is running on `http://127.0.0.1:8210` because another worktree is occupying port `8200`.
- Live preview terminal id for the 8210 server: `4e657df6-3147-4d9d-9fe0-18b65855d87e`.
- Do not use `8200` for this worktree.

What is already done for spec 023:

- TS force runtime restored.
- Three canonical force demos restored.
- Shared force style vocabulary fixed (`parent`, `section`, `annotation`, `highlight`; `accent` kept only as legacy alias to `parent`).
- Local save persistence landed: force Save writes current `simulation` / `render` defaults and node state back to the canonical force YAML.
- Juju force live interaction bug fixed by pausing the running solver at the start of stage/tree/inspector interaction so Selection controls stop rebuilding under the click.
- `TODO.md`, `STATUS.md`, `HISTORY.md`, and `docs/specs.md` were trimmed/reconciled so only active specs remain open.

Spec status snapshot from task counts:

- Complete task bundles: `001`, `002`, `003`, `004`, `005`, `007`, `008`, `009`, `010`, `011`, `012`, `013`, `014`, `015`, `016`, `017`, `019`.
- Delivered but spec-only (no tasks file): `020`, `021`.
- Remaining open bundles: `023` (`18` checked / `3` unchecked), `018` (`0` / `19`), `022` (`0` / `37`), `006` (`0` / `25`).

Next required work order:

1. Finish spec `023-force-layout-restoration`.
2. Then begin spec `022-diagram-authoring-ast`.

Remaining unchecked tasks in spec 023:

- `T013` Remove or rewrite orphaned `scripts/benchmark_force.py` usage against the TS runtime.
- `T032` Add focused automated tests for force example discovery and route availability.
- `T033` Add focused automated tests for save/reset/export behavior.

Relevant files for spec 023 closeout:

- `specs/023-force-layout-restoration/tasks.md`
- `packages/layout-engine/src/force-runtime.ts`
- `packages/layout-engine/tests/force-runtime.test.ts`
- `scripts/preview/force.js`
- `scripts/preview_server.py`
- `scripts/benchmark_force.py`

Known unrelated dirty files still in the worktree — do not mix them into the spec 023 closeout commit unless the user explicitly asks:

- `packages/graph-layout-core/src/graph-ir.ts`
- `packages/graph-layout-core/src/index.ts`
- `packages/graph-layout-elk/src/elk-graph-builder.ts`
- `packages/graph-layout-elk/src/elk-layered.ts`
- `packages/graph-layout-elk/src/elk-param-registry.ts`
- `packages/graph-layout-elk/src/layered-options.ts`
- `packages/graph-layout-elk/src/result-normalizer.ts`
- `packages/graph-layout-elk/tests/elk-layered.test.ts`
- `packages/layout-engine/src/elk-layout.ts`
- `packages/layout-engine/src/frame-model.ts`
- `packages/layout-engine/src/svg-render.ts`
- `scripts/diagrams/frames/juju-bootstrap-machines-process.yaml`
- `scripts/frame_yaml_persistence.py`
- `scripts/preview/editor.js`
- `scripts/preview/elk-layout-controls.js`
- `scripts/preview/layout-bridge.js`
- `scripts/preview/viewer-unified.html`
- `scripts/test_frame_yaml_persistence.py`
- `scripts/preview/elk_sidebar_html.py`

After spec 023 is fully closed, start spec 022 from scratch using the existing spec package:

- `specs/022-diagram-authoring-ast/spec.md`
- `specs/022-diagram-authoring-ast/tasks.md`

Spec 022 is still untouched (`0` checked / `37` unchecked). Treat it as a fresh TypeScript-first compiler/export pipeline slice, not a continuation of the force work.

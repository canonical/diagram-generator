# Agent inbox

Machine-generated handoffs and diagnostics go here.

Durable follow-up belongs in `specs/<id>-<slug>/`,
[`AGENTS.md`](AGENTS.md#handover), or [`docs/specs.md`](docs/specs.md).
`TODO.md` is only a pointer to open spec packages.

---

## 2026-06-26 - Spec 053 preview editor correctness implemented

Active branch: `feat/053-preview-editor-post-refactor-correctness`.

Implemented and ready to continue from another machine:

- `single-align`, `direction`, sizing, wrapping, and justification inspector
  mutations now request immediate typed relayout, fixing stale visual state after
  alignment and v3 horizontal/vertical changes.
- The engine switcher now falls back from `layout_engine` to `engine` and the
  typed preview UI policy shows a disabled populated engine field even for
  single-compatible v3 frame diagrams.
- ELK layout controls no longer fall back to `elk-layered` defaults when an
  explicit active engine cannot be resolved for that sidebar section.
- Preview-host compatibility coverage now proves no-arrow frame documents expose
  only `v3` and reject incompatible graph engines with the registry reason.
- Stale fixture expectations for `request-to-hardware-stack` now reflect its
  authored `v3` engine, and frame YAML newline expectations are normalized.

Validation completed on this branch:

- `npm --prefix packages/layout-engine test`
- `npm --prefix apps/preview test`
- `npm --prefix packages/layout-engine run build`
- `npm --prefix packages/layout-engine run build:browser`
- `node scripts/check-browser-bundle-fresh.mjs`
- `node scripts/check_no_new_python.mjs`
- Local text probe against `http://127.0.0.1:8123/view/test-alignment-grid` and
  `http://127.0.0.1:8123/view/tiered-network-architecture.author-v1`

Caveats:

- The VS Code integrated-browser connector was requested but unavailable to the
  agent runtime (`iab` backend missing), so final browser verification used the
  local preview server and text/DOM-style probes instead of screenshots.
- Two pre-existing local fixture edits remain intentionally uncommitted and are
  not part of the pushed handover unless a future agent explicitly decides they
  are product changes: `scripts/diagrams/frames/test-alignment-grid.yaml` and
  `scripts/diagrams/frames/tiered-network-architecture.author-v1.yaml`.

---

## 2026-06-26 - Spec 052 live engine-switch regressions resolved

The 2026-06-25 deeper review item is complete. Phase 6 in
`specs/052-layout-engine-onboarding-port/tasks.md` now records the fixes and
verification:

- explicit incompatible engine choices no longer silently degrade to v3;
- `elk-layered` is compatible with compound/container-endpoint frame fixtures;
- authored ELK -> v3 save/reload persists for `juju-bootstrap-machines-process`;
- `service-handshake-sequence` resolves/renders through the sequence engine and
  sizes notes/participants from text;
- full layout-engine and preview-app suites, no-new-Python, browser-bundle
  freshness, and a no-screenshot live probe are green.

No open agent-inbox items remain. Spec 051 right-aside UI cleanup remains
separately tracked in `docs/specs.md`.

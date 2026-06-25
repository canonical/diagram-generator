# Agent inbox

Machine-generated handoffs and diagnostics go here.

Durable follow-up belongs in `specs/<id>-<slug>/`,
[`AGENTS.md`](AGENTS.md#handover), or [`docs/specs.md`](docs/specs.md).
`TODO.md` is only a pointer to open spec packages.

---

## 2026-06-25 - Opus adversarial review request: spec 051 contextual aside follow-up

Branch: `feat/051-preview-editor-contextual-aside`

Please run an adversarial review of the spec 051 contextual-aside implementation
and the new Phase 7 follow-up tasks before the next patch.

User-reported live issues:

- ELK controls are still visible when the selected/active engine is not ELK.
  Review the active-engine source of truth, server template section gating,
  runtime DOM state, engine-switch reload behavior, browser bundle freshness,
  and focusability of nested ELK controls.
- Single-selection inspector shows redundant identity chrome:
  duplicate `Selection`, selected id like `global_server`, and type text like
  `Frame`. User wants these removed.
- `weight` appears to be a no-op (`1` to `2` has no visible effect). Review
  whether it is a real layout control and, if not, recommend removal.
- Appearance/style controls should not expose user-tamperable stroke/style
  internals. Box variants own styling. `as defined` should be replaced with a
  concrete effective variant label such as `child`, `parent`, `section`,
  `highlight`, or `annotation`.
- Layout grid controls should appear only when the top-level page/root is
  selected, not for arbitrary v3 selections.
- Constraint diagnostics can show counts like `31 warnings` without explaining
  what they mean or where details live.

Review targets:

- `specs/051-preview-editor-contextual-aside/spec.md`
- `specs/051-preview-editor-contextual-aside/tasks.md`
- `packages/layout-engine/src/preview-shell/preview-ui-context.ts`
- `packages/layout-engine/src/preview-shell/inspector-*-panel.ts`
- `packages/layout-engine/src/preview-shell/app-shell-panels.ts`
- `packages/layout-engine/src/preview-shell/app-grid-editor-runtime.ts`
- `apps/preview/src/preview-host/builtin-autolayout-host.ts`
- `scripts/preview/viewer-unified.html`

Requested output:

- Findings ordered by severity, with repro notes where possible.
- Whether Phase 7 tasks are sufficient or missing cases.
- Recommended implementation order and minimal test set.
- Any places where the current tests can pass while the live UI still leaks
  controls.

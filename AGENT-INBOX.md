# Agent inbox

Machine-generated handoffs and diagnostics go here.

- **Human notes:** [`INBOX.md`](INBOX.md) — author → agent; triage into specs, then clear when done.
- **Durable follow-up:** `specs/<id>-<slug>/`, [`AGENTS.md`](AGENTS.md#handover), [`docs/specs.md`](docs/specs.md).
- **INBOX row map:** [`docs/spec-reviews/inbox-triage.md`](docs/spec-reviews/inbox-triage.md).

`TODO.md` is only a pointer to open spec packages.

---

## Resolved current handover — 2026-07-01

### Resolved Repo / branch state

- **Current branch:** `feat/068-internal-dual-path-deletion`
- **Uncommitted user change:** [`scripts/diagrams/frames/example-deployment-pipeline.yaml`](scripts/diagrams/frames/example-deployment-pipeline.yaml)
- Do **not** touch that YAML unless the next task explicitly asks for it.

### Resolved What was completed

- **Spec 066** was merged to `main`, then archived under:
  - `docs/spec-archive/066-graph-engine-layout-option-surfacing/`
  - `docs/spec-archive/067-layout-engine-parameter-pane/`
- **Spec 068** was drafted on `main`, then work started on
  `feat/068-internal-dual-path-deletion`.

### Resolved 068 status

Spec files:

- [`specs/068-internal-dual-path-deletion/spec.md`](specs/068-internal-dual-path-deletion/spec.md)
- [`specs/068-internal-dual-path-deletion/tasks.md`](specs/068-internal-dual-path-deletion/tasks.md)
- [`specs/068-internal-dual-path-deletion/deletion-inventory.md`](specs/068-internal-dual-path-deletion/deletion-inventory.md)
- [`specs/068-internal-dual-path-deletion/search-evidence.md`](specs/068-internal-dual-path-deletion/search-evidence.md)
- [`specs/068-internal-dual-path-deletion/fixture-engine-option-isolation-plan.md`](specs/068-internal-dual-path-deletion/fixture-engine-option-isolation-plan.md)
- [`docs/spec-reviews/branch-068.md`](docs/spec-reviews/branch-068.md)
- New draft follow-up: [`specs/069-editor-mutation-state-determinism/spec.md`](specs/069-editor-mutation-state-determinism/spec.md)
- New flow map: [`specs/069-editor-mutation-state-determinism/editor-mutation-state-flow.md`](specs/069-editor-mutation-state-determinism/editor-mutation-state-flow.md)

Completed tasks:

- `T001`-`T003` deletion inventory and canonical naming decisions recorded
- `T010`-`T013` browser runtime aliases deleted and focused contract tests rerun
- `T020`-`T022` persistence/route aliases and affected tests migrated
- `T030`-`T032` public export aliases/docs/evidence updated
- `T040`, `T042`, `T043`, `T044` validation gates pass
- adversarial review finding on generic-pane ELK-root param fallback fixed in
  `layout-params-controls.ts`

Validation note:

- `T041` initially failed because the dirty
  [`scripts/diagrams/frames/example-deployment-pipeline.yaml`](scripts/diagrams/frames/example-deployment-pipeline.yaml)
  fixture adds radial ELK keys consumed by `tests/elk-layout.test.ts`.
  The fix direction is to keep that YAML intact and isolate the layered
  regression test from radial/Dagre control state. That test isolation is now
  implemented and full `npm --prefix packages/layout-engine test` passes.

### Resolved Commits on this branch

- `ef16bfe` — `Start deleting internal dual paths`
- `c2c918f` — `Delete ELK relayout fallback from layout params runtime`

### Resolved Validations already run and passing

- `npm --prefix packages/layout-engine run build:browser`
- `npm --prefix packages/layout-engine exec tsc -- --noEmit -p packages/layout-engine/tsconfig.json`
- `npm --prefix apps/preview exec tsc -- --noEmit -p apps/preview/tsconfig.json`
- `npm --prefix packages/layout-engine test -- app-load app-live-resize app-relayout app-relayout-runtime app-layout-bridge-runtime browser-entry-contract`
- `npm --prefix packages/layout-engine test`
- `npm --prefix apps/preview test`
- `node scripts/check-browser-bundle-fresh.mjs`
- `node scripts/check_no_new_python.mjs`

### Resolved Next recommended slice

068 is now validation-complete. If preparing the merge, keep the dirty YAML
fixture out of the 068 commit unless the user explicitly wants to commit that
authoring experiment.

Workflow-kit dry-run previously reported one remaining item (`T041`); after the
test-isolation fix and full validation, `T041` is closed.

Also note for spec 060: user reports that clicking `ELK layered layout` does not
always visibly change the diagram. Spec 060 now records the follow-up: prove
active engine identity, active option bucket, and geometry before deciding
whether this is a rerender bug or a legitimate equivalent-layout case.

Spec 069 is now drafted for the broader problem: editor mutations can produce
indeterminate state when active tab, render intent, frame-tree engine, option
buckets, dirty/undo state, rendered SVG, save payload, and reloaded YAML drift.
Do not implement 069 on the 068 branch; switch to
`feat/069-editor-mutation-state-determinism` after 068 is committed/merged or
otherwise separated.

### Resolved Important clarifications

- `outer_margin` is **not** a 068 target right now.
  It is still the documented canonical uniform grid-margin field.
- `compatibleEngines` is **not** “compat debt”.
  It is product behavior.
- The goal of 068 is deletion of **repo-owned dual paths**, not renaming every old-looking symbol blindly.

### Resolved Current grep baseline

The banned-alias grep in
[`specs/068-internal-dual-path-deletion/search-evidence.md`](specs/068-internal-dual-path-deletion/search-evidence.md)
has zero active source/test hits.

### Resolved Cold-start instruction

For a new chat, start with:

1. [`AGENTS.md`](AGENTS.md)
2. [`docs/specs.md`](docs/specs.md)
3. [`specs/068-internal-dual-path-deletion/spec.md`](specs/068-internal-dual-path-deletion/spec.md)
4. [`specs/068-internal-dual-path-deletion/tasks.md`](specs/068-internal-dual-path-deletion/tasks.md)
5. [`specs/068-internal-dual-path-deletion/deletion-inventory.md`](specs/068-internal-dual-path-deletion/deletion-inventory.md)

Then prepare/merge 068. Do not implement 069 until switching to
`feat/069-editor-mutation-state-determinism`.

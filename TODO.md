# TODO — execution order

**Single owner of cross-spec execution order** (what to work on next) plus an
un-numbered backlog. Nothing else lives here: for a spec's **status** trust
[`docs/specs.md`](docs/specs.md); for live/current-task state trust
[`AGENT-INBOX.md`](AGENT-INBOX.md); for one spec's task list trust
`specs/<id>-<slug>/tasks.md`. Spec-kit has no cross-spec ordering concept — that is
why it lives here.

Jira: Stream E (constrained editor) under [DE-941](https://warthogs.atlassian.net/browse/DE-941).

## Immediate cleanup checklist

Created from the 2026-07-19 machine-switch audit so these do not get lost while
individual tasks are discussed.

- [x] Move merged spec 028 from `specs/` to `docs/spec-archive/` and update
      `docs/specs.md`.
- [x] Move merged spec 061 from `specs/` to `docs/spec-archive/` and update
      `docs/specs.md`.
- [ ] Close spec 077 draw.io theme handling: `main` contains the explicit paired
      theme contract, tests, and goldens. Record the diagrams.net Light/Dark/
      Automatic result for T021/T030, including embedded SVG icons.
- [ ] Close spec 075: the Opus closeout review is done
      (`docs/spec-reviews/opus-adversarial-review-findings-2026-07-20-spec-075-ux-delivery.md`);
      original T045 native OS picker/regrant evidence remains, while the observed
      silent-open/hidden-recovery regression is owned by active Spec 084. Close
      both before archiving `specs/075-preview-folder-workspaces/`. Non-repo
      delivery is split out to successor Spec 083.
- [ ] Delete stale merged remote branches after push access is confirmed:
      `origin/feat/028-diagram-interchange-mermaid-d2` and
      `origin/feat/061-preview-grid-regression`.
- [x] Delete local merged branches:
      `feat/053-preview-editor-post-refactor-correctness` and
      `feat/spec-kit-retrofit-core-engine-specs`.
- [ ] Decide whether to delete retired local/remote
      `feat/076-tls-mermaid-cold-start-fit`; do not merge or resume it.
- [ ] Decide whether to inspect/drop
      `stash@{0}` (`codex-preserve-frame-yaml-before-main-pull-2026-07-07`),
      which only touches two `scripts/diagrams/frames/*.yaml` fixtures.

## Recommended proceed / merge order

1. **Spec 084 folder-workspace reliability.** User-blocking Open-folder/recovery
   regression: make the Chrome folder action observable, restore the named Browse
   group reliably, and record native chooser/regrant proof before claiming the
   local workflow dependable.
2. **Spec 077 YAML -> draw.io export closeout.** Perform the Light/Dark/Automatic
   manual verification for T021/T030 before beginning another layout-engine/
   exporter change.
3. **Spec 075 preview folder workspaces closeout.** Implementation is already on
   `main`; close original T045 only after Spec 084 resolves the current in-app
   native/recovery reliability defect. Spec 083 (delivery shell) remains the
   follow-up owner for non-repo launch.
4. **Spec 064 arrow annotation label de-overlap.** Start on
   `feat/064-arrow-annotation-label-de-overlap`; investigation-first and low
   conflict with 075/077 closeout.
5. **Spec 070 layers palette reorder.** Start on
   `feat/070-layers-palette-reorder` after 064 or in parallel only if a separate
   agent owns it; it touches preview interaction/persistence surfaces.
6. **Spec 079 Figma component variant import** or smaller draft specs
   (`018` PNG export, `006` arrow routing) after the closeout queue is drained.
7. **Spec 082 Figma-to-YAML round trip** is an independent contract-first
   feature on `feat/082-figma-yaml-round-trip` at `c53d5ae`. Begin T001–T005 and
   T010–T015 without changing product code; after the contract gate, scanner,
   YAML merge/persistence, guarded file service, and plugin UI can run in
   parallel. Spec 079 remains the one-way import dependency.

### Branch audit from 2026-07-19

- Active implementation: spec 077 has a pending merge into `main`; independent
  spec-only worktrees exist for
  `feat/081-diagram-review-workspace` and `feat/082-figma-yaml-round-trip`.
- Neither spec-only branch contains product implementation yet.
- Local stale merged branches: deleted during the 2026-07-19 audit
  (`feat/053-preview-editor-post-refactor-correctness`,
  `feat/spec-kit-retrofit-core-engine-specs`).
- Retired branch present locally and remotely:
  `feat/076-tls-mermaid-cold-start-fit`; keep only as history unless a human
  explicitly asks to salvage a commit.
- Stale post-merge remote branches:
  `origin/feat/028-diagram-interchange-mermaid-d2`,
  `origin/feat/061-preview-grid-regression`.
- Independent dependency/service branches:
  `origin/renovate/configure` and the three Dependabot branches. They are
  independent of the spec closeout order and should be reviewed separately.
- Historical SVG/force branches:
  `origin/svg/data-centre-cloud-1`, `origin/svg/controller-agent-architecture`,
  and `origin/feature/force-layout`. Do not merge into the spec queue without a
  separate human decision.

## Blocked

- **Spec 065 — interactive relayout contract.** Blocked on the uncaptured
  historical `baseline-fail.json` artifact. Leave parked until that is resolved
  or explicitly waived/replaced.

## Backlog ideas

Promote to a numbered `specs/<id>-<slug>/` package (and add a `docs/specs.md`
row) before coding. Bugs already captured by a numbered spec live in
`docs/specs.md`, not here.

- `editor-base.js` thinning — true spec 046 follow-up; legacy interaction state
  still needs decomposition.
- Engine breadth on the spec 071 node contract: state/lifecycle, tree/mindmap,
  swimlane, ER/class orthogonal, `elk-force` lane polish.
- Editor workflow: folder-backed navigation, cross-engine multi-select
  align/distribute, bulk pin/unpin.
- Layers palette follow-up after spec 070: cross-parent move/reparent and
  drag-and-drop between containers, not just same-parent reorder.
- Frame authoring: nested children default to autolayout **fill** not fixed
  width (gap regression on fresh diagrams); root sizing / direction-change.
- Performance/stability: investigate preview or generation jobs that saturate
  CPU/RAM and can lock a workstation under heavy diagram loads.
- Rich node content blocks: heading + paragraph + bullet-list content inside one
  node without abusing grey annotation children.
- Contract hardening: arrow clearance, invalid-enum diagnostics, preview JSON
  schema freshness, parser negatives, layout idempotency.
- Lower-model / terminal usability: slash commands for import/export/convert
  from pasted image, verbal description, `.mmd`, `.drawio` to SVG, PNG, draw.io,
  Mermaid, and YAML outputs.
- Later: ontology-driven engine selection, security hardening, arrow waypoint
  editing, `DIAGRAM.md` refinement.

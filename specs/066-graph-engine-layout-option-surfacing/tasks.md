# Tasks: Spec 066 Graph Engine Layout Option Surfacing

**Input**: `specs/066-graph-engine-layout-option-surfacing/spec.md`  
**Branch**: `feat/066-graph-engine-layout-option-surfacing`

> **Fold-in note:** spec 067 is not executed separately. Its accepted
> parameter-pane architecture work lands here on the current branch.

## Phase 1: Official Inventory

- [x] T001 Write `official-option-inventory.md` from primary sources only:
      Dagre wiki + package source, ELK algorithm pages, and ELK option pages.
- [x] T002 For every candidate option, classify it as `Expose`,
      `Investigate`, or `Do not expose`.
- [x] T003 Record the reason for every non-exposed option:
      node-scoped, edge-scoped, dependency-gated, implementation-owned,
      doc/runtime mismatch, or future advanced UI.
- [x] T004 Reconcile the inventory against the current repo registries and note
      every gap: missing control, unsupported exposed control, mislabeled
      control, and unplumbed engine option.

## Phase 2: Registry And Plumbing

- [x] T010 Extend the Dagre registry and Dagre layout plumbing to cover every
      approved graph-scoped Dagre option from the inventory.
- [x] T011 Replace the current non-layered ELK ad hoc control arrays with an
      audited per-algorithm exposure contract backed by the inventory.
- [x] T012 Remove or replace unsupported current controls, starting with the
      `elk-stress` options that are not supported by the official stress
      algorithm page.
- [x] T013 Add dependency-aware UI gating for conditional options such as
      force-model-specific and radial rotate/compaction-specific controls.
- [x] T014 Keep implementation-owned ELK bridge keys out of the author UI unless
      this spec intentionally changes the ELK graph-builder contract.
- [x] T015 Prune hidden `visibleWhen` keys from session overrides, relayout
      inputs, and persisted engine-layout payloads instead of treating
      visibility as display-only.
- [x] T016 Hydrate session layout overrides from the active engine namespace on
      reload, including `engineLayout['meta.dagre']`, instead of only from the
      legacy ELK alias lane.
- [x] T017 Tighten frame-YAML engine-layout validation so a shared namespace
      such as `meta.elk` cannot save a key mix that belongs to no single
      supported engine manifest.
- [x] T018 Correct invalid surfaced metadata in shared registries, starting with
      `elk.layered.nodePlacement.strategy`.

## Phase 3: Behavioral Proof

- [x] T020 Add focused tests asserting that each engine's surfaced control keys
      match the approved inventory.
- [x] T021 Add focused runtime tests proving Dagre option plumbing affects the
      actual Dagre graph config, not just the sidebar registry.
- [x] T022 Add live or integration-level proofs for Force, Stress, Mr. Tree,
      Radial, and Rectpacking that every surfaced control has a visible or
      measurable effect, or is gated with the documented dependency reason.
- [x] T023 Specifically prove or reject the reported radial spacing behavior:
      `Node gap` must either change intra-graph separation in the intended way,
      or be relabeled/removed in favor of a truer control.
- [x] T024 Add at least one repo-owned `persist -> reload` regression covering
      graph-engine override save and reload.
- [x] T025 Add focused regressions for dependency-gated control pruning and
      active-engine reload seeding.

## Phase 4: Modular Parameter-Pane Architecture

- [x] T026 Add a typed per-operator override owner under
      `packages/layout-engine/src/preview-shell/layout-operator-overrides.ts`
      and stop treating `layoutOverrides` / `elkLayoutOverrides` as the source
      of truth.
- [x] T027 Route pane collection, namespaced payload collection, fresh render,
      and layout-bridge relayout through one effective-override resolver.
- [x] T028 Seed and activate operator buckets from the current engine namespace
      on reset / switch without reusing stale flat aliases from another engine.
- [x] T029 Extend editor snapshot / restore to carry full
      `layoutOperatorOverrides` state so undo and reload do not collapse
      incompatible engines back into one bucket.
- [x] T030 Refine shared-namespace validation so `meta.elk` uses the active
      layout engine as a disambiguator when multiple manifests share keys,
      while still rejecting impossible cross-algorithm mixes.
- [x] T031 Add focused unit coverage for resolver merge/prune behavior and
      operator-bucket isolation.
- [x] T032 Collapse graph-engine parameter hosting onto one canonical
      `layout-params`-style sidebar section / runtime path so Dagre and ELK do
      not remain separate first-class pane hosts in typed preview-shell code.
- [ ] T033 Confine any remaining ELK-named browser compatibility aliases to one
      explicit shim boundary; remove them from typed internal ownership and
      shared host contracts.
- [x] T034 Add focused contract coverage proving the unified graph-engine layout
      pane host resolves the active engine manifest without Dagre-vs-ELK shell
      branching.

## Phase 5: Validation

- [x] T040 Run `npm --prefix packages/layout-engine test`.
- [x] T041 Run `npm --prefix apps/preview test`.
- [x] T042 Run `node scripts/check_no_new_python.mjs`.
- [x] T043 If browser verification is needed, prefer DOM probes and focused
      geometry assertions; do not capture screenshots unless explicitly asked.

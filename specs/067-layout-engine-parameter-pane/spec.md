# Spec 067: Layout Engine Parameter Pane (Operator-Scoped Overrides)

**Feature Branch**: Folded into `feat/066-graph-engine-layout-option-surfacing`  
**Status**: Folded into Spec 066  
**Created**: 2026-06-29  
**Depends on**: Spec 052 (engine onboarding factory), Spec 054 (typed persistence),
Spec 055 (workspace navigation), Spec 066 (option inventory + surfacing — may land in
parallel; this spec owns **override lifecycle**, not option discovery)  
**Architecture note**: [`parameter-pane-architecture.md`](./parameter-pane-architecture.md)

> **Implementation decision (2026-06-29):**
> keep this package as an adversarial review artifact and architecture note only.
> The actual product work is owned by spec 066 on the current branch because the
> tactical 066 fixes and the override-lifecycle architecture cannot be separated
> cleanly without duplicating ownership and branch churn.

## Problem

Spec 066 exposes graph-engine options through per-engine registries and a generic
control renderer. That is the right **Houdini-style parm template** direction: each
layout operator publishes parameters; one pane renders whatever the active operator
defines.

The architecture does **not** yet behave like a parameter pane at scale:

1. **Session overrides are a mixed bag.** `model.layoutOverrides` is one flat object
   shared across engines. Hidden `visibleWhen` controls, prior engine choices, and
   stale branch-specific values survive engine switches and dependency changes.
2. **`meta.elk` is validated as a union of every ELK engine's keys.** A payload can
   be “valid” while combining keys that no single ELK algorithm accepts. Layered
   reload then fails fast; other paths silently ignore or misapply foreign keys.
3. **Reload hydration is namespace-blind.** Session seeding still biases toward legacy
   `elkLayout` instead of consistently hydrating from
   `engineLayout['meta.<engine>']` for the **active** operator.
4. **Effective overrides are computed in multiple places.** Panel render, DOM
   collection, fresh render filtering, relayout bridge resolution, and save
   validation do not share one authoritative “parms for active operator” function.
5. **Grouping polish is centralized on layered ELK.** `elkParamGroups()` is not
   wrong today, but it does not scale to ~150 operators without each operator owning
   its own presentation metadata.

The product goal is a **SideFX Houdini parameter pane** mental model:

- Thousands of operators; one generic pane.
- Switch operator → pane shows **only** that operator's parameters.
- Incompatible parm sets never merge into one live state bucket.
- Persisted parms round-trip per document operator choice, not per global soup.

This spec targets **~150 layout algorithms** (full bundled elkjs family, Dagre,
future Mermaid/D2 graph engines, and additional registered preview engines) without
reintroducing central `engineId` branching in the shell.

## Goals

- Introduce a typed **layout operator override model** keyed by operator identity
  (`layoutEngineKey` / preview engine id), not one shared flat bag.
- Provide one authoritative **`resolveEffectiveLayoutOperatorOverrides`** used by:
  panel display, DOM collection, relayout, fresh render, and save payload assembly.
- Make **`visibleWhen` state-owning**: hidden controls are excluded from session,
  relayout, and persist — not merely hidden in the DOM.
- Make **frame-YAML engine-layout validation manifest-aware**:
  - `meta.dagre` keys must ⊆ active Dagre manifest.
  - `meta.elk` keys must ⊆ **exactly one** registered ELK-family manifest (or the
    document's persisted `meta.layout_engine` when unambiguous).
  - Reject ambiguous cross-algorithm mixes at save time.
- Hydrate session state from **`engineLayout[activeNamespace]`** on load, engine tab
  switch, and reload — without requiring a user edit to sync UI and relayout.
- Keep onboarding **declarative**: new operators add registry + manifest only; no
  edits to the generic pane renderer's engine-specific branches.
- Prove closeout with **persist → reload** regressions across incompatible operators
  (at minimum: `dagre`, `elk-layered`, `elk-force`).

## Non-goals

- No per-node or per-edge parameter editor (future spec).
- No reopening spec 046 by growing `scripts/preview/editor.js` or
  `layout-bridge.js` beyond thin delegation.
- No requirement to split `meta.elk` into dozens of YAML namespaces by default.
  Namespace explosion is allowed only if manifest-aware validation cannot be made
  reliable; default fix is **active-operator scoping + ambiguous-set rejection**.
- No re-audit of upstream option inventories (spec 066 owns exposure decisions).
- No polish-only work (unit suffixes, single-choice enum presentation) unless needed
  for correctness tests.

## Design Summary

See [`parameter-pane-architecture.md`](./parameter-pane-architecture.md) for the
target data flow. In short:

| Layer | Responsibility |
|-------|----------------|
| Operator registry (`graph-layout-*`) | Parm templates: keys, kinds, defaults, `visibleWhen`, groups |
| Preview manifest | `controlSpecs`, `persistNamespace`, `layoutEngineKey`, capabilities |
| **Override resolver (new)** | Merge YAML + per-operator session; evaluate visibility; prune stale keys |
| Generic pane runtime | Render active manifest specs; bind inputs; call resolver on change |
| Persistence | Save **only** active operator namespace; validate ⊆ single manifest |

**Operator switch** replaces the parm block logically:

- UI rebuilds from new manifest `controlSpecs`.
- Session reads from `overridesByOperator[newId]` (or seeds from YAML).
- Previous operator's session bucket is preserved in memory for tab switching but
  **never merged** into relayout/save for the active operator.

## Functional Requirements

### Override model

- **FR-001**: Replace the flat `layoutOverrides` / `elkLayoutOverrides` session
  contract with a typed structure that stores overrides **per layout operator**
  (keyed by `layoutEngineKey` or preview engine id — pick one canonical key and
  document it in the architecture note).
- **FR-002**: Expose a single resolver,
  `resolveEffectiveLayoutOperatorOverrides(context)`, that returns the flat override
  map consumed by layout engines. Inputs: active manifest, `engineLayout` YAML
  slice, per-operator session bucket, and current display values for `visibleWhen`.
  Output: only keys that are (a) in the active manifest `controlSpecs` and (b)
  currently visible per `visibleWhen`.
- **FR-003**: All consumers must call the resolver (or thin wrappers around it):
  `collectOverrides`, `collectNamespacedOverrides`, `filterPreviewEngineLayoutOptionOverrides`,
  layout-bridge `resolveEngineLayoutOptionOverrides`, and save payload assembly.
  No duplicate merge/prune logic.
- **FR-004**: Changing a `visibleWhen` dependency must prune keys that are no longer
  visible in the **same operator** session bucket before relayout and before dirty
  state is committed.
- **FR-005**: Switching the active layout operator must not merge the previous
  operator's override bucket into the active operator's effective overrides.

### Persistence and frame YAML

- **FR-006**: On diagram load and after save/reload, seed the active operator's
  session bucket from `diagram.engineLayout[persistNamespace]` when present.
  Legacy `diagram.elkLayout` remains a read alias for `meta.elk` only.
- **FR-007**: Save emits `engine_layout_overrides` containing **only** the active
  operator's namespace and pruned effective keys. Inactive operator buckets are not
  written to frame YAML in this spec (they may remain in browser session for tab
  switching within the same page lifetime).
- **FR-008**: Frame-YAML validation must reject `meta.elk` override sets whose key
  set is not a subset of **exactly one** registered ELK preview engine manifest.
  Mixed layered+force key sets fail at save with a human-readable error.
- **FR-009**: `meta.dagre` validation must reject keys outside the Dagre manifest.
  Cross-namespace pollution (ELK keys inside `meta.dagre`) fails at save.
- **FR-010**: Reloading a document with `meta.layout_engine: elk-layered` and a
  pruned `meta.elk` block must relayout without throwing, even if the YAML was
  saved from a different engine tab earlier in the same session.

### UI pane

- **FR-011**: The generic pane runtime remains engine-agnostic. It must not branch
  on `elk-force` vs `elk-radial` etc. Engine-specific grouping comes from manifest
  metadata or registry-owned group ordering — not from `elkParamGroups()` alone.
- **FR-012**: Collapse `elk-layout` and `graph-layout` host sections into one
  manifest-driven **Layout** parameter region. Legacy section names may survive
  only as wrappers while the typed host converges on one canonical path.
- **FR-013**: Inactive operator panes stay hidden/inert (spec 051/055 behavior) and
  must not contribute overrides to relayout or save.

### Scale and onboarding

- **FR-014**: Adding a new preview graph engine continues to require only: param
  registry in `packages/graph-layout-*`, manifest via `defineGraphLayoutPreviewEngine`
  or `registerPreviewEngine`, and contract test — **no** edits to override merge
  logic.
- **FR-015**: Frame-YAML supported-key indexing must be computable in
  **O(active manifest)** at save/validate time. Precomputing the union of all
  engines for `meta.elk` is allowed for discovery but must not be the sole gate for
  whether a persisted key set is valid.
- **FR-016**: Document a **150-operator scale bar** in the architecture note:
  registration points, resolver cost, and forbidden patterns (central union bags,
  shell `if (engineId)` UI branches).

### Regression fixes bundled into this spec

These are structural fixes, not optional polish:

- **FR-017**: Remove invalid enum exposure such as layering-only values on
  node-placement controls (if not already fixed on the 066 branch).
- **FR-018**: `collectPersistedPayload` must not overwrite namespaced overrides
  with an unfiltered flat session bag.

## Success Criteria

- **SC-001**: `resolveEffectiveLayoutOperatorOverrides` exists in
  `packages/layout-engine/src/preview-shell/` (or `preview-engine/`) and is used
  by pane collection, relayout bridge, and fresh render paths.
- **SC-002**: Switching `elk.force.model` from `FRUCHTERMAN_REINGOLD` to `EADES`
  removes `elk.force.temperature` from session, relayout input, and the next save
  payload (focused unit test).
- **SC-003**: Switching workspace operator from `elk-force` to `elk-layered` does
  not pass force-specific keys into layered layout resolution (focused test + no
  `Unsupported ELK layered override keys` throw on relayout).
- **SC-004**: Save rejects a `meta.elk` payload that mixes keys from incompatible
  manifests (e.g. `elk.force.model` + `elk.layered.layering.strategy`).
- **SC-005**: `persist → reload` regression: Dagre overrides in `meta.dagre`
  survive save and appear in session without user edit.
- **SC-006**: `persist → reload` regression: `elk-layered` overrides in `meta.elk`
  survive save and relayout.
- **SC-007**: `persist → reload` regression: switching persisted
  `meta.layout_engine` between two incompatible engines uses the correct namespace
  slice after reload (no bleed from the other engine's YAML block if both exist
  historically — document migration behavior in architecture note).
- **SC-008**: Onboarding checklist updated: new engines register parms only; no
  override-lifecycle edits.
- **SC-009**: Closeout validation passes:
  `npm --prefix packages/layout-engine test`;
  `npm --prefix packages/graph-layout-elk test`;
  `npm --prefix packages/graph-layout-dagre test`;
  `npm --prefix apps/preview test`;
  `npm --prefix packages/layout-engine run build:browser`;
  `node scripts/check_no_new_python.mjs`.

## Risks

- **Historical YAML** may contain broad `meta.elk` blocks from before manifest-aware
  validation. Migration may need a one-time load-time filter (strip keys not in the
  document's declared `meta.layout_engine` manifest) to avoid breaking existing
  fixtures.
- **Workspace tab switching** (spec 055) keeps multiple engines visitable in one
  session; per-operator buckets must interact cleanly with “explicit reopen” semantics.
- **Legacy aliases** (`elkLayout`, `elkLayoutOverrides`, `elk_layout_overrides`)
  must remain compatibility read paths through one normalization layer, not parallel
  logic.

## Relationship to Spec 066

| Concern | Spec 066 | Spec 067 |
|---------|----------|----------|
| Which options exist / exposed | Inventory + registries | — |
| Generic pane rendering | Yes | Extends with resolver hook |
| `visibleWhen` pruning | FR-011 (tactical) | FR-004 (authoritative resolver) |
| `meta.elk` union validation | FR-013 (tactical) | FR-008 (manifest-aware model) |
| Dagre reload hydration | FR-012 (tactical) | FR-006 (general seeding) |
| 150-operator scale | Folded into 066 closeout bar | Primary goal |

This package is no longer an independent execution target. Its accepted
architecture and corrected invariants are folded into spec 066 tasks.

## Closing Note

Spec 066 answers: *which knobs may we show?*  
Spec 067 answers: *how does the pane behave when there are 150 operators and their
knobs do not mix?*

The invariant: **at any moment, the preview has exactly one active layout operator,
and every downstream path sees exactly that operator's effective parameters.**

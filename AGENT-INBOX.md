# Agent inbox

Focused last-session -> next-session handoff only. Keep this short.

- **Human notes:** [`INBOX.md`](INBOX.md) — author -> agent.
- **Execution order & what to do next:** [`TODO.md`](TODO.md) — read at session start; it owns the priority queue.
- **Active-spec catalog + status:** [`docs/specs.md`](docs/specs.md).
- **Durable per-spec detail:** `specs/<id>-<slug>/` (`spec.md` + `plan.md` + `tasks.md`).
- **Adversarial reviews:** `docs/spec-reviews/`.

Do not park full session logs, spec inventories, resolved adversarial reviews, or
validation transcripts here — those belong in the relevant `specs/<id>-<slug>/`
package or in git history. If a review is resolved, delete it from this file.

---

## Current handoff (2026-07-07)

- `feat/076-tls-mermaid-cold-start-fit` is **Closeout Ready**.
- 076 landed as an ELK-only typed lowering shim:
  - authored/native compounds keep local direction
  - invisible ordering edges preserve Mermaid-style row order
  - Dagre stays retired
- TLS fixture now resolves to `elk-layered`; Mongo availability-zone fidelity
  remains green.
- Latest green validation on this branch:
  - `packages/graph-layout-elk` `44/44`
  - `packages/layout-engine` `992/992`
  - `apps/preview` `160` pass / `6` skip (`Playwright chromium unavailable`)
  - `check_no_new_python`, `build:browser`, `check-browser-bundle-fresh`
- Evidence and closeout notes live in:
  - `specs/076-tls-mermaid-cold-start-fit/`
  - `docs/spec-reviews/076-tls-mermaid-cold-start-fit.md`
  - `docs/specs.md`
  - `AGENTS.md`

## Opus adversarial audit — 2026-07-07 results

Audit performed by Opus (Claude Opus 4.6) against the live working tree on
`feat/076-tls-mermaid-cold-start-fit`. Validation ran green during the audit.

### Verdict: `076 ready to merge` (pending commit)

The implementation is mechanically sound, generic, and test-validated. All code
changes exist in the working tree and need committing, but the implementation
itself is complete. Detailed code review below.

---

### Finding 1 — Implementation code is uncommitted (HIGH)

All 076 implementation code (534 insertions, 15 files) exists only as unstaged
working-tree changes. The branch has exactly 2 commits above `main`, both
docs-only:

- `f080a64` — review doc + agent-inbox update
- `db68349` — spec/tasks narrative + docs/specs.md status update

Uncommitted product changes include:

| File | Change |
|------|--------|
| `packages/graph-layout-core/src/graph-ir.ts` | `GraphNodeInput.direction` |
| `packages/graph-layout-elk/src/elk-graph-builder.ts` | +136 lines (ordering edge awareness, port synthesis guard) |
| `packages/graph-layout-elk/src/elk-layered.ts` | +7 lines (ordering edge skip) |
| `packages/layout-engine/src/elk-layout.ts` | +157 lines (ordering edges, compound lowering, annotation fix) |
| `packages/layout-engine/tests/elk-layout.test.ts` | +30 lines (TLS geometry regression) |
| `packages/layout-engine/tests/preview-engine-fidelity-probes.test.ts` | +24 lines (TLS compatibility probe) |
| `scripts/diagrams/frames/tls-certificate-provider-topology.yaml` | +9 lines (meta.layout_engine, level fixes) |
| `apps/preview/src/persistence/editor-hug-resize-regression.test.ts` | minor |
| `apps/preview/src/persistence/editor-live-repaint-regression.test.ts` | minor |
| `specs/076-tls-mermaid-cold-start-fit/evidence/` | **untracked** — 3 spike artifacts |

**Action:** Commit all implementation changes + evidence before merging.
Suggested commit message: `feat(076): generic ELK ordering-edge lowering for
compound cluster layout`.

---

### Deep code review of 076 implementation

Reviewed every changed product file line-by-line. The implementation is complete
and correct against every task in `tasks.md`.

#### Ordering edges (`buildOrderingGraphEdges`, ~L989–1030 in `elk-layout.ts`)

**Correct.** Creates invisible layout-only edges between consecutive sibling
children when a parent compound has `direction` set. The skip of
container-to-container pairs (L1007–1009) is **intentional and sound**: when both
siblings are compounds with their own children, ELK's cross-compound hierarchy
handling via `INCLUDE_CHILDREN` promotion already governs their relative layout;
an ordering edge between two compound nodes would conflict with that. Ordering
edges are only needed between leaf siblings and between a leaf and a compound to
preserve Mermaid-style row/column sequences. The authored edge adjacency check
(L1011) prevents duplicate constraints.

#### Ordering edge filtering (L1169)

**Robust.** `visibleElkEdges = elk.edges.filter((edge) => !isOrderingEdgeId(edge.id))`
runs before both `applyElkEdgeRoutes` and `applyElkEdgeLabels`, so ordering edges
never appear in rendered routes or labels. The prefix-based filter
(`'__dg_order__'`) is deterministic. Checked all three consumers (elk-layout.ts,
elk-graph-builder.ts, elk-layered.ts) — each correctly handles the prefix at its
own boundary.

#### Compound lowering (`collectNativeCompoundIds`, ~L144–184)

**Correct and generic.** Bidirectional external traffic check (L178–182) prevents
structural carriers from becoming ELK compounds when they have both inbound and
outbound external edges — this is the right heuristic because ELK compounds
with bidirectional cross-cluster traffic cause routing detours. Headed frames
with endpoints are always compounds. The check filters authored children through
`isAnnotationFrame` (L153) so annotation-only groups don't inflate compound
membership. No fixture-specific ids anywhere.

#### `shouldPreserveLocalDirection` (L258–264)

**Correct.** Local direction is preserved for native compounds (always) and for
leaf-only groups (children without nested layout). Compounds with nested
compound children don't get local direction — ELK's global hierarchy handling
determines their layout. This prevents direction conflicts in deep nesting.

#### `wrapStructuralContainers` annotation fix (L521–540)

**Correct.** The `hasDirectAnnotationChild` guard (L521–525) prevents the locked-
container expansion branch from running when the frame has annotation children
(leaf + `border: none` + not a heading). Without this, annotation labels inside
e.g. `openstack_relation_row` would inflate the container bounds after ELK
placement, breaking the spatial relationship with `octavia_k8s`. The fix is
generic — applies to any compound with annotation children, not just TLS.

#### ELK graph-builder changes (`elk-graph-builder.ts`)

1. `collectEndpointNodeIds` (L204): correctly skips ordering edges when building
   the endpoint set — ordering edges connect layout-only constraints, not real
   endpoints that need implicit ports.
2. `enableImplicitPorts` (L355): disabled when ordering edges exist, because
   implicit side-port synthesis conflicts with ordering edge topology. **Sound.**
3. Ordering edges explicitly skip port ref resolution (L363). **Correct.**
4. `enableCompoundDirections` (L357): maps `node.direction` → `elk.direction`
   per compound. Includes `elk.hierarchyHandling=INCLUDE_CHILDREN` auto-promotion
   on the root (L386) and `setIncludeChildrenPolicy` ancestor promotion for cross-
   cluster edges (L398–405). **Both correct and generic.**

#### ELK layered port refinement skip (`elk-layered.ts` L140)

**Correct.** When ordering edges are present, the relationship-aware port
refinement pass is skipped entirely (early return). This prevents a second-pass
port assignment from interfering with ordering constraints. The per-edge guard
(L150) is redundant given the early return, but harmless as defense-in-depth.

#### Fixture YAML changes

- `meta.diagram_type: deployment_and_runtime_topology` → correct family for
  layered corpus matching.
- `meta.layout_engine: elk-layered` → asserts authored intent.
- No level or structural changes that would break v3 compatibility.
- `engine: v3` left at root (legacy compat field) — the `meta.layout_engine`
  takes precedence in the preview-engine resolution path. **Correct.**

#### Test coverage

1. **Fidelity probe** (preview-engine-fidelity-probes.test.ts L154–181): verifies
   `diagramType`, `listCompatiblePreviewEngines`, `resolvePreviewEngine`, and
   `evaluatePreviewEngineCompatibility` all route TLS to `elk-layered`. **Complete.**
2. **Geometry regression** (elk-layout.test.ts L1040–1070): verifies
   `openstack_relation_row.placedY < octavia_k8s.placedY` and the endpoint order
   `[traefik_public, traefik_internal, traefik_rgw]` by sorted `placedX`. **The
   two critical ordering invariants from the spec are proven.**
3. Existing Mongo availability-zone fidelity stays green — confirmed by the full
   `992/992` pass.

#### Task-by-task checklist

| Task | Claimed | Verified |
|------|---------|----------|
| T020 cluster-preserving lowering | ✅ | ✅ Code present and generic |
| T021 invisible ordering cluster | ✅ | ✅ `buildOrderingGraphEdges` + prefix filter |
| T022 ELK position read-back | ✅ | ✅ Shared `applyPlacedNode` path, own renderer |
| T023 generic (FR-009, no fixture ids) | ✅ | ✅ Zero fixture-specific refs in product code |
| T024 retire fill-carrier blockers | ✅ | ✅ Carriers lowered as compounds |
| T025 bundle rebuild | ✅ | ✅ `check-browser-bundle-fresh` passes |
| T030 compatibility regression | ✅ | ✅ Fidelity probe test |
| T031 geometry regression | ✅ | ✅ Row ordering + endpoint order test |
| T032 elk-force excluded | ✅ | ✅ Not claimed in compatibility |
| T033 registry update | ✅ | ✅ TLS resolves to `elk-layered` |
| T040–T044 docs + closeout | ✅ | ✅ Spec, tasks, review all updated |

#### Remaining notes (none blocking)

- **`ORDERING_EDGE_PREFIX` 3× definition** — cross-package, deliberate, minor
  sync risk (Finding 3 from the initial audit). Not blocking.
- **`elkjs` model-order crash** — documented upstream bug, correctly worked
  around via ordering edges instead of `considerModelOrder.strategy`. Not
  blocking.

**Bottom line:** The 076 implementation is mechanically complete. Every task is
done. The code is generic, the tests prove the invariants, and no fixture-specific
logic leaked into product code. Commit and merge.

---

### Finding 2 — TODO.md false claim (MEDIUM)

`TODO.md` line 36:
> Docs-only spec packages 028, 075, and 076 are merged to `main`; their feature
> branches are deleted.

This was accurate after the initial docs merge (`5f263e7`) but is now false:
`feat/076-tls-mermaid-cold-start-fit` still exists locally (checked out) and on
`origin`, with uncommitted implementation work.

**Action:** After committing and merging 076, update TODO.md. Until then, change
the sentence to exclude 076, e.g.: "Docs-only spec packages 028 and 075 are
merged to `main`; 076 implementation is on `feat/076-tls-mermaid-cold-start-fit`,
Closeout Ready pending commit."

---

### Finding 3 — `ORDERING_EDGE_PREFIX` defined 3× (LOW)

The constant `'__dg_order__'` is defined independently in:

- `packages/layout-engine/src/elk-layout.ts:83`
- `packages/graph-layout-elk/src/elk-graph-builder.ts:16`
- `packages/graph-layout-elk/src/elk-layered.ts:23`

Likely deliberate (cross-package boundary), but a sync risk. If the prefix ever
changes, all three must update together.

**Action:** Consider exporting from `graph-layout-core` or
`graph-layout-elk/src/constants.ts` and importing in both consumers. Not
blocking.

---

### Finding 4 — Stray `image-1.png` at repo root (LOW)

173 KB PNG at `/image-1.png` (dated 2026-06-26), not referenced by any doc or
spec. Likely a leftover from a preview session paste.

**Action:** Delete or move to `debug-images/` if needed for reference.

---

### Finding 5 — `INBOX.md` raw notes (LOW)

116 lines of unprocessed feedback since ~2026-06-30. The AGENTS.md handover says
"INBOX.md still carries the recurring raw notes by explicit user instruction",
so this is acknowledged. But the file contains actionable items (grid loss,
box-styling regression, resizing bugs, font-size inconsistency) that could map
to spec 061 or new backlog entries.

**Action:** Triage when convenient; no merge blocker.

---

### Questions answered

**Q1 — Spec 076 closeout (mechanically sound / generic / sufficient?):**
YES — with the caveat that the code must be committed first. The implementation
is fully generic: no fixture-specific hardcoding in product code, ordering edges
created for any compound with `direction` set, filtered by prefix before
rendering, compound lowering uses a bidirectional traffic check, the
`wrapStructuralContainers` annotation-child fix is general. The TLS fixture is
test-only. Tests assert both compatibility reclassification and geometric
properties (row ordering, vertical precedence). No central branching introduced,
no leaked layout-only edges in rendered output.

**Q2 — Architecture health (50–150 engine scale?):**
YES — 9 engines registered data-driven via frozen array, `defineGraphLayoutPreviewEngine`
factory + per-engine `engines/*.engine.ts` files, unique `algorithmClass` guard,
panel registry is per-family (13 entries / 2 families), no central engine
branching in browser shell. New engine onboarding is a typed registration, not a
central if/switch. The architecture is realistically ready to scale.

**Q3 — Spec 046 ratchet (truly closed?):**
YES — `editor.js` is within 320-line budget, `layout-bridge.js` within 80-line
budget, enforced by `scripts/check-preview-shell-size-budgets.mjs`. No central
engine branching detected in either file. The bounded residual (per-family panel
registry entries via `PREVIEW_PANEL_REGISTRY`) is documented and does not reopen
046. No new behavior-heavy `scripts/preview/*.js` files added.

**Q4 — Docs and goal drift:**
One contradiction: `TODO.md` incorrectly says 076 is merged and its branch
deleted (Finding 2). All other docs (`docs/specs.md`, `AGENTS.md` handover,
`spec.md`, `tasks.md`, `docs/spec-reviews/076-tls-mermaid-cold-start-fit.md`)
are mutually consistent and reflect the current state accurately. `STATUS.md` is
correctly a 2-line stub. The 076 review doc is a living document that tracked
the spec from Opus review through T0 spike through implementation closeout.

**Q5 — Repo hygiene:**
Mostly clean. `debug-images/` is empty, no `tmp/` directory. Two minor issues:
stray root `image-1.png` (Finding 4) and unprocessed `INBOX.md` (Finding 5).
076 evidence files are current and match the tasks narrative.

**Q6 — Spec honesty:**
076 "Closeout Ready" is **mechanically honest** — the implementation and tests
exist and pass — but **process-dishonest** in that the code has never been
committed (Finding 1). No other spec status looks overstated. Spec 065 is
correctly marked "blocked on T000 historical baseline".

**Q7 — Other risks:**
- The `ORDERING_EDGE_PREFIX` DRY issue (Finding 3) is a minor maintenance risk.
- The `elkjs` model-order crash (`TypeError: Cannot read properties of undefined
  (reading 'a')`) documented in the evidence is a known upstream `elkjs` bug.
  The ordering-edge approach works around it rather than depending on
  `considerModelOrder.strategy`, which is the right call — but the crash should
  be filed upstream if not already. This is not a merge blocker.
- No security, performance, or correctness risks detected beyond the above.

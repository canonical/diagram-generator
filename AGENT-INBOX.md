# Agent inbox

Machine-generated handoffs and diagnostics go here.

- **Human notes:** [`INBOX.md`](INBOX.md) — author → agent; triage into specs, then clear when done.
- **Durable follow-up:** `specs/<id>-<slug>/`, [`AGENTS.md`](AGENTS.md#handover), [`docs/specs.md`](docs/specs.md).
- **INBOX row map:** [`docs/spec-reviews/inbox-triage.md`](docs/spec-reviews/inbox-triage.md).
- **Why specs looked “done” but URLs still fail:** [`docs/spec-reviews/README.md`](docs/spec-reviews/README.md).

`TODO.md` is only a pointer to open spec packages.

---

## AUTHORITY VERDICT 2026-06-28 — read before anything else

**Law:** [`docs/spec-reviews/CLINE-VERDICT-2026-06-28.md`](docs/spec-reviews/CLINE-VERDICT-2026-06-28.md)
+ [`specs/065-interactive-relayout-contract/verification-protocol.md`](specs/065-interactive-relayout-contract/verification-protocol.md).
**Execute spec 065 first** — it owns the single `PreviewRenderIntent` that
unblocks 060/057/048/051. The verdict reopened 060/057/048 and made 051 active.
Correction over Composer: 060's committed Playwright evidence proves the
direction case with `skipModelUpdate: true` via `page.evaluate` — a banned fake
proof — so 060's direction-flip + real-gesture relayout claims are void even
though engine *identity* is genuinely fixed. No spec in this cluster closes
without passing the spec-065 protocol matrix as a real gesture.


## ACTIVE — Preview post-load fidelity (synthesized 2026-06-23)

**Point GPT here first.** Do not mark work done because tests pass or
`docs/specs.md` says Closeout Ready. The author’s [`INBOX.md`](INBOX.md) rows are
still valid: **first load often looks OK; almost every interaction after load is
broken.**

### Core diagnosis

Preview has **two worlds**:

| World | Usually tested | Author pain |
|-------|----------------|-------------|
| **On-load** | Golden SVG, fidelity probes, `renderFreshPreviewSvg`, export IR | Low |
| **Post-load** | Inspector, resize, engine tabs, direction, box type, ELK options, save/reload | **High** |

**One architectural gap:** render intent (engine id, direction, overrides, arrow
invalidation) is split across `__DG_CONFIG`, `frameTreeJson.layoutEngine`,
per-frame overrides, and three relayout lanes:

1. **`performLocalRelayout`** — v3 only; patches DOM + `routeArrows`. **Skipped**
   when `isEngineLayoutDiagramJson` (`app-layout-bridge-runtime.ts` ~1755).
2. **`performEngineRelayout`** — full SVG via `renderFreshPreviewSvg`. Live resize
   often uses **`skipModelUpdate: true`** (`app-live-resize.ts` ~326–333).
3. **Bridge patch** — `patchPreviewFrameGroup` / `patchPreviewArrowSvg` (not IR).

### What “fixed” means

**Not fixed:** mocked `rerenderStageFromModel`; `svgHash` change; arrow count +
no NaN; `page.evaluate(performEngineRelayout)`; registry unit tests without live DOM.

**Fixed:** open exact URL → exact UI gesture → observable invariant → Playwright or
real-runtime regression on **same gesture**.

### Mandatory session start

```bash
npm --prefix packages/layout-engine run build:browser
npm run preview   # restart after bundle changes
```

### P0 bugs (fix before any spec closeout)

| ID | URL / symptom | Key files | Owner |
|----|---------------|-----------|-------|
| **P0-1** | ELK diagram resize → **“relayout failed”** | `app-live-resize.ts`, `app-relayout.ts`, `app-layout-bridge-runtime.ts` | Reverified 2026-06-29 by 065 T022 real pointer-drag evidence; 048 Closeout Ready |
| **P0-2** | `tiered-network-architecture`: inspector direction H→V → **arrows stay put** | `preview-arrow-reroute-invalidation.ts`, inspector → relayout | Reverified 2026-06-29 by 065 + 060 TS evidence |
| **P0-3** | `juju-bootstrap-machines-process`: engine tabs **no layout change** (re-verify) | `preview-engine-workspace-chrome.ts`, `app-fresh-render.ts` | Reverified 2026-06-29 by 060 TS evidence |
| **P0-4** | `mongo-octavia-ha`: v3 tab **still ELK**; AZ labels under VMs | engine intent + ELK compound render | Reverified 2026-06-29 by 060 + 057 TS evidence |

### P1 — Chrome / inspector (051 Phase 8 reverified 2026-06-29)

**051 was reopened** because the sidebar `PREVIEW_PANEL_REGISTRY` existed but
the author still saw N/A UI in the live editor:

1. **Inspector** (`inspector-autolayout-panel.ts`) does not gate on `activeEngine` /
   `capabilities.gridEditing` — cols/rows/gutters show or stay **disabled** instead
   of **hidden** on ELK.
2. **`#elk-raw-view-toggle` / `#elk-debug-overlay-toggle`** not separate registry
   entries; author wants debug **removed**, raw view **ELK-only**.
3. **`syncPanelVisibility`** reads `__DG_CONFIG` — can drift from rendered engine
   (`app-grid-editor-install-unit.ts` ~605). Must use same resolver as render (065).

**Resolved 2026-06-29 for 051 Phase 8:** `contextual-aside-check.ts` now proves
with real Playwright layer-tree clicks, engine-tab clicks, Tab traversal, DOM
state, and cropped screenshots that v3 shows native controls; ELK hides native
autolayout/grid controls; ELK layered-only options disappear on radial; raw view
is ELK-only; debug overlay and compatibility help text are absent.

### False closeouts (re-prove URLs)

| Spec | Claim | Reality |
|------|-------|---------|
| 056 | Direction reroute | Frame-override gap was reverified through 065/060 real inspector direction evidence |
| 060 | Engine tabs + direction evidence | Old `.mjs` fake proof replaced by `engine-tabs-identity-check.ts` real gestures |
| 057 | mongo fidelity | Probe-only gap replaced by `fidelity-browser-check.ts` real gestures |
| 051 | Contextual aside | Phase 8 live DOM + screenshots reverified 2026-06-29 |
| 048 | ELK live resize | Real pointer-drag proof reverified 2026-06-29 by 065 T022 |
| 047 | Render IR done | Export+fresh yes; **bridge patch lanes** still parallel |

### Recommended execution order

1. **Create `specs/065-interactive-relayout-contract/`** on `feat/065-...`
   - `PreviewRenderIntent` — single commit before render/relayout/panel sync
   - ELK resize null path + `formatPreviewRelayoutStatusMessage` reverified by 065 T022
   - Direction flip: invalidate arrows on page direction; prove via **inspector** `<select>`
   - Playwright `evidence/post-load-mutations.ts` (tiered-network + ELK resize)

2. **Finish 060 + 057** — engine tabs, mongo layout, box-type-no-relayout, **064** arrow label stack

3. **051 completed 2026-06-29** — engine-aware inspector omits N/A HTML; panel sync uses 065 intent resolver; Playwright probe + screenshots committed

4. **Activate drafts 061–064** as needed (grid regression, hug resize, auto-style depth, label de-overlap)

5. **Optional:** 047 patch lane → display-list DOM

### Overnight queue status 2026-06-29

`pwsh -NoLogo -NoProfile -File ..\agent-workflow-kit\agent-loop.ps1 -Workflow SpecKit -RepoRoot . -DryRun`
reports exactly one queued item: spec 065 T000. That task requires a pre-fix
`baseline-fail.json`, but implementation already happened and the real-gesture
harness now passes. Do not run `/overnight` against 065 again unless the
authority explicitly waives or replaces T000; otherwise the scheduler will keep
trying to produce an impossible historical artifact.

### Verification matrix (required before “done”)

| Gesture | URL | Assert |
|---------|-----|--------|
| Engine tab | `juju-bootstrap-machines-process`, `mongo-octavia-ha` | `data-layout-engine` === tab; layout changes |
| Direction | `tiered-network-architecture` | Inspector dropdown; arrows follow nodes |
| ELK resize | any `elk-layered` | No relayout failed |
| Box type | `support-engineering-flow` | Appearance only, no relayout |
| Chrome | v3 vs ELK | Grid/ELK sections + inspector fields hidden when N/A |

### Key files

`app-layout-bridge-runtime.ts`, `app-relayout.ts`, `app-live-resize.ts`,
`app-fresh-render.ts`, `preview-arrow-reroute-invalidation.ts`,
`preview-engine-workspace-chrome.ts`, `preview-ui-context.ts`,
`app-shell-panels.ts`, `app-grid-editor-install-unit.ts`,
`inspector-autolayout-panel.ts`, `inspector-autolayout-options.ts`

### Anti-patterns

Closing specs while INBOX URLs fail; `skipModelUpdate` in mutation proofs; disabling
when author asked to hide; folding 063/064 into 057/060.

### Closeout

Clear [`INBOX.md`](INBOX.md) only when every INBOX URL passes matrix + evidence JSON
exists under active spec `evidence/` folders.

---

## Author INBOX → spec map (open rows)

Full table: [`docs/spec-reviews/inbox-triage.md`](docs/spec-reviews/inbox-triage.md).

| Theme | Spec | Status |
|-------|------|--------|
| Engine tabs / chrome / padding | 060 | Engine-tab URLs reverified; unrelated chrome copy/padding rows remain tracked below |
| ELK compound / mongo | 057 | Browser evidence reverified; arrow label stack remains 064 |
| Direction + arrows | 065 + 060 | Real-gesture evidence committed 2026-06-29 |
| ELK resize failed | 065 + 048 | Resolved by real pointer-drag evidence 2026-06-29 |
| Hide N/A UI (inspector!) | 051 | Closeout Ready; live evidence committed 2026-06-29 |
| Box type relayout | 057 | Real-gesture evidence committed 2026-06-29 |
| Arrow label stack | **064** candidate | Not drafted |
| Style / sequence | 059 + 058 | Re-verify URLs |
| Hug parent→child | **062** candidate | Not drafted |
| Auto-style by depth | **063** candidate | **Critical, not drafted** |
| Lost grid overlay | **061** candidate | Not drafted |
| Graph layout option surfacing + parameter pane | **066** | **Draft** — P0 closed on branch; see **066-P1/P2** before closeout |

Undrafted candidates in `docs/specs.md` are **not tracked work** until
`specs/06x-*/` packages exist.

---

## ACTIVE — Spec 066 closeout gaps (re-audit 2026-06-29)

**Branch:** `feat/066-graph-engine-layout-option-surfacing`  
**Spec:** [`specs/066-graph-engine-layout-option-surfacing/spec.md`](specs/066-graph-engine-layout-option-surfacing/spec.md)  
**Folded architecture:** spec 067 parameter-pane work is on this branch (not a separate branch).

**Verdict:** GPT closed the earlier **P0** blockers on branch since the first adversarial pass. **Do not mark Closeout Ready** until **066-P1-5** and the remaining P1/P2 hygiene items below are closed or explicitly deferred in `tasks.md`.

### Closed since first review (do not re-litigate)

| Was | Evidence on branch |
|-----|-------------------|
| **066-P0-1 / T023** | Radial relabeled to `Radial spacing` in `elk-algorithm-param-registry.ts`; geometry proof in `elk-algorithm.test.ts` (`treats radial spacing as a graph-wide separation control…`). |
| **066-P0-2 / T024** | `frame-diagram.test.ts` — `persist→reload round-trip: graph-engine namespaces survive frame yaml reload` exercises `loadFrameYaml` for `meta.dagre` + `meta.elk`. Session seed covered separately in `app-grid-editor-runtime.test.ts`. |
| **066-P1-2** | `readPreviewPersistedLayoutOverrides` routes through `resolveActiveLayoutOperatorManifest` + `collectNamespacedLayoutOperatorOverrides`; force-bucket strips layered keys in `preview-override-model.test.ts`. |
| **066-P2-3** | `spec.md` scope summary now lists Rectpacking in scope. |
| **T022 (partial)** | Measurable layout tests in `elk-force.test.ts`, `elk-algorithm.test.ts` (stress, mrtree, radial). |

### P1 — still open before closeout

| ID | Area | Problem | Fix direction |
|----|------|---------|---------------|
| **066-P1-1** | T022 `[ ]` | Rectpacking (and not every surfaced control individually) still lacks measurable layout proof — only option-map forward + adapter smoke in `elk-algorithm.test.ts`. | One rectpacking geometry assertion **or** document per-control exceptions in inventory; check T022 when done. |
| **066-P1-3** | `layoutOverrides` alias | `writeLayoutOperatorOverrideState` still mirrors active bucket into flat `layoutOverrides`. Direct writes can desync `layoutOperatorOverrides`. | Single write API; stop direct flat mutation in product paths. |
| **066-P1-4** | `app-layout-bridge-runtime.ts` | When `manifest` is null, fallback still flat-merges `fromYaml` + session (~998–1003). | Route through resolver or delete dead path for graph engines. |
| **066-P1-5** | Engine tab switch | `installActivePreviewEngineRuntime` activates buckets on commit, but **no** integration test that force→layered leaves relayout clean (SC-011). | Workspace-switch regression beyond `layout-operator-overrides.test.ts`. |

### P2 — hygiene (T033 still open)

| ID | Area | Problem | Fix direction |
|----|------|---------|---------------|
| **066-P2-1** | T033 `[ ]` | T032/T034 marked done; `elk-layout-controls.ts` filename remains; duplicate shim `scripts/preview/graph-layout-controls.js` still exists beside `layout-params-controls.js`. | Finish shim boundary per T033 or keep task open in closeout prose. |
| **066-P2-2** | `pruneSessionBucketForManifest` | If `visibleSpecs.length === 0`, returns bucket unpruned (`layout-operator-overrides.ts` ~353–354). | Guard empty-manifest engines explicitly. |

### Closeout bar (066)

**066-P1-5** integration test plus honest **T022** disposition (check or document rectpacking exception). **066-P1-3/4** may ship as documented follow-ups if spec prose stops claiming “sole source of truth” for buckets. **T033** should stay open until legacy shim is gone or explicitly bounded.

### Key files (066)

`packages/layout-engine/src/preview-shell/layout-operator-overrides.ts`,
`packages/layout-engine/src/preview-engine/elk-layout-controls.ts`,
`packages/layout-engine/src/preview-engine/elk-shell-controller.ts`,
`packages/layout-engine/src/preview-shell/frame-yaml-engine-layout-contract.ts`,
`packages/layout-engine/src/preview-shell/preview-override-model.ts`,
`packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts`,
`packages/layout-engine/src/preview-shell/app-grid-editor-runtime.ts`,
`apps/preview/src/persistence/frame-diagram.test.ts`

### Validation (066)

```bash
npm --prefix packages/layout-engine test
npm --prefix packages/graph-layout-elk test
npm --prefix packages/graph-layout-dagre test
npm --prefix apps/preview test
npm --prefix packages/layout-engine run build:browser
node scripts/check_no_new_python.mjs
```

---

## Residual watch (not blocking 065, but don’t forget)

- **060 P2:** Engine tab rail lacks keyboard/ARIA parity with nav tabs
  (`preview-engine-workspace-chrome.ts` vs `editor-base.js` nav tabs).
- **`docs/agent-index.md`:** `component-model.js` persistence trap called out in
  053 review — confirm trap table is current.
- **Closeout gate (repo-wide):** specs touching save/override path need
  persist→reload regression before Closeout Ready (`docs/specs.md`).

---

## Accomplished (removed from active queue)

The following are **done on `main`**; details remain in git history / spec archives:

### Spec 066 — satisfactorily implemented on `feat/066-*` (do not re-litigate)

Parameter-pane / option-surfacing slice — **landed enough to remove from active review**:

- **Inventory** — `official-option-inventory.md`; T001–T004 registry parity via `preview-engine-graph-control-inventory.test.ts`.
- **Registries** — Dagre full graph options plumbed; stress `nodeNode`/`randomSeed` removed; force/radial/mrtree/rectpacking manifests match registries; `elk.layered.nodePlacement.strategy` enum corrected (no `NETWORK_SIMPLEX` on node placement).
- **Resolver** — `layout-operator-overrides.ts` + `resolveEffectiveLayoutOperatorOverrides` wired through pane collection, fresh render, layout bridge; `onControlInput` prunes via `pruneSessionBucketForManifest` (runtime test in `preview-engine-elk-runtime.test.ts`).
- **Save validation** — ambiguous `meta.elk` cross-algorithm mixes rejected (`app-save-client.test.ts`); candidate-engine disambiguation with active `layout_engine` on save (`frame-yaml-engine-layout-contract.ts`).
- **Reload seed** — `resetOverrideState` hydrates from `readFrameYamlEngineLayoutOverridesForLayoutEngine` + `activateLayoutOperatorOverrideBucket` (`app-grid-editor-runtime.test.ts`).
- **Sidebar** — graph engines on canonical `layout-params` section; manifests/scripts updated.
- **Engine switch** — `installActivePreviewEngineRuntime` calls `activateLayoutOperatorOverrideBucket` before rerender (`app-grid-editor-install-unit.ts`).
- **Snapshot** — `layoutOperatorOverrides` in editor snapshot / restore path.
- **Phase 5** — layout-engine + apps/preview tests green on branch (spot-checked 2026-06-29).
- **T023 radial** — relabeled `Radial spacing` + star-graph geometry proof (`elk-algorithm.test.ts`).
- **T024 persist→reload** — `meta.dagre` + `meta.elk` round-trip via `loadFrameYaml` (`frame-diagram.test.ts`).
- **T022 behavioral (partial)** — force/stress/mrtree/radial measurable separation tests in `graph-layout-elk`.
- **Payload assembly** — manifest-aware `readPreviewPersistedLayoutOverrides` (`preview-override-model.test.ts`).
- **T032/T034** — unified `layout-params` pane host; Dagre + ELK through same runtime (`preview-engine-elk-runtime.test.ts`, registry tests).

- **053** — Arrow waypoint save regression; live-verified on branch (merged).
- **054** — Preview persistence TS migration; save payload single producer (merged).
- **055 / 056** — Workspace navigation + frame-override arrow invalidation (merged).
- **056 review follow-ups** — apps/preview pretest browser build; fresh-render reroute test.
- **057 review follow-ups** — Registry offer-mode / fill-carrier guards (merged).
- **Routing identity split** — `componentId` vs authored `arrow.id` (2026-06-26, on main).
- **055/056 pre-push blockers** — Background YAML churn; branches pushed and merged.

For adversarial detail on 054–060 cluster, see [`docs/spec-reviews/`](docs/spec-reviews/).

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
| **P0-1** | ELK diagram resize → **“relayout failed”** | `app-live-resize.ts`, `app-relayout.ts`, `app-layout-bridge-runtime.ts` | **065** (create) + 048 |
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
| 048 | ELK live resize | **Relayout failed** on resize |
| 047 | Render IR done | Export+fresh yes; **bridge patch lanes** still parallel |

### Recommended execution order

1. **Create `specs/065-interactive-relayout-contract/`** on `feat/065-...`
   - `PreviewRenderIntent` — single commit before render/relayout/panel sync
   - Fix ELK resize null path; fix `formatPreviewRelayoutStatusMessage` for `elk-failure`
   - Direction flip: invalidate arrows on page direction; prove via **inspector** `<select>`
   - Playwright `evidence/post-load-mutations.ts` (tiered-network + ELK resize)

2. **Finish 060 + 057** — engine tabs, mongo layout, box-type-no-relayout, **064** arrow label stack

3. **051 completed 2026-06-29** — engine-aware inspector omits N/A HTML; panel sync uses 065 intent resolver; Playwright probe + screenshots committed

4. **Activate drafts 061–064** as needed (grid regression, hug resize, auto-style depth, label de-overlap)

5. **Optional:** 047 patch lane → display-list DOM

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
| ELK resize failed | 065 + 048 | **P0 open** |
| Hide N/A UI (inspector!) | 051 | Closeout Ready; live evidence committed 2026-06-29 |
| Box type relayout | 057 | Real-gesture evidence committed 2026-06-29 |
| Arrow label stack | **064** candidate | Not drafted |
| Style / sequence | 059 + 058 | Re-verify URLs |
| Hug parent→child | **062** candidate | Not drafted |
| Auto-style by depth | **063** candidate | **Critical, not drafted** |
| Lost grid overlay | **061** candidate | Not drafted |

Undrafted candidates in `docs/specs.md` are **not tracked work** until
`specs/06x-*/` packages exist.

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

- **053** — Arrow waypoint save regression; live-verified on branch (merged).
- **054** — Preview persistence TS migration; save payload single producer (merged).
- **055 / 056** — Workspace navigation + frame-override arrow invalidation (merged).
- **056 review follow-ups** — apps/preview pretest browser build; fresh-render reroute test.
- **057 review follow-ups** — Registry offer-mode / fill-carrier guards (merged).
- **Routing identity split** — `componentId` vs authored `arrow.id` (2026-06-26, on main).
- **055/056 pre-push blockers** — Background YAML churn; branches pushed and merged.

For adversarial detail on 054–060 cluster, see [`docs/spec-reviews/`](docs/spec-reviews/).

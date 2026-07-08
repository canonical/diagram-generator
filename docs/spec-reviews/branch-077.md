# Adversarial review — spec 077 YAML frame → draw.io export

**Branch:** `feat/077-yaml-drawio-export` (uncommitted worktree)
**Reviewed:** 2026-07-07
**Scope:** TypeScript exporter `packages/layout-engine/src/drawio/*`, CLI `scripts/export-frame-drawio.mjs`, tests, 3 `ai-infra-*` fixtures.

## Verdict: no-merge — changes required

The exporter runs, the targeted suite is green, and the Python ratchet holds. But the implementation forks the render pipeline instead of reusing it, and that fork already produces geometry that does not match the SVG lane on every one of the three fixtures. Two of the four blockers are provable from the fixtures alone (all use `padding: 24`; one declares `layout_engine: elk-layered`). The test suite is structural-string-only and passes even while these defects are present, so green here is not evidence of correctness. Manual open-in-draw.io (T021) is the only gate that would have caught them, and it is unchecked.

Fix the display-list reuse (Blocker 1) and the layout-engine dispatch (Blocker 4) before re-review; the other findings mostly dissolve once the exporter consumes the shared render IR.

---

## Blockers

### B1 — wrong owner: bypasses the render-adapter / display-list contract (questions 1, 2)

The SVG lane is `emitFrameDiagramDisplayList` (`render-adapter/display-list.ts`) → `renderDisplayListToSvg` (`render-adapter/svg.ts`). The display list is the device-independent render IR (`render-ir.ts`: rect / text-block / line / path / svg-fragment / group). SVG is one adapter over it.

A second output format should be a **second adapter over the same display list** — e.g. `render-adapter/drawio.ts` consuming `emitFrameDiagramDisplayList(...)`. Instead `src/drawio/export-frame-drawio.ts` re-walks the frame tree, calls `resolveFrameRenderPlan` itself, and re-derives label/icon geometry with its own constants. That is a parallel renderer, and it has already drifted (B2, B3). `src/drawio/` is also the wrong directory: it sits beside `frame-model`/`layout` rather than under `render-adapter/` next to the display-list and svg adapters it duplicates.

This does not violate the spec 046 ratchet (no new `scripts/preview/*.js`, no preview-shell/editor growth) — it is pure product-path TypeScript — but it violates the render-contract single-owner intent that spec 046 was protecting.

**Required:** re-home as `render-adapter/drawio.ts` and consume the emitted `DisplayList`. Map each `DisplayListItem` kind to an mxCell. Do not re-run `resolveFrameRenderPlan` / `resolveArrowRenderPlan` in the exporter.

### B2 — in-box content is universally mis-placed (padding ignored) (question 2)

`emitFrameCells` positions labels and icons with a hard-coded `INSET` (= 8) relative to the container cell:

```ts
const labelOffsetX = containerId ? INSET : ...
const labelOffsetY = containerId ? INSET : ...
// icon:
const iconX = containerId ? plan.box.width - INSET - ICON_SIZE : ...
```

The render plan (and therefore SVG) places text at `placedX + paddingLeft` / `placedY + paddingTop` and the icon at `placedW - paddingRight - ICON_SIZE`. **All three fixtures author `padding: 24`.** So every in-box label and icon is shifted 16px left / up versus SVG, on every box, on every fixture. This is not an edge case — it is the common path.

**Required:** derive the container-relative offset from the plan geometry (`block.lines[0].x - plan.box.x`, `block.lines[0]`-baseline − `plan.box.y`, `plan.icon.x - plan.box.x`), or emit at absolute coordinates on parent `1` like the boxes are. Do not reuse `INSET` as a stand-in for authored padding.

### B3 — multiple text blocks in one frame overlap

The block loop uses a constant `labelOffsetY` for every block and forces each block's height to fill the box:

```ts
for (const block of plan.textBlocks) {
  ... y: labelOffsetY ...   // same Y for every block
  height: Math.max(textBlockHeight(...), plan.box.height - INSET * 2)
}
```

The render plan stacks blocks at an accumulating `top` (line steps + inter-block gap). Any frame that owns more than one text block — a synthesized `heading` plus a body/tagline block, title + subtitle — renders all blocks stacked at the same Y in draw.io, i.e. overlapping. Single-block leaves (e.g. `["Network","assurance"]`, one block, two `<br>` lines) are unaffected, which is why the tests do not notice.

**Required:** honour per-block Y from the plan; do not clamp block height to the box.

### B4 — `meta.layout_engine` is silently ignored; ELK fixture exported as v3 (questions 4, 7)

Both the CLI and the test call `layoutFrameTree(...)` unconditionally. `ai-infra-production-contract.yaml` declares `layout_engine: elk-layered` with a full `elk` option block and `elk_nodes`. It is therefore laid out with the v3 grid engine, not ELK — the 16 edges are re-routed by the fallback orthogonal router over the wrong node positions. The output opens, but it is the wrong diagram.

The plan text says "compile author-v1 YAML → v3 layout (respect `meta.layout_engine` where the batch path supports it)"; the code respects it nowhere. The v1 non-goal ("full fidelity parity with SVG preview for ELK-heavy diagrams") covers *fidelity gaps*, not *dispatching the wrong engine on a fixture the spec itself ships and tests*. As written this is a false-closeout risk: T020 and SC-003 both "pass" on a mis-laid diagram.

**Required (pick one, and document it):**
- honour `meta.layout_engine` (route ELK fixtures through the same engine dispatch the preview/SVG path uses), **or**
- drop `ai-infra-production-contract` from the v1 fixture set, assert in the exporter that non-v3 `layout_engine` is rejected/warned, and state the v3-only limitation explicitly in `spec.md` non-goals and the `docs/specs.md` entry.

---

## Major

### M1 — routed-arrow fidelity is unverified and lossy (question 4)

Beyond B4's wrong-engine bounds:
- `arrow.elkLabels` are dropped. The display-list lane emits them; the exporter only reads `plan.label`. ELK-routed edge labels vanish.
- Two telecom arrows share the same source/target (`whitebox_switches → ruggedized_storage`, "InfiniBand fabric" / "Fiber transport"). With fixed `exitX/exitY` + `entryX/entryY` plus source/target cells, draw.io will collapse both onto one connection line — the two parallel labelled edges overlap.
- `plan.shaftPoints` are already head-shortened, so `targetPoint` stops short of the box edge while draw.io draws its own `endArrow` — the endpoint handling is doubled/ambiguous. This is exactly what T021 exists to catch, and T021 is not done.

The tests only assert the label strings appear and `edge="1"` count ≥ 3. That proves presence, not routing.

### M2 — overlays are dropped

`emitFrameDiagramDisplayList` emits overlay groups from `diagram.overlays` (dashed bounding box + label). The exporter never reads `diagram.overlays`. Any fixture using overlays loses them silently. (None of the three current fixtures use overlays, so it is latent — but it is another symptom of not reusing the display list.)

### M3 — test quality: structural-string only (question 8)

The six tests assert `toContain("<mxfile")`, vertex/edge counts, a few label substrings, and `frameCellIds` keys. None assert geometry, so B2/B3/B4 all pass through green. There is no golden and no structural diff. "6/6 pass" is not merge evidence here.

**Require before merge:** a normalized golden `.drawio` per fixture (stable id numbering, sorted/pretty-printed) checked into the spec package, plus at least one positional assertion (a known leaf's label cell resolves to `paddingLeft`, not `INSET`) and one negative assertion (non-v3 `layout_engine` is handled explicitly). Golden output must be re-emittable via an `--update`-style script so review can diff intent.

---

## Minor / notes

- **Stroke width hard-coded to 1.** `rectStyleProps` always emits `strokeWidth=1`; the plan carries `effectiveResolvedStrokeWidth`. Frames with 2px strokes drift. (question 3)
- **Icon silently dropped when markup missing.** SVG draws a faint placeholder rect; the exporter emits no cell. Divergent failure mode. (question 5)
- **Style presets are faithful.** `style-presets.ts` matches `drawio_style_presets.py` field-for-field (rect/label/image/edge), `FONT_SOURCE` identical, `ARROW_COLOR` `#E95420` == `shared.ORANGE`. XML value escaping is correct: rich HTML (`<b>`, `<br>`, `<span>`) is entity-escaped in the `value` attribute, which is what draw.io `html=1` expects. No style-contract blocker. The Python `line_style_props` (`shape=line`) preset is unported, but the exporter emits separators as thin black rects (matching `divider-line`), so that is fine. (question 3)
- **Icons: `data:image/svg+xml` with `encodeURIComponent` is correct** and matches the inline approach; no base64 needed. No new path-traversal surface — icon names come from authored YAML through the same `createFsIconLoader(ICONS_DIR)` the SVG lane uses; markup is pre-loaded, not path-joined from untrusted input in the exporter. Low risk, inherited. (question 5)
- **Full battery not run (SC-001 not met).** Only `-- export-frame-drawio` ran. `index.ts` now re-exports the drawio module from the public barrel; run the full `npm --prefix packages/layout-engine test`, the browser-bundle-fresh check, and the preview-shell size budgets before closeout (barrel export can pull bytes into the browser bundle). The new export was also not added to `public-api-contract.ts` — add it or keep it out of the barrel. (question 6)
- **Fixtures duplicated.** They exist in both `scripts/diagrams/frames/ai-infra-*.yaml` (tracked source of truth, read by tests via `FRAMES_DIR`) and `diagrams/1.input/ai-infra/` (untracked, `diagrams/` is cursorignored). Commit the `scripts/diagrams/frames` copies on this branch (tests depend on them); drop the redundant `diagrams/1.input/ai-infra/` copy or gitignore it. Do not rely on a cursorignored path for a committed test dependency. (question 9)
- **Catalog / 076.** The `docs/specs.md` 077 row is accurate. No file conflict with 076, but 076 is `REOPENED` and active on `main`; keep one active spec per branch (AGENTS rule) and rebase 077 onto current `main` before merge so the reopened-076 state is present. (question 10)

---

## Rewritten `tasks.md` gates

Replace Phase 3 closeout with:

```
## Phase 2b: Reuse the render contract (was: parallel walker)

- [ ] T014 Re-home exporter as packages/layout-engine/src/render-adapter/drawio.ts;
       consume emitFrameDiagramDisplayList(diagram, result, adapter) and map each
       DisplayListItem kind (rect/text-block/line/path/svg-fragment/group) to mxCells.
       Do NOT call resolveFrameRenderPlan/resolveArrowRenderPlan in the exporter.
- [ ] T015 Honour authored padding: in-box label/icon offsets derive from display-list
       geometry, not the fixed INSET constant. (Blocker B2)
- [ ] T016 Stack multiple text blocks at their plan Y; do not clamp block height to box. (B3)
- [ ] T017 Emit overlay groups from diagram.overlays. (M2)
- [ ] T018 Preserve elkLabels and per-edge geometry; verify parallel same-endpoint
       edges stay distinct. (M1)
- [ ] T019 Carry plan.box.strokeWidth; render icon-missing placeholder or document drop. (minor)

## Phase 3: Layout dispatch + closeout

- [ ] T023 Honour meta.layout_engine (route elk-layered fixtures through the shared engine
       dispatch), OR reject non-v3 layout_engine with a documented v3-only limitation and
       remove ai-infra-production-contract from v1 fixtures. (Blocker B4)
- [ ] T020 (rewrite) Golden .drawio per fixture in the spec package, normalized id/format,
       re-emittable via script; add >=1 positional assertion (leaf label at paddingLeft, not
       INSET) and >=1 non-v3 layout_engine assertion. String-contains counts are not sufficient.
- [ ] T021 Manual open-in-draw.io for all three slugs; attach screenshots or a signed note to
       the spec package. Closeout MUST NOT claim SC-003 while T021 is unchecked.
- [ ] T022 (expand) Run FULL npm --prefix packages/layout-engine test + browser-bundle-fresh
       check + preview-shell size budgets + check_no_new_python. Record all four.
- [ ] T024 Commit scripts/diagrams/frames/ai-infra-*.yaml; drop/gitignore diagrams/1.input copy.
- [ ] T025 Rebase onto current main (post reopened-076); confirm docs/specs.md row and add
       exportFrameDiagramToDrawio to public-api-contract.ts or keep it off the barrel.
```

## Out-of-scope confirmation (not regressed)

Python batch exporters, preview UI export button, ELK batch path, `drawio_review_workflow` / `style_sync` are all untouched. `check_no_new_python.mjs` passes. No spec 046 preview-shell regression.

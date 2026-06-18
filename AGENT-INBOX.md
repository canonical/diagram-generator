# Agent inbox

Machine-generated handoffs and diagnostics go here.

Durable follow-up belongs in `TODO.md`, [`AGENTS.md`](AGENTS.md#handover), or [`docs/specs.md`](docs/specs.md).

---

## Latest adversarial review follow-up (2026-06-18)

**Branch:** `feat/046-editor-host-endgame`  
**Current shape after fixes:** `scripts/preview/editor.js` ~`1,702` lines; `scripts/preview/layout-bridge.js` ~`531` lines.

### Resolved

1. `editor.js` no longer owns the large inline runtime-set or relayout-runtime callback bags that were still called out in the review. Those now enter typed owners through:
   - `previewShell.bootstrap.createPreviewEditorRuntimeSetFromRuntime(...)`
   - `previewBridge.relayout.createPreviewRelayoutRuntimeFromRuntime(...)`
   `loadSVG()` and the bootstrap tail were already owner-driven through `app-load.ts` / `app-bootstrap.ts`, so future engine onboarding no longer starts by widening `editor.js`.

2. `layout-bridge.js` no longer keeps ELK-only relayout branching as a bridge-local sink:
   - `_isElkLayeredDiagramJson`
   - `_resolveElkOptionOverrides`
   - `performEngineRelayout` as an ELK alias
   were replaced by manifest/capability-driven engine relayout resolution plus typed runtime ownership.

3. The shell-controller init/fallback seam is no longer ELK-shaped by default. `PreviewEngineShellController` now prefers generic `getLayoutOverrides` / `setLayoutOverrides`, and the generic fallback is no longer built from an ELK-specific fallback first.

4. The onboarding proof wording was narrowed to the honest state:
   - real browser-script adapter proof exists for ELK via `scripts/preview/elk-controller.js`
   - ported-family and bespoke cases remain representative shell-seam proofs, not claims that Mermaid/D2 lanes are fully launched

5. Validation and smoke checks are green again:
   - `npm --prefix packages/layout-engine run build`
   - `npm --prefix packages/layout-engine run build:browser`
   - `npm --prefix packages/layout-engine test`
   - `npm --prefix apps/preview test`
   - `node scripts/check_no_new_python.mjs`
   - live smoke: `http://127.0.0.1:8100/view/v3:complex-routing-usecase` rendered successfully, with frame selection updating the inspector and no console/page errors

### Discussion / clarified disagreement

- The review’s proposed “bundle-only render path” change for `loadSVG()` / `_rerenderStageFromModel()` was incorrect in practice.
- Those top-level editor paths need the host fresh-render wrapper because it supplies live bridge state (`previewDocumentJson` / `frameTreeJson`) through `layout-bridge.js`.
- Forcing the raw bundle `renderFreshPreviewSvg(...)` into those call sites brings the demo down with `renderFreshPreviewSvg: frameTreeJson is unavailable`.
- The correct recurrence fix is narrower and is already in place:
  - `layout-bridge.js` internal fresh-render/runtime paths use the bundle render contract directly
  - top-level editor load/rerender paths continue to use the host wrapper contract

### Moved to follow-up backlog

- Barrel/browser-entry cold-start size remains spec `044` T060 work.
- Remaining VM-harness cost remains spec `044` T061 work.
- Residual wrapper cleanup in `editor.js` is no longer an engine-onboarding defect for spec `046`; it is cleanup work, not a reason to widen the JS shell for new engines.

No open code-state defects remain from this review.

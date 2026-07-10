# Tasks: Spec 078 Figma autolayout plugin

**Input**: `specs/078-figma-autolayout-plugin/spec.md`
**Plan**: `specs/078-figma-autolayout-plugin/plan.md`
**Branch**: `feat/078-figma-autolayout-plugin`

## Phase 1: Spec package

- [x] T001 Create spec package, checklist, and `docs/specs.md` catalog entry.

## Phase 2: US1 canonical leaf proof

- [x] T010 Add `apps/figma-plugin/` with a development manifest, plugin runtime,
      UI, and README.
- [x] T011 Add localhost development serving for sample payload data and icon
      assets.
- [x] T012 Implement native Figma auto-layout import for one canonical leaf node
      with stable plugin-data tags and icon fetch from localhost.
- [x] T013 Add a root npm script for the plugin dev server and validate the
      localhost payload contract.

## Phase 3: Widen to real diagram payloads

- [x] T020 Serve frame-diagram payloads by slug from `scripts/diagrams/frames/*.yaml`.
- [x] T021 Add a generic nested import path and test against
      `ai-infra-telecom-services-stack`.

## Phase 4: Payload and importer hardening

- [x] T030 Add a layout-engine `dist` freshness guard to plugin `serve` / `test`
      so local Figma payloads do not silently drift behind `src`.
- [x] T031 Route headed-container reconstruction through layout-engine-owned
      synthetic heading/body helpers and cover that path with focused tests.
- [x] T032 Preserve authored sizing and absolute-position metadata in the
      frame-diagram payload and nested Figma builder for non-root nodes.
- [x] T033 Record MCP/Figma verification evidence for the telecom diagram,
      including remaining parity gaps if any.
- [x] T034 Inspect preview-editor autolayout controls (`sizing_w`, `sizing_h`,
      `direction`, `position`) and document how they persist into frame YAML /
      authored frame state for the importer payload.
- [x] T035 Update the importer so non-root semantic node dimensions and absolute
      positioning follow authored preview-editor/YAML autolayout semantics.
- [x] T036 Shift nested-frame sizing onto Figma's unified `layoutSizing*` path
      and stop pre-sizing non-`FIXED` axes before parent attachment.
- [x] T037 Add runtime diagnostics and a stricter fake-node contract so rejected
      Figma sizing assignments become visible in tests and live imports.

## Phase 4b: 2026-07-10 client-side autolayout review follow-up (superseded by ROUND 3)

- [x] T038 Treat the 2026-07-10 review as the active root-cause note:
      payload/YAML was initially treated as not the bug; ROUND 3 later
      superseded this diagnosis and identified raw payload sizing as the
      decisive root cause.
- [x] T039 Fix parent-axis sizing order for nested auto-layout frames so a child
      never requests `FILL` on an axis whose parent still hugs that axis.
      The cold-start target functions are `applyFrameOwnSizing`,
      `resizeFrameForFixedAxes`, `appendAutoLayoutChild`, and the headed/root
      container assembly paths in `buildContainerNode`.
- [x] T040 Stop skipping `FILL` in frame-own sizing, restore the necessary
      parent `primaryAxisSizingMode` / `counterAxisSizingMode` state before
      children are sized, and avoid clobbering the non-fixed axis during
      `resizeWithoutConstraints`.
- [x] T041 Surface rejected sizing assignments instead of swallowing them:
      keep readback warnings (`wanted X/Y, got ...`) and make one real Figma
      rerun identify the exact nodes where Figma refuses the requested
      autolayout settings.
- [x] T042 Extend the fake Figma auto-layout model to reproduce the missing real
      rule: `FILL` must be rejected when the parent hugs that axis. Tests should
      fail on the old behavior and protect the corrected ordering.

## Phase 4c: 2026-07-10 ROUND 3 effective-sizing payload fix

- [x] T043 Capture `layoutFrameTree(...).coerced` in the Figma payload server and
      thread it through `serializeDiagramNode`.
- [x] T044 Serialize effective Figma sizing instead of raw authored sizing:
      layout-engine primary-axis coercions become `FIXED` at measured size, the
      root is fixed to measured outer geometry, and synthetic body frames carry
      measured body dimensions.
- [x] T045 Downgrade Figma-illegal cross-axis `FILL` under a `HUG` parent to
      `FIXED` at placed size in the payload.
- [x] T046 Add an in-repo regression asserting the
      `ai-infra-telecom-services-stack` payload contains no `FILL` child under a
      `HUG` parent on either axis.
- [x] T047 Add a Figma-client readback validator so successful diagram import
      means every semantic node and generated body frame reports the same
      `layoutSizingHorizontal` / `layoutSizingVertical` values as the effective
      payload. Illegal or rejected sizing now fails import instead of being
      silently coerced client-side.
- [x] T048 Remove the leftover client-side parent-axis coercion path from the
      Figma builder; the payload is now the single source for effective sizing.
- [x] T049 Re-run the telecom import in the linked Figma file with the
      effective-sizing payload and record the actual sizing dropdowns.

## Phase 5: Manual validation + closeout

- [x] T050 Verify both import paths in the linked Figma Design test file:
      canonical leaf and telecom diagram.
- [x] T051 Inspect representative telecom nodes after a real import and record
      the actual Figma sizing dropdown values for at least `services_layer`,
      `ai_workflows`, `compute_nodes`, and `whitebox_switches`.
- [x] T052 Add focused regression coverage for payload shape and builder
      invariants that protect against missing-box regressions.
- [x] T053 Record the final validation result or known gaps in this spec
      package before closeout.

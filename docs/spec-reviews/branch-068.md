# Branch 068 Adversarial Review

**Branch**: `feat/068-internal-dual-path-deletion`  
**Date**: 2026-06-30

## Findings

- **ADV-001 - Fixed**: `isElkLayeredDiagram` and `applyElkLayoutOverrides`
  fallbacks survived outside the original inventory. Removed the generic-pane
  and preview-shell fallbacks and moved affected tests to canonical
  engine-layout APIs.
- **ADV-002 - Fixed**: `performElkRelayout` remained as a repo-owned alias for
  the generic relayout path. Removed the alias from the runtime/bridge surfaces
  and migrated tests to `performEngineRelayout`.
- **ADV-003 - Fixed**: `getPreviewElkEngineContract` mirrored the deleted
  browser global as an internal accessor name. Renamed the remaining internal
  access point to the raw-view/debug-specific owner.
- **ADV-004 - Fixed**: full `npm --prefix packages/layout-engine test`
  initially failed because the layered regression test inherited radial ELK
  keys from the dirty `scripts/diagrams/frames/example-deployment-pipeline.yaml`
  fixture. The test now makes its target engine explicit and clears inherited
  ELK option metadata before invoking the direct layered layout API; the full
  layout-engine suite passes with the user's YAML unchanged.
- **ADV-005 - Deferred to spec 060**: user reports that clicking
  `ELK layered layout` can be visually no-op. This is not a 068 dual-path
  deletion finding. Spec 060 now records the follow-up requirement to prove
  active engine identity, active option bucket, and geometry before deciding
  whether a no-op is a rerender bug or legitimate equivalent geometry.
- **ADV-006 - Fixed**: the first adversarial pass found that
  `layout-params-controls.ts` still accepted old ELK-root param access as a
  fallback when the active manifest was unavailable. Removed the
  `previewEngines.elk.ELK_LAYERED_PARAM_SPECS`, root
  `ELK_LAYERED_PARAM_SPECS`, `previewEngines.elk.elkParamGroups`, and root
  `elkParamGroups` rescue paths from the generic layout-params pane. Focused
  tests and full validation pass after the deletion.

## Verdict

No open code findings remain from the adversarial review. The required
validation gates pass; the remaining visible-tab-change concern is tracked as a
spec 060 follow-up, not a 068 blocker. The working tree still contains the
user's dirty `example-deployment-pipeline.yaml` authoring experiment, which
should stay out of the 068 merge unless explicitly requested.

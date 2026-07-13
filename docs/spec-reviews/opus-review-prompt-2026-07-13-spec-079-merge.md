# Opus adversarial merge-review prompt — Spec 079

Review the complete branch `feat/079-figma-component-variant-import` against
`main` (merge base `d677b689e91feea22f8511de07a012110e4ae628`). This is a
pre-merge adversarial review: identify only substantiated merge blockers and
regressions, not speculative alternatives or restatements of superseded review
findings.

Write the review itself to:

`docs/spec-reviews/opus-adversarial-review-2026-07-13-spec-079-merge.md`

Do not overwrite this prompt, edit product code, alter tests, or modify the
spec package. Start the review with one of: **Merge ready**, **Merge with
follow-ups**, or **Do not merge**. For every finding, include severity, exact
file/line evidence, user-visible impact, and the smallest safe remediation.
State explicitly when no P0/P1 finding is present.

## Required audit areas

1. Figma-native mutation boundaries
   - Every semantic Section, Panel, and leaf should remain a live `box`
     instance from the user-authored component set.
   - Only real `SLOT` nodes may receive structural edits. There must be no
     detach fallback, ordinary instance-sublayer traversal, or structural edit
     of `contents`, text wrappers, or other non-Slot instance descendants.
   - V3 `kind: container` nodes are structural rows/stacks/icon-label groups;
     they must be raw generated auto-layout frames, not `Role=Parent`
     instances. Check the implementation and tests for both halves of this
     boundary.

2. Slot lifecycle and refresh safety
   - Content slots must replace importer-owned content with exactly one body
     frame per semantic parent/section; reruns must not create wrapper or
     instance duplication.
   - Verify master-slot to live-instance addressing, `limitViolations` checks,
     icon slot clearing/replacement, and the opacity policy for post-insert
     Figma descendants. Ensure the opacity policy does not mask an unknown
     node or a failed insertion.

3. V3 sizing fidelity
   - The payload produced by `apps/figma-plugin/src/dev-server.ts` is the
     effective V3 contract. Default vertical sizing is Hug unless YAML/V3 has
     explicitly resolved a different effective mode.
   - Reparenting may reset Figma geometry: only effective `FIXED` axes should
     be restored after final auto-layout insertion. Hug must remain
     content-driven and Fill must remain an auto-layout behavior.
   - Inspect the fixture YAML changes as part of the branch; verify they are
     intentional V3 authoring changes rather than workaround geometry.
   - Investigate the supplied live-Figma reproduction: `regional_row1` hugs
     its three vertical leaf children correctly, but it is nested inside
     `regional_edge/body`, whose height is fixed too small; the final child
     overflows the Regional edge panel. Trace the full ownership chain rather
     than treating the immediate child as the defect:
     `regional_edge` live instance → `contents` SlotNode → importer-owned
     `regional_edge/body` → raw `regional_row1` frame → leaf instances.
     In particular, audit the two-frame structural pattern used for each
     semantic container (vertical header/content stack, then the directed
     body row/column). Determine, with exact payload values and code paths,
     whether the wrong fixed height originates in the V3 synthetic body,
     `resolveEffectiveSizing`/coercion, component-instance sizing, or
     post-append fixed-axis restoration. It is not sufficient to recommend
     setting the child to fixed or masking overflow: the desired outcome is
     correct Hug/Fill propagation across both wrappers, so all contents fit
     without an unnecessary fixed-height ancestor. Require a regression that
     asserts the Regional edge chain's effective sizing and no overflow.

4. Component contract and icon ownership
   - Text properties are preferred, with the narrowly targeted master-text-id
     override as the no-detach fallback.
   - Helper/default-icon policy must not leave visible placeholder content.
   - Icon sources must remain copied local Figma components/instances or
     explicitly cloneable local SVG-named assets; no silent raw-SVG fallback in
     component mode.

5. Tests, docs, and merge hygiene
   - Review fake-Figma fidelity around SlotNode versus ordinary instance
     sublayers, ID re-keying/opacity, reparented fixed geometry, and structural
     wrapper coverage.
   - Confirm the spec/runbook accurately describes the implementation and that
     stale review/screenshot evidence is not being carried into the merge.
   - Report the test/build commands you ran or were unable to run. Treat the
     remaining real-Figma visual verification gate as a release follow-up only
     if the branch has adequate in-repo protection and does not claim it passed.

## Evidence targets

- `apps/figma-plugin/src/code.ts`
- `apps/figma-plugin/src/code.test.ts`
- `apps/figma-plugin/src/dev-server.ts`
- `diagrams/1.input/ai-infra-telecom-services-stack.yaml`
- `specs/079-figma-component-variant-import/`
- `AGENT-INBOX.md`

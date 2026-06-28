# Review: spec 058 — Layer tree and inspector selection ergonomics

**Branch:** `feat/058-layer-tree-inspector-selection-ergonomics`
**Claimed status:** In Progress; one commit `9f49641` "restore tree and variant
ergonomics" touching `app-shell-panels.ts`, `frame-style.ts`, and two tests.
**Real status:** closeout-ready after follow-up. The variant fix is now proved
against the exact `test-deep-nesting` fixture, and the keyboard contract has a
real browser-DOM evidence script instead of handler-object proof only.

This branch is the **least entangled** with the engine-switch root cause, so it
is safe to finish independently. It does **not** depend on 060.

## INBOX #15 — `unknown` variant on child-box selection

`9f49641` touched `frame-style.ts` and added `inspector-single-options.test.ts`
coverage. Two things to verify before closeout:

1. The fix must resolve the **effective** variant (child/parent/section/highlight)
   for a box that has no explicit authored variant, by inferring from
   authored/runtime state — FR-003/FR-004. Confirm the test seeds a box with *no*
   explicit variant and still gets a concrete value, not just a box that already
   had one.
2. Re-verify on the user's fixture **`test-deep-nesting`** (INBOX line 68), which
   is where they saw "unknown variant". A passing unit test on a synthetic node is
   not the same as the deep-nesting tree resolving cleanly. Add a fixture-backed
   assertion or a recorded browser check.

Resolved: `packages/layout-engine/tests/inspector-single-options.test.ts` now
loads `scripts/diagrams/frames/test-deep-nesting.yaml`, confirms `vm_2`,
`vm_3`, `disk_1`, and `disk_2` author no `variant`/`level`/`fill`/`border`,
and verifies the inspector helper resolves `default` from the rendered box
style. Browser evidence in
`specs/058-layer-tree-inspector-selection-ergonomics/evidence/layer-tree-inspector-browser-result.json`
confirms `vm_2` displays `default` with no `Unknown variant`.

Note the overlap with INBOX #16 (auto-style-by-depth, new spec 063): 058 should
*display* the effective variant correctly; it should not try to *implement* the
depth-promotion authoring rule. Keep that boundary explicit so 058 doesn't expand
into 063's contract.

## INBOX #34 (line 34) — `Enter` / `Shift+Enter` layer-tree traversal

FR-001/FR-002 require typed keyboard traversal with selection/focus sync.
`app-shell-panels.ts` changes appear to address this. Risk: if the proof is a
source-string assertion (the repo has a pattern of
`editor-*-contract-consumers.test.ts` grepping source), that does not prove the
keydown handler actually moves selection. Require a real-DOM test (jsdom/happy-dom
is fine) that dispatches `Enter`/`Shift+Enter` on a focused row and asserts the
selected/focused row index changes and the stage selection model stays in sync.

Resolved: `evidence/layer-tree-inspector-browser-check.mjs` loads the built
`LayoutEngine` browser bundle into a real page, dispatches `Enter` and
`Shift+Enter` on focused tree rows, and verifies focus, roving `tabIndex`, and
selection callbacks. The same script opens `/view/v3:test-deep-nesting` and
verifies real tree selection moves `vm_2 -> vm_3 -> vm_2`.

## FR-005 — must not widen `editor.js`

Confirm the keyboard handler lives in a typed preview-shell owner
(`app-shell-panels.ts` is correct), not in `scripts/preview/editor.js`. The
spec-046 ratchet still applies.

## Closeout gate for this branch

- Real-DOM keyboard-traversal test (dispatch events, assert selection move).
- Effective-variant test that starts from a box with no explicit variant AND a
  recorded check on `test-deep-nesting`.
- No new behavior in `editor.js`.
- Standard validation trio green.

This branch can close on its own merits without README §4's engine Playwright
check, since it is not engine-render-dependent — but still record a short browser
note confirming the two interactions on a real document.

Closeout note: the browser evidence file records both interactions on the real
`test-deep-nesting` document.

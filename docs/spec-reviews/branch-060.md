# Review: spec 060 — Output pane engine tabs and live rerender

> ## RE-REVIEW 2026-06-28 (second pass, after GPT's fix)
>
> **Verdict: the root cause is now genuinely fixed — this is no longer a fake
> closeout.** I re-read the actual code, not the claims. The headline bug ("switch
> engine, nothing changes" / "v3 still shows ELK") is resolved by a real
> architectural change. The follow-up pass reverted the Juju YAML drift, split
> the tree-compatibility gate to spec 057, and kept 060's evidence focused on
> engine intent. The original first-pass review is retained beneath for history.
>
> ### What GPT actually changed (verified, not taken on faith)
> - `renderFreshPreviewSvg` (`app-fresh-render.ts`) now resolves the engine via
>   `resolveActivePreviewLayoutEngine(...)` and **stamps `data-layout-engine` on
>   the rendered root from the resolved `engineManifest`** — not echoed from the
>   requested id, so the attribute cannot lie for frame diagrams.
> - A real setter `setFrameTreeLayoutEngine` was added to the layout-bridge
>   runtime and exposed on `window`; the tab-switch path
>   (`preview-engine-workspace-chrome.ts::switchTo`) now **commits the chosen
>   engine into `state.frameTreeJson.layoutEngine` before rerender**, and throws
>   if the commit fails. This is exactly the missing link the first pass
>   identified. `__DG_CONFIG` and the render path now read one resolver.
> - I confirmed frame-diagram documents have **no** `registerPreviewDocumentSvgRenderer`,
>   so they always fall through to the real layout path where the manifest is
>   resolved — the early-return preview-document branch (which stamps from
>   `previewDocumentJson.layoutEngine`) only applies to sequence/mindmap, so the
>   attribute is honest where it matters.
>
> ### Proof quality (the part that was fake before, now real)
> - `app-fresh-render.test.ts` adds a test that loads the authored-`elk-layered`
>   `mongo-octavia-ha` fixture, sets `frameTreeJson.layoutEngine='v3'`, runs the
>   **real** `renderFreshPreviewSvg`, and asserts the root SVG resolves to `v3`.
>   This is a genuine contract test (no mocked rerender).
> - New Playwright evidence `evidence/engine-tabs-identity-check.mjs` +
>   `engine-tabs-identity-result.json` asserts **engine identity** via
>   `#stage svg[data-layout-engine]` (not svgHash) for: `mongo-octavia-ha`
>   authored-ELK→v3→elk-layered, sequence (hidden rail, 0 tabs), an authored
>   `juju-bootstrap-machines-process` engine switch, and a direction-flip arrow
>   check on `tiered-network-architecture`.
> - Validation I ran myself: `npm --prefix packages/layout-engine test` →
>   **853 passed / 146 files**; `npm --prefix apps/preview test` → **145 passed**;
>   `node scripts/check_no_new_python.mjs` → ok.
>
> ### Remaining concerns after follow-up
> 1. **Resolved before merge:** the authored Juju YAML/test-expectation drift was
>    reverted from 060; no fixture re-authoring is part of this branch.
> 2. **Resolved before merge:** the tree-compatibility gate was split out for
>    spec 057, where engine exposure/fidelity belongs.
> 3. **Workspace-chrome test still uses a mocked rerender callback** (pushes
>    `'rerender'`). That is now *fine* because the engine-identity contract is
>    proved separately by the real `app-fresh-render` test and Playwright — the
>    mock here only checks orchestration order. No longer a false-confidence risk.
>
> ### Re-review bottom line
> 060's core is done and provable. The source-of-truth and scope issues from the
> second-pass review were resolved before merge; the first-pass review below is
> historical.

---

**Branch:** `feat/060-output-pane-engine-tabs-rerender`
**Claimed status (first pass):** In Progress, all tasks T000–T040 checked `[x]`.
**Real status (first pass):** the headline contract (FR-003: "selecting a compatible engine
must rerender the live previewed graph") was **not met** for the fixtures the user
actually reports. This was the most important branch in the cluster.

## P0 — Engine switch does not change the rendered engine

This is the root cause behind INBOX #2 and #4. Full chain in README §1. Summary:

- `switchTo()` writes `__DG_CONFIG.layout_engine` only.
- `renderFreshPreviewSvg` reads `diagram.layoutEngine` from
  `state.frameTreeJson`, which nothing updates on switch.
- Result: on `mongo-octavia-ha` (authored `elk-layered`) and
  `support-engineering-flow` (authored `elk-force`), clicking the **v3** tab
  re-renders with the *authored* engine. "Switch to v3 still shows ELK." ✔ matches
  the user's exact words.

### Why the "evidence" is misleading

- `evidence/playwright-and-validation-2026-06-28.md` asserts `svgChanged: true`
  via `svgHash`. A byte/hash change is **not** proof the chosen engine ran. The
  test happened to switch *between two ELK-family engines* (`elk-force` →
  `dagre`) where some change is plausible — it never tests the failing case
  (authored ELK → **v3**), and never asserts the rendered layout *is* v3.
- The unit tests mock `rerenderStageFromModel` to push `'rerender'`. Green means
  "callback wired", not "engine honored".

### Required fix (typed, TS-first)

1. Make the rendered engine **observable**: in `renderFreshPreviewSvg`
   (`app-fresh-render.ts`), stamp the resolved engine id onto the root SVG, e.g.
   `svg.setAttribute('data-layout-engine', engineManifest.layoutEngineKey)`.
   This is the contract signal every test and the Playwright check will assert.
2. Make the active engine the **single source of truth the render reads**. On tab
   switch, before rerender, commit the chosen engine into the frame-tree the
   render path consumes — i.e. set `state.frameTreeJson.layoutEngine` (add a typed
   `setFrameTreeLayoutEngine` / equivalent on the layout-bridge runtime; there is
   currently none). Browser-local until Save still holds: you mutate the in-memory
   `frameTreeJson`, not the YAML.
3. Keep `__DG_CONFIG` in sync for chrome, but the render path must not depend on
   it for engine identity. Prefer one resolver
   (`resolveActivePreviewLayoutEngine`) used by both chrome and render so they
   cannot drift again.
4. Re-route the direction-flip case (INBOX #17) through the same intent commit so
   horizontal→vertical re-runs layout and reroutes arrows.

## P1 — Chrome / markup cleanup the user explicitly asked for

- Remove the stale `active-engine-label` text + stray `elk-radial` tab markup
  (INBOX #1). `viewer-unified.html:51` and the workspace chrome.
- Remove tab-button `margin-bottom`; use the baseline-foundry utility (INBOX #1).
- Remove the "Only engines compatible with this document are listed…" help
  paragraph (`viewer-unified.html:57`, INBOX #7) — tab presence is sufficient.
- Rename "Native v3 autolayout" → "Autolayout" (`builtins.ts:54`, INBOX #5).
- On switch autolayout→ELK, page padding disappears (INBOX #10) — fix the CSS so
  the output pane keeps its padding across engine kinds.

## P2 — Accessibility (carried from the existing 060 inbox review)

The new tab rail is styled like BF tabs but has no roving-tabindex keyboard nav,
no `aria-controls`/panel pairing. Either converge on the existing nav-tab
controller or document why the engine rail is click-only. Not a blocker for the
P0, but must not be closed silently.

## Closeout gate for this branch

All of README §3 plus:

- A real-`renderFreshPreviewSvg` test proving `data-layout-engine` equals the
  selected engine after a switch, on an **authored-engine** fixture.
- The Playwright self-check (README §4) committed under
  `specs/060-output-pane-engine-tabs-rerender/evidence/`, asserting engine
  identity (not hash) for: authored-ELK → v3, v3 → elk-layered, and a sequence
  doc (no dead rail).
- Direction-flip arrow reroute verified on `tiered-network-architecture`.
- Uncheck the currently-checked T020/T021/T030/T040; they were closed on
  mock/hash evidence and must be re-earned against the rewritten tasks.

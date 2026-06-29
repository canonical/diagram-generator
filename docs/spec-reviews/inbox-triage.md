# INBOX.md triage — every note mapped to an owner

Date: 2026-06-28. Source: `INBOX.md` (lines cited). This is the master checklist:
when the whole 054–060 cluster is finished, **every** row below must be resolved
and proven, or explicitly moved to a new spec. Do not empty `INBOX.md` until each
row is either Done-with-proof or has a tracked spec id.

Legend: **Owner** = spec that should resolve it. **Type** = root cause class.

| # | INBOX (line) | Note (summary) | Owner | Type | Status today |
|---|------|--------|-------|------|--------------|
| 1 | 6–10 | Remove stale `active-engine-label` "Engine: Native v3 autolayout" + stray `elk-radial` tab markup; remove tab-button `margin-bottom` (use baseline-foundry utility) | **060** | chrome/markup | open |
| 2 | 14–23 | `juju-bootstrap-machines-process`: clicking any engine tab does nothing | **060** (root cause) | engine intent not threaded to render | resolved 2026-06-29 — `engine-tabs-identity-check.ts` real tab clicks change `data-layout-engine` and bounds |
| 3 | 26–27 | Switching node placement to "network simplex" jumps to another example; arrow annotation labels stack on top of each other | **057** + new spec (label de-overlap) | ELK option apply + label placement | open; needs deep sweep |
| 4 | 30–31 | `mongo-octavia-ha`: AZ1–3 / 3×IPs listed underneath instead of beside the 3 VM boxes (broken vs original); switching to v3 still shows ELK | **057** (compound placement) + **060** (v3 tab honored) | engine intent + ELK compound fidelity | resolved for v3 tab + AZ/VM geometry 2026-06-29 by 060/057 TS evidence; remaining label/annotation stacking stays 064 |
| 5 | 31 | Rename "Native v3 autolayout" → just "Autolayout" everywhere | **060** | naming | open (`builtins.ts:54` label) |
| 6 | 35 | Lost the layout grid; hide grid affordances for now + new spec to investigate what happened to the grid | **058**/**051** hide; **NEW spec 061** investigate | regression | open for 061 investigation; 051 now hides N/A grid fields on ELK with live evidence |
| 7 | 38–39 | Remove pointless "Only engines compatible…" help text (tabs presence is enough) | **060**/**051** | chrome copy | resolved 2026-06-29 — source grep + 051 DOM proof find no live text |
| 8 | 42–44 | Remove "Show ELK debug overlay" + its code | **051** | dead control removal | resolved 2026-06-29 — source grep + 051 DOM proof find no live control |
| 9 | 46–47 | "Show ELK raw view" should only appear when engine is ELK | **051**/**060** | engine-scoped chrome | resolved 2026-06-29 — v3 absent/unfocusable, ELK visible in 051 evidence |
| 10 | 50 | Switching autolayout→ELK tab drops overall page padding (`mongo-octavia-ha`) | **060**/**059** | CSS/layout on tab switch | open |
| 11 | 53 | `service-handshake-sequence`: violates styling contract — different font sizes, wrong text offset; arrow/outside annotations smaller; need hardened single-font-size rule; cannot select elements to change box type | **059** (style SoT) + **058** (selection) | style source of truth | open (059 has no commits) |
| 12 | 56 | `support-engineering-flow`: changing box type triggers relayout (should only change appearance; box size unchanged) for all ELK layouts; UI params that don't apply (grid cols/rows/gutters/margins) should be **hidden**, not just disabled | **057** (no-relayout on style) + **051** (hide N/A controls) | relayout trigger + chrome | resolved 2026-06-29 — 057 relayout half by TS real-gesture evidence; 051 hide-N/A half by live DOM + Tab traversal evidence |
| 13 | 59 | Resizing a parent should resize hug children; default child is fixed and hug doesn't shrink to fit smaller parent (`test-alignment-grid`) | **048**/**NEW spec 062** | sizing semantics | open |
| 14 | 63–64 | Increase spacing below section-box headings by 8px (too close to child) | **059** (rhythm token) | style token | open |
| 15 | 67–68 | Some boxes still "unknown variant" on load (`test-deep-nesting`) | **058** | effective variant resolution | partially addressed on feat/058 — re-verify with deep-nesting fixture |
| 16 | 71–80 | Auto-style rules by nesting depth: 0=child, 1=parent, 2=section; promote same-level siblings to the highest level present; verify rules exist in code AND md/skill files | **NEW spec 063** (auto-style-by-depth) | authoring contract | open — needs detailed spec |
| 17 | 82 | `tiered-network-architecture`: autolayout horizontal→vertical breaks arrow placement (refactor regression; used to work) | **056 residual → 060** | direction is a layout input, not a frame override | resolved 2026-06-29 by 060/065 real inspector `selectOption` evidence with arrow endpoint perimeter assertions |

## New specs this triage demands (currently missing)

- **061 — Preview grid regression investigation** (INBOX #6). The layout grid
  affordances disappeared; hide them now, and root-cause what removed them.
- **062 — Parent/child hug resize propagation** (INBOX #13). Resizing a hug
  parent must reflow hug children; default-fixed children should be authorable to
  hug and actually shrink.
- **063 — Auto-style-by-nesting-depth contract** (INBOX #16). The most
  consequential authoring rule the user has asked for twice; needs code + skill +
  `DIAGRAM.md` alignment and tests.
- **064 — Arrow annotation label de-overlap** (INBOX #3). Stacked arrow labels
  after engine/option changes.

These are referenced from `docs/specs.md` as Draft candidates so they are not
lost. Do not fold them into 057/060 — they are distinct contracts.

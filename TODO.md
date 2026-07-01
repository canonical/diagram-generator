# TODO

## Purpose

This file is a pointer and cold-start bootstrap, not an implementation queue.
Active implementation tasks live in `specs/<id>-<slug>/tasks.md`. The canonical
active-spec index is `docs/specs.md`; if this file disagrees with it, trust
`docs/specs.md`.

**Jira:** Stream E (constrained editor) under
[DE-941](https://warthogs.atlassian.net/browse/DE-941).

---

## Next spec to tackle (priority order)

Fix the "silently broken after refactor" correctness class **before** new
engine breadth. Ordered for a cold-start agent:

1. **Spec 060 follow-up** — output-pane engine-tab switch that visually no-ops.
   Distinguish a true rerender bug from two engines producing equivalent
   geometry. See `docs/spec-reviews/branch-060.md`.
2. **Spec 062 (draft) — parent/child hug resize propagation** and
   **Spec 063 (draft) — auto-style by nesting depth.** Together these cover the
   reported "change a leaf box role (child→parent) → no visual change until a
   top-level node changes" invalidation/restyle bug.
3. **Spec 061 (draft) — grid regression investigation.**
4. **Spec 064 (draft) — arrow annotation label de-overlap.**

Only after the correctness backlog is drained, resume engine-breadth work
(the `defineGraphLayoutPreviewEngine` factory + per-engine `engines/*.engine.ts`
substrate is already in place — see Audit §2).

Other open work: pick from `docs/specs.md`, then execute from that package's
`tasks.md`.

---

## Audit findings — 2026-07-01

Full architectural audit, verified against code, git, and spec state.

### 1. Architecture health: good, well-aligned
- Clean TS-first product path: frame YAML → `packages/layout-engine` →
  `apps/preview`. Python confined to the draw.io lane, guarded by
  `check_no_new_python.mjs`. Legacy browser shell is shrinking as intended.

### 2. Scale to 50/150 engines: substrate is real
- Decentralized registry (`registerPreviewEngine`), no central engine list.
- `defineGraphLayoutPreviewEngine` factory + install-unit pattern **on main**.
- ~12 engines already registered (v3, force, sequence, mindmap-tree, dagre,
  elk-layered/radial/force/mrtree/rectpacking/stress/algorithm). Adding engine
  N+1 does not require touching `editor.js`. The 50/150 claim is credible.

### 3. Spec 046 (editor host endgame): mostly done, small drift
- `editor.js` = **316 lines** (up from 256 at closeout); `layout-bridge.js` = 77
  (thin). The growth means the 046 ratchet has no automated guard and is leaking.
- The real remaining monolith is `editor-base.js` (**587 lines**), plus
  `component-model.js` (640, persistence hotspot) and `force.js` (1,436). 046
  thinned `editor.js`; the shell decomposition is not finished, just relabeled.

### 4. Stale docs / contradictions
- **Duplicate spec number 052:** `052-layers-palette-reorder` (draft) vs
  `052-layout-engine-onboarding-port` (Closeout Ready). Renumber one.
- `AGENTS.md` handover claims `editor.js` 256 / `layout-bridge.js` 88; actual is
  316 / 77. Handover is stale.
- `docs/specs.md` marks 069 `Closeout Ready` without flagging it is unmerged.

### 5. Orphaned screenshots: culled
- Removed tracked root `image.png` and two `tmp/` debug PNGs. `.gitignore` only
  ignored `/image-*.png` (dash), not `/image.png` — tighten it.
- Spec `evidence/**` and `diagrams/3.compare/**` PNGs are legitimate; keep them.

### 6. Folder / tmp hygiene
- `tmp/` is gitignored (good) but locally bloated (~30 stray SVGs, logs, probe
  scripts, `overnight-logs/`, `elk-save-playwright*/`). Safe to purge locally.
- 20+ stale git branches; workflow says delete on merge. List merged ones with
  `git branch --merged main` (currently includes 006, 027, 029, 035, 036, 037,
  038, 051, 052-layers, 066, elk-*, arrow-*) and delete them.

### 7. "Completed" specs — superficial vs truly done
- Gap between `Closeout Ready` and merged. 047/048/052-onboarding/054–060 work
  IS on `main`. But **069 is not on main**, and the user still hits the exact
  bugs 069 targets → 069's contract is unit-green but not proven at the live
  product level, and not shipped.
- Require a real gesture → repaint check for any determinism/persistence spec
  before it may claim `Closeout Ready`.

### 8. Agent inbox
- `AGENT-INBOX.md` had a full session log instead of a focused last→next
  handoff. Trimmed. Spec ordering now lives here in TODO (read at session
  start), not in the inbox.

### Other risks
- Many `Closeout Ready` specs never had named `feat/<id>` branches, so
  `docs/specs.md` status is hard to reconcile against git. Adopt one rule:
  closeout ⇒ merged to `main` ⇒ archived, else status is `Active`.
- No automated size budget on `editor.js` / `layout-bridge.js` to hold the 046
  ratchet. Consider adding one alongside `check-browser-bundle-fresh.mjs`.

---

## Spec candidates (draft before coding)

- `editor-base.js` thinning (true 046 follow-up; 587 lines of legacy state).
- Engine breadth via the existing registration factory: state/lifecycle,
  tree/mindmap, swimlane, ER/class orthogonal, `elk-force` lane polish.
- Editor workflow: folder-backed navigation, cross-engine multi-select
  align/distribute, bulk pin/unpin.
- Frame authoring: nested children default to autolayout **fill** not fixed
  width (gap regression on fresh diagrams); root sizing/direction-change.
- Contract hardening: arrow clearance, invalid-enum diagnostics, preview JSON
  schema freshness, parser negatives, layout idempotency.
- Later backlog: ontology-driven engine selection, security hardening, arrow
  waypoint editing, `DIAGRAM.md` refinement.

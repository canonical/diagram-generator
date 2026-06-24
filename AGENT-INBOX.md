# Agent inbox

Machine-generated handoffs and diagnostics go here.

Durable follow-up belongs in `specs/<id>-<slug>/`,
[`AGENTS.md`](AGENTS.md#handover), or [`docs/specs.md`](docs/specs.md).
`TODO.md` is only a pointer to open spec packages.

---

## 2026-06-24 – spec 050 highlight-icon recovery (committed `f0463d1`)

**Status: done and verified by user in the live editor.** Committed on
`feat/050-preview-editor-recovery`. Browser bundle rebuilt; preview (114) and
layout-engine (753) suites green.

What was wrong and fixed:

- Applying the `highlight` box style left the leaf icon **black** (unreadable on
  black) and earlier showed a glow halo.
- Root cause was two stacked gaps on the **relayout (frame-managed) path**, not
  the override fast-path:
  1. `patchPreviewFrameGroup` (`preview-shell/app-frame-svg.ts`) reused the
     existing icon DOM and only repositioned it – it never applied
     `plan.icon.fill`, so the icon kept its stale black fill while box/text
     recolored correctly.
  2. `leafNaturalSize` (`src/layout.ts`) gated the icon-row height floor on
     `border !== NONE`; `highlight` sets `border: NONE`, collapsing the icon
     leaf 64→40.
- Fix: all three render paths (fresh render, override fast-path, relayout patch)
  now drive icon color through `resolvedIconFill` via the shared
  `recolorIconElementShapes` helper in `icon-markup.ts`. The old
  `filter: invert(1)` glow hack is gone. Icon-row height now reserved when the
  leaf has an icon regardless of border.

Open follow-up (optional, noted in `recovery-matrix.md`): reconcile
`VARIANT_OVERLAYS.highlight` (no border change) vs
`PREVIEW_STYLE_SEMANTICS.highlight` (`border: NONE`) so save/reload of a
highlighted box stays stable.

Branch hygiene note for next session: `feat/050-preview-editor-recovery` is
shared with a concurrent GPT agent – run `git status` before any commit and
do not sweep unrelated changes in.

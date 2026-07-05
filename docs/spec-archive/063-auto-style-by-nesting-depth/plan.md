# Plan: Spec 063 Auto-style by nesting depth

## Working theory

The intended rule already exists in several places (prose, skill, editor picker,
runtime) but it is not packaged as one enforceable contract and the copies
drift. The work is:

1. Fix the encoding: keep `level:` as `0=wrapper, 1=child, 2=parent, 3=section`;
   annotation + highlight are modifiers off the axis.
2. Express sibling-promotion as an **authoring-time** rule (a typed helper /
   validator), not an engine structure-inference feature.
3. Pick one behavioral source of truth (runtime `frame-classes.ts` +
   `resolve-styles.ts`), align the editor picker, the frame-class doc, and the
   skill against it, and add a drift guard.
4. Reduce `DIAGRAM.md` to an index that points at those sources.
5. Keep appearance-only style/modifier repaint on the spec 071 substrate.

## Likely file map

- Behavioral truth: `packages/layout-engine/src/frame-classes.ts`,
  `packages/layout-engine/src/resolve-styles.ts`
- Editor picker parity: `packages/layout-engine/src/preview-shell/frame-style.ts`
- New authoring/validator helper: `packages/layout-engine/src/level-promotion.ts`
  (name TBD; must not live in the picker, `editor.js`, or `layout-bridge.js`)
- Drift guard + unit tests: `packages/layout-engine/tests/`
- Browser repaint proof:
  `apps/preview/src/persistence/editor-live-repaint-regression.test.ts`
- Detailed human spec: `docs/frame-classes.md`
- Authoring workflow guidance: `.github/skills/level-assignment/SKILL.md`
- Index only: `DIAGRAM.md`

## Contract matrix

| Source | Pre-implementation state | Owner after this slice |
|--------|---------------------------|------------------------|
| `frame-classes.ts` + `resolve-styles.ts` | behavioral runtime truth, but authoring promotion was not fully surfaced | behavioral source of truth for structural levels, modifiers, and runtime downgrade semantics |
| `preview-shell/frame-style.ts` | partially aligned, but only by convention | aligned mirror of the runtime contract for picker semantics |
| `docs/frame-classes.md` | drifting and overclaimed authored authority | guarded human-readable mirror of the runtime contract |
| `.github/skills/level-assignment/SKILL.md` | drifting authoring guidance | guarded authoring workflow mirror of the runtime contract |
| `DIAGRAM.md` | duplicated frame-class table and hierarchy prose | thin index that points to the runtime and guarded mirrors |

## Verification shape

- Focused runtime/unit tests for the authoring promotion helper and for
  wrapper/annotation/highlight modifier semantics.
- Browser proof for appearance-only repaint with stable engine identity.
- A drift guard that fails when the class/level table or promotion rule diverges
  between runtime, editor picker, frame-class doc, and the skill, and that
  asserts `DIAGRAM.md` holds no independent rule copy.

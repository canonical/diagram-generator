# Plan: Spec 063 Auto-style by nesting depth

## Working theory

The repo already contains most of the intended rule in prose and skill form,
but it is not packaged as one enforceable contract. The main work is to make
the sibling-promotion algorithm explicit, pin it in tests, and ensure the live
preview repaint path for appearance-only role changes stays on the spec 071
substrate instead of silently drifting again.

## Likely file map

- Runtime style inference: `packages/layout-engine/src/preview-shell/frame-style.ts`
- Structural style resolution: `packages/layout-engine/src/resolve-styles.ts`
- Browser repaint proof:
  `apps/preview/src/persistence/editor-live-repaint-regression.test.ts`
- Detailed style semantics: `docs/frame-classes.md`
- Public visual contract: `DIAGRAM.md`
- Authoring workflow guidance: `.github/skills/level-assignment/SKILL.md`

## Verification shape

- Focused runtime tests for sibling-promotion and exempt-style boundaries.
- Browser proof for appearance-only repaint with stable engine identity.
- Lightweight doc/skill alignment guard so the written rule does not drift from
  the runtime contract.

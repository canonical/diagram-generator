# Spec 063: Auto-style by nesting depth

**Feature Branch**: `feat/063-auto-style-by-nesting-depth`
**Status**: Active
**Created**: 2026-07-03
**Priority**: Next in Opus execution order after spec 062
**Context**: `docs/spec-reviews/inbox-triage.md` row 16,
`docs/spec-reviews/branch-058.md`, `docs/frame-classes.md`,
`.github/skills/level-assignment/SKILL.md`

## Problem

The repo has an important authoring rule, but it is split across prose, skill
instructions, and partial runtime behavior: visual style should follow nesting
depth, siblings should not mix tiers, and the highest nesting depth among a
sibling group should promote that whole group. The user asked for this rule
twice and explicitly called out the need to verify it in code **and** in the
repo guidance.

There are two distinct failures in the current state:

1. The rule is not packaged as a single explicit contract. `docs/frame-classes.md`
   and `.github/skills/level-assignment/SKILL.md` describe a sibling-promotion
   algorithm, but `docs/specs.md` still treats 063 as missing and the authoring
   story is easy to miss.
2. Appearance-only box-style changes have regressed before: the user's report
   was that changing child/annotation/parent/section sometimes produced no live
   visual change until a larger mutation happened. Spec 071 now gives us the
   repaint substrate; spec 063 must use that contract instead of adding another
   ad-hoc relayout path.

This spec owns the auto-style contract and its runtime/documentation alignment.
Spec 058 only proves the inspector can *display* the effective style; 063 owns
what the rule is, where it is documented, and how visible style changes update
the live preview.

## Goals

- Make the nesting-depth style rule explicit and testable in one spec.
- Align code, `DIAGRAM.md`, `docs/frame-classes.md`, and the
  `level-assignment` skill on the same sibling-promotion algorithm.
- Ensure appearance-only style changes repaint immediately without requiring a
  larger mutation and without switching engines or forcing unrelated relayout.
- Keep style-tier behavior semantic: child/parent/section/annotation/highlight,
  not ad-hoc inline formatting.

## Non-goals

- No grid-regression work; that remains spec 061.
- No hug-resize work; that remains spec 062.
- No arrow-label de-overlap work; that remains spec 064.
- No broad engine-fidelity or engine-switch work; those remain in 057/065/071.
- No reopening spec 058 beyond its already-closed "display the effective
  variant" responsibility.

## User stories

### US1: Siblings share the promoted style tier

As a diagram author, when one item in a sibling group has deeper nesting, I
expect all siblings at that depth to share the promoted visual tier.

**Acceptance**: the contract proves `0 -> child`, `1 -> parent`, `2 -> section`
for the whole sibling group, not per-item mixed tiers.

### US2: Style changes repaint immediately

As an editor user, when I change a frame between child/parent/section/
annotation/highlight, I expect the visible SVG to repaint immediately without
waiting for an unrelated top-level mutation.

**Acceptance**: a real-browser proof shows appearance-only style changes update
the live frame layer while keeping engine identity stable.

### US3: Repo guidance matches the runtime rule

As an author or agent, I need the same level-assignment rule in runtime code,
`DIAGRAM.md`, frame-class docs, and skill guidance so I do not author YAML that
fights the engine.

**Acceptance**: the documented rule and the runtime/fixture-backed rule are the
same, and tests fail if one drifts.

## Functional requirements

- **FR-001**: The style-tier contract MUST be explicit:
  `0 nesting -> child/leaf`, `1 nesting -> parent/panel`,
  `2 nesting -> section`, with sibling promotion to the highest level present at
  that depth.
- **FR-002**: Siblings at the same logical depth MUST not mix child/panel/
  section tiers unless an explicitly exempt style applies (`annotation`,
  `highlight`, structural wrappers, separators).
- **FR-003**: Runtime style resolution, docs, and skill guidance MUST agree on
  the sibling-promotion algorithm. Drift between code and repo guidance is a
  contract failure.
- **FR-004**: Appearance-only style mutations MUST repaint through the spec 071
  render/update path and MUST NOT require a separate ad-hoc relayout trigger.
- **FR-005**: Appearance-only style mutations MUST keep the active engine
  stable; they are visual/style changes, not engine switches.
- **FR-006**: The spec MUST define where the rule is authored:
  `DIAGRAM.md` as short public contract, `docs/frame-classes.md` as detailed
  class semantics, `.github/skills/level-assignment/SKILL.md` as authoring
  workflow guidance, and runtime/tests as behavioral authority.
- **FR-007**: Fixes under this spec MUST remain TypeScript-first and MUST NOT
  widen `scripts/preview/editor.js` or `scripts/preview/layout-bridge.js`.

## Success criteria

- **SC-001**: Repo-owned tests prove sibling groups resolve to the promoted tier
  determined by deepest nesting among siblings.
- **SC-002**: Repo-owned tests prove exempt styles (`annotation`, `highlight`,
  structural wrappers, separators) remain outside the sibling-promotion rule.
- **SC-003**: A real-browser proof shows an appearance-only style change
  repaints the live stage immediately while preserving engine identity.
- **SC-004**: Repo docs/skill alignment checks prove the algorithm described in
  `DIAGRAM.md`, `docs/frame-classes.md`, and
  `.github/skills/level-assignment/SKILL.md` matches the runtime rule.
- **SC-005**: `npm --prefix packages/layout-engine test`,
  `npm --prefix apps/preview test`, and `node scripts/check_no_new_python.mjs`
  pass.

## Likely owners

- `packages/layout-engine/src/preview-shell/frame-style.ts`
- `packages/layout-engine/src/resolve-styles.ts`
- `packages/layout-engine/tests/`
- `apps/preview/src/persistence/editor-live-repaint-regression.test.ts`
- `docs/frame-classes.md`
- `DIAGRAM.md`
- `.github/skills/level-assignment/SKILL.md`

## Primary entry point for agents

Start with [`tasks.md`](./tasks.md). Keep the boundary explicit:
spec 058 owns *displaying* effective variants, spec 063 owns the *auto-style
contract* and its repaint/documentation alignment.

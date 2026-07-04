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
instructions, an editor style picker, and runtime behavior, and those copies
drift. The rule is: visual style follows nesting, siblings never mix structural
tiers, and the deepest-nested sibling promotes the whole group. Frame YAML is
mostly agent-generated, so the agent must apply this rule when it writes the
`level:` values; a hand author can apply the same logic. The user asked for this
rule and explicitly required it to be verified in code **and** in repo guidance.

There are three distinct failures in the current state:

1. The rule is not packaged as a single explicit contract. `docs/frame-classes.md`,
   `.github/skills/level-assignment/SKILL.md`, the runtime
   (`resolve-styles.ts` + `frame-classes.ts`), and the editor picker
   (`preview-shell/frame-style.ts` `PREVIEW_STYLE_SEMANTICS`) each restate the
   class/level mapping, and `DIAGRAM.md` restates it a fifth time. There is no
   single source of truth and no guard against drift.
2. Appearance-only box-style changes have regressed before: changing
   child/parent/section/annotation/highlight sometimes produced no live visual
   change until a larger mutation happened. Spec 071 now gives us the repaint
   substrate; spec 063 must use that contract instead of adding another ad-hoc
   relayout path.
3. The promotion rule was ambiguously described as if the engine infers levels
   from structure. It does not, and must not — the engine consumes explicit
   `level:` and only auto-downgrades invalid nesting. Promotion is an
   **authoring-time** rule, applied when the `level:` values are written.

This spec owns the auto-style contract and its runtime/documentation alignment.
Spec 058 only proves the inspector can *display* the effective style; 063 owns
what the rule is, where it is documented, and how visible style changes update
the live preview.

## Goals

- Make the nesting-based style rule explicit and testable in one spec, as an
  **authoring-time** rule that sets `level:` values — not a new engine
  structure-inference feature.
- Establish one behavioral source of truth and align every restatement
  (runtime, editor picker, `docs/frame-classes.md`, `level-assignment` skill)
  against it, with a guard that fails on drift.
- Reduce `DIAGRAM.md` to a thin index that points at the sources of truth
  instead of restating the rule and drifting.
- Ensure appearance-only style changes repaint immediately without requiring a
  larger mutation and without switching engines or forcing unrelated relayout.
- Keep style semantics fixed: structural levels child/parent/section plus the
  wrapper (level 0), with annotation and highlight as modifiers.

## Canonical model (normative)

This is the single vocabulary the rest of the spec, the runtime, the docs, and
the skill must agree on. It matches the **current** `level:` encoding — no field
renumbering.

### Structural levels (authored as `level:`, participate in promotion)

| `level:` | Name | Render |
|----------|------|--------|
| `0` | **wrapper** | invisible; no box, heading, or icon. Layout-only grouping. Allowed at the top level or any depth purely to control autolayout (e.g. change direction or group a set of nodes). |
| `1` | **child** (leaf) | outlined box, regular-weight heading, transparent fill, black 1px border. Default when `level:` is absent. |
| `2` | **parent** (panel) | bold heading, `#F3F3F3` fill, `#F3F3F3` border. A parent of children. |
| `3` | **section** | bold heading, transparent fill, black 1px border. A parent of parents. |

### Modifiers (off the numeric level axis, never promoted, never counted as a tier)

- **annotation** — arrow labels and auxiliary text. Borderless `#666666` text
  label (`variant: annotation` / `border: none`). Exempt from promotion; may
  appear at any depth.
- **highlight** — any child, parent, or section node may be promoted to
  highlight (`variant: highlight` / `fill: black`). It overrides fill to solid
  black and text + icon to white. It does **not** change the node's structural
  heading weight, and it does **not** change the node's structural level.

### Sibling-promotion rule (authoring-time)

1. Nodes that share a parent are a **sibling group** (same logical level).
2. For each sibling, find the deepest nesting of headed children beneath it.
3. Let `D` be the maximum such depth across the whole group.
4. `D == 0` → the whole group is **child** (`level: 1`).
   `D == 1` → the whole group is **parent** (`level: 2`).
   `D >= 2` → the whole group is **section** (`level: 3`).
5. Siblings never mix structural tiers. Wrapper (`level: 0`), annotation, and
   highlight are exempt: they neither force nor receive promotion.

The agent applies this when generating YAML; a hand author applies the same
logic. It is a **soft authoring rule**, not a strong runtime rule: the engine
never infers `level:` from structure. The only structural runtime behavior is
the existing invalid-nesting safety net (panel-in-panel downgrades to leaf,
section-in-section downgrades to panel).

## Non-goals

- No renumbering of the `level:` field. The encoding stays
  `0=wrapper, 1=child, 2=parent, 3=section`.
- No engine change that infers `level:` from structure. Promotion is
  authoring-time only; the engine keeps consuming explicit `level:`.
- No grid-regression work; that remains spec 061.
- No hug-resize work; that remains spec 062.
- No arrow-label de-overlap work; that remains spec 064.
- No broad engine-fidelity or engine-switch work; those remain in 057/065/071.
- No reopening spec 058 beyond its already-closed "display the effective
  variant" responsibility.

## User stories

### US1: Siblings share the promoted structural tier

As the agent (or a hand author) writing frame YAML, when one item in a sibling
group nests deeper, I set every sibling at that group to the same promoted tier.

**Acceptance**: the authoring rule proves max child-nesting `D` across a sibling
group yields child (`D=0`), parent (`D=1`), or section (`D>=2`) for the **whole**
group, and wrapper/annotation/highlight are exempt.

### US2: Style and modifier changes repaint immediately

As an editor user, when I change a frame between child/parent/section or toggle
the annotation/highlight modifier, I expect the visible SVG to repaint
immediately without waiting for an unrelated top-level mutation.

**Acceptance**: a real-browser proof shows appearance-only style/modifier changes
update the live frame layer while keeping engine identity stable.

### US3: One source of truth, no drift

As an author or agent, I need the runtime, the editor picker, the frame-class
doc, and the skill to state the same class/level table and promotion rule, with
`DIAGRAM.md` pointing at them rather than restating them.

**Acceptance**: a guard fails if any restatement drifts from the behavioral
source of truth, and `DIAGRAM.md` carries no independent rule copy.

## Functional requirements

- **FR-001**: The structural level encoding MUST stay
  `0=wrapper, 1=child, 2=parent, 3=section`, authored as `level:` and matching
  runtime `computeLevel` / `FRAME_CLASS_DEFS`. No field renumbering.
- **FR-002**: `wrapper` (`level: 0`) MUST be usable at the top level or any
  depth purely to control autolayout grouping/direction, and MUST render
  invisibly (no box, heading, or icon).
- **FR-003**: The sibling-promotion rule MUST be an **authoring-time** rule as
  defined in the canonical model: max child-nesting `D` across a sibling group
  sets the shared tier (`D=0` child, `D=1` parent, `D>=2` section); siblings
  never mix tiers; wrapper/annotation/highlight are exempt. The engine MUST NOT
  be changed to infer `level:` from structure; explicit `level:` stays
  authoritative and the only structural runtime behavior is the existing
  invalid-nesting downgrade.
- **FR-004**: `annotation` and `highlight` MUST be modifiers off the numeric
  level axis. `highlight` MUST override fill to black and text + icon to white
  on a child/parent/section node while preserving that node's structural heading
  weight and structural level. `annotation` MUST be borderless `#666666`
  auxiliary text (arrow labels / aux text), exempt from promotion.
- **FR-005**: Appearance-only style/modifier mutations MUST repaint through the
  spec 071 render/update path and MUST NOT require a separate ad-hoc relayout
  trigger.
- **FR-006**: Appearance-only style/modifier mutations MUST keep the active
  engine stable; they are visual changes, not engine switches.
- **FR-007**: There MUST be one behavioral source of truth for the class/level
  table and promotion rule (runtime `frame-classes.ts` `FRAME_CLASS_DEFS` +
  `resolve-styles.ts`). The editor picker (`preview-shell/frame-style.ts`
  `PREVIEW_STYLE_SEMANTICS`), `docs/frame-classes.md`, and
  `.github/skills/level-assignment/SKILL.md` MUST agree with it, and a
  repo-owned guard MUST fail on drift.
- **FR-008**: `DIAGRAM.md` MUST be reduced to a thin index that points to the
  sources of truth above. Its duplicated class/level ruleset MUST be removed so
  it can no longer drift. `DIAGRAM.md` is not a rule source.
- **FR-009**: Fixes under this spec MUST remain TypeScript-first and MUST NOT
  widen `scripts/preview/editor.js` or `scripts/preview/layout-bridge.js`.

## Success criteria

- **SC-001**: A repo-owned test proves the authoring promotion algorithm: for a
  sibling group with max child-nesting `D`, the assigned tier is child/parent/
  section for `D=0/1/>=2`, and siblings never mix. This tests the authoring
  helper/validator, not an engine that auto-promotes.
- **SC-002**: A repo-owned test proves `wrapper` (`level: 0`) renders invisibly
  at the top level and when nested, and neither forces nor receives promotion.
- **SC-003**: A repo-owned test proves `highlight` overrides fill to black and
  text/icon to white on a child/parent/section node while keeping that node's
  structural heading weight, and that `annotation` stays borderless `#666666`
  and exempt from promotion.
- **SC-004**: A real-browser proof shows an appearance-only style/modifier
  change repaints the live stage immediately while preserving engine identity.
- **SC-005**: A repo-owned guard fails if the class/level table or promotion
  rule drifts between `frame-classes.ts`, `resolve-styles.ts`,
  `preview-shell/frame-style.ts`, `docs/frame-classes.md`, and
  `.github/skills/level-assignment/SKILL.md`. The guard also asserts
  `DIAGRAM.md` carries no independent rule copy.
- **SC-006**: `npm --prefix packages/layout-engine test`,
  `npm --prefix apps/preview test`, and `node scripts/check_no_new_python.mjs`
  pass.

## Likely owners

- Behavioral source of truth: `packages/layout-engine/src/frame-classes.ts`
  (`FRAME_CLASS_DEFS`) and `packages/layout-engine/src/resolve-styles.ts`.
- Editor picker parity: `packages/layout-engine/src/preview-shell/frame-style.ts`
  (`PREVIEW_STYLE_SEMANTICS`).
- Authoring promotion rule + validator: a new typed helper under
  `packages/layout-engine/src/` (e.g. `level-promotion.ts`). It MUST NOT live in
  `preview-shell/frame-style.ts`, `scripts/preview/editor.js`, or
  `scripts/preview/layout-bridge.js`.
- Drift guard + browser repaint proof:
  `packages/layout-engine/tests/` and
  `apps/preview/src/persistence/editor-live-repaint-regression.test.ts`.
- Docs: `docs/frame-classes.md` (detailed human spec),
  `.github/skills/level-assignment/SKILL.md` (authoring workflow),
  `DIAGRAM.md` (index only).

## Primary entry point for agents

Start with [`tasks.md`](./tasks.md). Keep the boundary explicit:
spec 058 owns *displaying* effective variants, spec 063 owns the *auto-style
contract* (authoring-time promotion, modifier semantics, single-source-of-truth
alignment) and its repaint guarantee.

# Tasks: Spec 063 Auto-style by nesting depth

**Input**: `specs/063-auto-style-by-nesting-depth/spec.md`
**Branch**: `feat/063-auto-style-by-nesting-depth`

## Phase 1: Contract inventory

- [x] T001 Read the current rule sources and record where each states the
      class/level table: `docs/frame-classes.md`,
      `.github/skills/level-assignment/SKILL.md`, `DIAGRAM.md`,
      `resolve-styles.ts` / `frame-classes.ts`, and
      `preview-shell/frame-style.ts` `PREVIEW_STYLE_SEMANTICS`.
- [x] T002 Confirm the encoding matches the canonical model
      (`0=wrapper, 1=child, 2=parent, 3=section`; annotation/highlight as
      modifiers) and list every place that disagrees. Do not renumber `level:`.
- [x] T003 Write a short contract matrix marking each source as aligned,
      implicit-only, or drifting, and name the chosen behavioral source of truth
      (`frame-classes.ts` `FRAME_CLASS_DEFS` + `resolve-styles.ts`).

## Phase 2: Authoring rule and runtime tests

- [x] T010 Add a typed authoring/validator helper for sibling-promotion
      (max child-nesting `D` → child/parent/section for `D=0/1/>=2`; siblings
      never mix; wrapper/annotation/highlight exempt). Do NOT add engine
      structure-inference; explicit `level:` stays authoritative.
- [x] T011 Add focused unit tests for the promotion helper (SC-001), including
      sibling groups where the deepest-nested sibling drives the tier.
- [x] T012 Add focused tests for wrapper invisibility at top level and nested
      (SC-002) and for highlight/annotation modifier semantics (SC-003):
      highlight = black fill + white text/icon with unchanged heading weight;
      annotation = borderless `#666666`, exempt from promotion.
- [x] T013 Keep appearance-only role/style/modifier changes on the spec 071
      repaint path; do not add a new relayout trigger just to make the change
      visible.

## Phase 3: Browser proof

- [x] T020 Extend `editor-live-repaint-regression.test.ts` (or add a focused
      proof) so an appearance-only style/modifier change repaints immediately
      while the active engine stays unchanged (SC-004).

## Phase 4: Single source of truth

- [x] T030 Align `preview-shell/frame-style.ts` `PREVIEW_STYLE_SEMANTICS`,
      `docs/frame-classes.md`, and
      `.github/skills/level-assignment/SKILL.md` with the behavioral source of
      truth. Fix the code if behavior is wrong; fix the docs if the docs are
      wrong. Do not teach docs to match a bug.
- [x] T031 Reduce `DIAGRAM.md` to a thin index that points at the sources of
      truth; remove its duplicated class/level ruleset (FR-008).
- [x] T032 Add a repo-owned drift guard (SC-005) that fails when the class/level
      table or promotion rule diverges across runtime, editor picker,
      `docs/frame-classes.md`, and the skill, and that asserts `DIAGRAM.md`
      holds no independent rule copy.

## Phase 5: Validation and handoff

- [x] T040 Run targeted owning tests for the changed helper/guard/repaint files.
- [x] T041 Run `npm --prefix packages/layout-engine test`.
- [x] T042 Run `npm --prefix apps/preview test`.
- [x] T043 Run `node scripts/check_no_new_python.mjs`.
- [x] T044 Update `docs/specs.md`, `AGENTS.md`, and `AGENT-INBOX.md` only if the
      spec status or queue/handoff materially changes.

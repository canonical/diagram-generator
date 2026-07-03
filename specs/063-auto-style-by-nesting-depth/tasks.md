# Tasks: Spec 063 Auto-style by nesting depth

**Input**: `specs/063-auto-style-by-nesting-depth/spec.md`
**Branch**: `feat/063-auto-style-by-nesting-depth`

## Phase 1: Contract inventory

- [ ] T001 Read the current rule sources:
      `docs/frame-classes.md`, `.github/skills/level-assignment/SKILL.md`,
      `DIAGRAM.md`, and the runtime style owners.
- [ ] T002 Trace the current runtime style-resolution path in
      `resolve-styles.ts` and `preview-shell/frame-style.ts`.
- [ ] T003 Add a small contract matrix identifying what is already aligned,
      what is implicit only, and what drifts between code/docs/skill guidance.

## Phase 2: Runtime contract and tests

- [ ] T010 Add or tighten focused runtime tests that prove sibling promotion to
      the highest nesting tier present at a depth.
- [ ] T011 Add focused runtime tests for the exempt styles:
      annotation, highlight, structural wrappers, and separators.
- [ ] T012 If runtime behavior drifts from the intended rule, fix the owning
      TypeScript layer rather than teaching docs to match a bug.
- [ ] T013 Keep appearance-only role/style changes on the spec 071 repaint path;
      do not add a new relayout trigger just to make the style visible.

## Phase 3: Browser proof

- [ ] T020 Extend the existing appearance-only repaint browser proof or add a
      focused new one that proves style changes repaint immediately while the
      active engine remains unchanged.
- [ ] T021 Add at least one fixture-backed proof where sibling promotion is the
      reason a visible style tier resolves as child/panel/section.

## Phase 4: Docs and skill alignment

- [ ] T030 Update `DIAGRAM.md` with the short public-facing nesting-depth rule
      only if the public contract is not already clear enough.
- [ ] T031 Update `docs/frame-classes.md` so the detailed tier algorithm matches
      the runtime rule exactly.
- [ ] T032 Update `.github/skills/level-assignment/SKILL.md` if its algorithm or
      verification steps drift from the final runtime rule.
- [ ] T033 Add a lightweight repo-owned guard so future code/doc/skill drift is
      caught by tests or a focused contract check.

## Phase 5: Validation and handoff

- [ ] T040 Run targeted owning tests for changed style/runtime/doc guards.
- [ ] T041 Run `npm --prefix packages/layout-engine test`.
- [ ] T042 Run `npm --prefix apps/preview test`.
- [ ] T043 Run `node scripts/check_no_new_python.mjs`.
- [ ] T044 Update `docs/specs.md`, `AGENTS.md`, and `AGENT-INBOX.md` only if the
      spec status or queue/handoff materially changes.

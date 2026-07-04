# Tasks: Spec 072 Preview Engine Hardening

**Input**: `specs/072-preview-engine-hardening/spec.md`
**Branch**: `feat/072-preview-engine-hardening`

## Phase 1: Triage And Inventory

- [x] T001 Read `INBOX.md` and the 2026-07-04 adversarial review findings in
      `AGENT-INBOX.md`.
- [x] T002 Route each unresolved issue to one of: already closed, spec 061,
      spec 064, or spec 072. Keep only the honest-open 072 items in this spec.
- [x] T003 Update `docs/specs.md`, `TODO.md`, and `AGENTS.md` so spec 072 is
      indexed without disturbing the existing 061 -> 064 queue order.

## Phase 2: Preview Chrome And Padding

- [ ] T010 Remove the active-engine badge markup/runtime path when the engine
      tab rail is present; keep the tabs and help text as the only engine chrome.
- [x] T011 Normalize builtin V3 labeling/copy to `Autolayout`.
- [x] T012 Fix the stage padding regression so engine switches preserve right/
      bottom canvas padding instead of clipping it after engine switches.
- [ ] T013 Apply the requested +8px section-heading bottom spacing through the
      shared style/layout contract and add/extend focused tests.

## Phase 3: Architecture Hardening

- [x] T020 Widen the no-central-branching guard so it catches `v3`,
      `sequence`, and other explicit engine/document identity checks outside
      allowed registry/engine-owner files.
- [x] T021 Remove central `kind === 'sequence'` branches from the shared load
      and render owners by routing preview-document handling through a typed seam.
- [x] T022 Replace the builtin install-unit call ladder with a shared builtin
      install-unit collection and add a guard test for it.

## Phase 4: Persist And Reload Proof

- [x] T030 Extend the existing browser persistence regression so edits to
      layered/radial/dagre survive save -> reload -> switch-back and prove live
      UI state, not just serialized `byOperator` buckets.

## Phase 5: Validation

- [x] T040 Run `npm --prefix packages/layout-engine test`.
- [x] T041 Run `npm --prefix apps/preview test`.
- [x] T042 Run `node scripts/check_no_new_python.mjs`.

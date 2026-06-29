# Tasks: ELK sizing and interaction follow-up

**Input**: Design documents from `/specs/048-elk-sizing-interaction-followup/`
> 2026-06-28 REOPENED (authority verdict
> `docs/spec-reviews/CLINE-VERDICT-2026-06-28.md`). The live ELK-resize
> "relayout failed" P0 required proof on the real UI. The actual fix
> (engine-backed resize lane + `formatPreviewRelayoutStatusMessage` for the
> elk-failure case) is owned by spec 065 **T022**.
>
> **Closed 2026-06-29**: spec 065's
> `evidence/post-load-mutations.ts` proves a **real pointer-drag resize** on an
> ELK-authored doc shows no `/failed/i` status and the node reaches the dragged
> size (protocol §2 "ELK live resize"). Latest result:
> `specs/065-interactive-relayout-contract/evidence/post-load-mutations-result.json`
> (`ok: true`, `mongo_clients` 224px -> 304px, status `Ready`).



## Phase 1 - ELK Fill Sizing

- [x] T001 Add a focused `request-to-hardware-stack` regression proving native
      semantic layout makes the selected top-level Fill boxes equal.
- [x] T002 Add the matching ELK assertion showing
      `layoutElkFrameDiagram(...)` preserves those equal semantic sizes.
- [x] T003 Fix the ELK sizing handoff so semantic Fill sizes are not overwritten
      by compound expansion after ELK placement.
- [x] T004 Add a nested headed-compound assertion so heading/body placement
      survives the semantic size restoration.
- [x] T005 Confirm explicit fixed-size ELK tests remain green.

## Phase 2 - Width Remeasurement And Live Resize

- [x] T010 Trace the manual width-edit path from inspector action to typed
      relayout/measure owner.
- [x] T011 Add a regression proving width edits rerun HarfBuzz/text wrapping
      before save/reload.
- [x] T012 Trace the resize drag path through typed preview-shell owners.
- [x] T013 Implement bounded live resize updates during drag without moving
      behavior into legacy JS.
- [x] T014 Prove final drop and live drag use the same measurement semantics.

## Phase 3 - ELK Parent Text Inset

- [x] T020 Add a focused v3-vs-ELK text inset regression for headed/parent
      frames.
- [x] T021 Fix the owner responsible for ELK parent/headed chrome drift.
- [x] T022 Confirm existing heading synthesis and ELK headed-compound tests stay
      green.

## Phase 4 - ELK Options And Debug Introspection

- [x] T030 Audit currently exposed ELK layered controls for inert or
      topology-dependent behavior.
- [x] T031 Hide unsupported/inert controls or tighten descriptions with explicit
      caveats.
- [x] T032 Add an option-surface contract test so new exposed ELK controls need
      matching behavior coverage or caveat text.
- [x] T033 Add structured debug data for authored tree vs ELK input graph after
      selective flattening.
- [x] T034 Expose the debug data through a debug-only view/toggle with no
      persisted layout behavior.
- [x] T035 Re-check reciprocal-edge alternate-port selection and either keep the
      current heuristic with coverage or document a narrower native ELK option.

## Phase 5 - Verification And Handoff

- [x] T040 Run targeted owning tests for changed modules.
- [x] T041 Run `npm --prefix packages/layout-engine test`.
- [x] T042 Run `npm --prefix packages/graph-layout-elk test` if ELK adapter or
      graph-layout package code changes.
- [x] T043 Run `npm --prefix apps/preview test` if preview-shell/browser
      contracts change.
- [x] T044 Run `node scripts/check_no_new_python.mjs`.
- [x] T045 Update `docs/specs.md`, `AGENT-INBOX.md`, and any relevant flow map
      links only if their active status changes.

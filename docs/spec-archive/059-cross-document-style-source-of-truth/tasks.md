# Tasks: Spec 059 Cross-Document Style Source Of Truth

**Input**: `docs/spec-archive/059-cross-document-style-source-of-truth/spec.md`  
**Branch**: `feat/059-cross-document-style-source-of-truth`

## Phase 0: Audit

- [x] **T000** Audit the current style-token ownership for frame and sequence
      box chrome.
      **Verify**: frame rhythm was owned by `tokens.ts`/frame render plans while
      sequence copied separate participant/note text sizing and insets in
      `sequence-layout/layout.ts` and `sequence-layout/render-svg.ts`.

- [x] **T001** Reproduce the `service-handshake-sequence` spacing and engine
      display issues.
      **Verify**: `preview-host-contract.test.ts` covered the sequence lane and
      was missing a visible `active_engine_label`; browser evidence now records
      the live sequence engine label and SVG rhythm.

## Phase 1: Shared Style Contract

- [x] **T010** Define or extract the shared box-rhythm source of truth.
      **Verify**: `npm --prefix packages/layout-engine test`

- [x] **T011** Route sequence and relevant frame renderers through that shared
      contract.
      **Verify**:
      `npm --prefix packages/layout-engine test -- cross-document-style-contract.test.ts sequence-layout-render-svg.test.ts sequence-layout-layout.test.ts arrow-render.test.ts frame-render-plan.test.ts`

## Phase 2: Host Chrome

- [x] **T020** Add or restore engine identity display where the sequence lane
      needs it.
      **Verify**: `npm --prefix apps/preview test`; browser evidence at
      `docs/spec-archive/059-cross-document-style-source-of-truth/evidence/style-source-browser-result.json`

## Phase 3: Validation

- [x] **T030** Full validation.
      **Verify**:
      `npm --prefix packages/layout-engine test`;
      `npm --prefix apps/preview test`;
      `node scripts/check-browser-bundle-fresh.mjs`;
      `node scripts/check_no_new_python.mjs`;
      `node docs/spec-archive/059-cross-document-style-source-of-truth/evidence/style-source-browser-check.mjs`

# Tasks: Spec 059 Cross-Document Style Source Of Truth

**Input**: `specs/059-cross-document-style-source-of-truth/spec.md`  
**Branch**: `feat/059-cross-document-style-source-of-truth`

## Phase 0: Audit

- [ ] **T000** Audit the current style-token ownership for frame and sequence
      box chrome.
      **Verify**: owner list and current divergence points are captured.

- [ ] **T001** Reproduce the `service-handshake-sequence` spacing and engine
      display issues.
      **Verify**: bounded repro notes exist before edits.

## Phase 1: Shared Style Contract

- [ ] **T010** Define or extract the shared box-rhythm source of truth.
      **Verify**: `npm --prefix packages/layout-engine test`

- [ ] **T011** Route sequence and relevant frame renderers through that shared
      contract.
      **Verify**: focused parity tests.

## Phase 2: Host Chrome

- [ ] **T020** Add or restore engine identity display where the sequence lane
      needs it.
      **Verify**: focused preview-host tests.

## Phase 3: Validation

- [ ] **T030** Full validation.
      **Verify**:
      `npm --prefix packages/layout-engine test`;
      `npm --prefix apps/preview test`;
      `node scripts/check_no_new_python.mjs`

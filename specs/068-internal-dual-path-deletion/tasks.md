# Tasks: Spec 068 Internal Dual-Path Deletion

**Input**: `specs/068-internal-dual-path-deletion/spec.md`  
**Branch**: `feat/068-internal-dual-path-deletion`

> Close hard. Do not check a box because a wrapper got thinner. Check it only
> when one repo-owned path was deleted and search/tests prove callers moved.

## Phase 1: Deletion Inventory

- [ ] **T001** Write `deletion-inventory.md` listing every remaining internal
      dual path in active preview-shell, persistence, route, and browser-entry
      code. Include canonical owner, alias name, current callers, delete plan,
      and whether the alias is purely repo-owned.
- [ ] **T002** Define the banned internal alias list used by closeout search
      evidence. Be explicit about what is *not* banned because it is real
      product compatibility logic rather than migration debt.
- [ ] **T003** Decide the canonical names for graph-layout pane/runtime owners,
      relayout browser entry points, save/load schema fields, and viewer routes.

## Phase 2: Browser Runtime Deletion

- [ ] **T010** Remove `_getPreviewGridEditorCompat` from active product code and
      rewrite preview-script helpers/tests to bind directly to the canonical
      typed preview-shell contract.
- [ ] **T011** Remove duplicate repo-owned relayout/status browser globals so
      one canonical preview-shell entry point remains.
- [ ] **T012** Delete ELK-era browser/type aliases from generic graph-layout
      pane/controller owners and update all repo-owned callers/imports.
- [ ] **T013** Re-run focused contract tests proving `editor.js` and
      `layout-bridge.js` are still thin adapters over typed owners after the
      alias deletion.

## Phase 3: Persistence and Route Deletion

- [ ] **T020** Stop preserving unsupported or foreign `meta.elk` / `meta.dagre`
      keys on save. Replace preservation tests with strip-or-reject tests.
- [ ] **T021** Delete repo-owned route/schema aliases whose callers can be
      migrated in-spec, starting with the superseded viewer route prefix and any
      obsolete grid/schema spellings still kept alive only for history.
- [ ] **T022** Migrate or rewrite affected fixtures/tests so active product code
      no longer needs the deleted aliases at runtime.

## Phase 4: Public Surface and Documentation

- [ ] **T030** Remove repo-owned public/package export aliases that duplicate the
      canonical preview-shell or graph-layout API under old names.
- [ ] **T031** Update active docs/comments so they stop presenting internal dual
      support as an accepted architecture. Keep historical wording only in
      archived specs if needed.
- [ ] **T032** Commit `search-evidence.md` with the banned-alias grep proof and
      any explicit external-contract exceptions.

## Phase 5: Validation

- [ ] **T040** Run `npm --prefix packages/layout-engine run build:browser`.
- [ ] **T041** Run `npm --prefix packages/layout-engine test`.
- [ ] **T042** Run `npm --prefix apps/preview test`.
- [ ] **T043** Run `node scripts/check-browser-bundle-fresh.mjs`.
- [ ] **T044** Run `node scripts/check_no_new_python.mjs`.

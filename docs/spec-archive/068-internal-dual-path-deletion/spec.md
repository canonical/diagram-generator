# Spec 068: Internal Dual-Path Deletion

**Feature Branch**: `feat/068-internal-dual-path-deletion`  
**Status**: Closeout Ready
**Created**: 2026-06-30

## Problem

The refactor removed the large monoliths, but it did not finish deleting all of
the temporary dual paths used during migration. The repo is now carrying
multiple internal names, wrappers, read aliases, and save-time exceptions for
the same behavior:

- browser-global aliases that mirror typed preview-shell owners
- ELK-era names still exposed from generic graph-layout pane/runtime modules
- route and schema read aliases that keep old spellings alive after the callers
  were already moved
- persistence tests that intentionally preserve unsupported engine keys instead
  of stripping them

That is not acceptable steady state for this repo. It is a single-developer,
young codebase where every extra alias increases token spend, search noise, test
noise, and the chance that one fix lands in one path but not the other.

The end state is strict: one behavior, one owner, one name, one runtime path.
If an old shape still exists after this spec, it must be because the repo can
name a real external dependency that still requires it. "Historical inertia" is
not a valid reason.

## Goals

- Delete repo-owned internal compatibility and migration wrappers that keep two
  ways of doing the same thing alive in product code.
- Converge preview-shell browser entry, persistence, and route handling onto one
  canonical path per behavior.
- Stop preserving unsupported or foreign engine-layout keys during save.
- Remove ELK-era naming from generic graph-layout UI/runtime surfaces.
- Make future refactors cheaper by shrinking the number of names and seams an
  agent has to inspect before it can change preview behavior safely.

## Non-goals

- This spec does not remove real product compatibility rules such as
  engine-to-document eligibility (`compatibleEngines`). That is product logic,
  not migration debt.
- This spec does not widen `scripts/preview/editor.js` or
  `scripts/preview/layout-bridge.js`. If anything, those files should shrink.
- This spec does not keep permanent runtime fallbacks "just in case." If a
  migration is still required, make it explicit, one-shot, and removable.
- This spec does not reopen the graph-engine option inventory from 066 unless a
  dual-path deletion requires a canonical rename there too.

## Scope Summary

- **In scope**: repo-owned preview-shell globals, typed/browser-entry aliases,
  save/load schema aliases, route aliases, and tests that preserve old internal
  paths.
- **In scope**: fixture or repo-source migration when deleting an old schema
  branch is cheaper than preserving it in runtime forever.
- **Out of scope**: third-party package APIs the repo does not own.

## Functional Requirements

- **FR-001**: Produce a repo-owned deletion inventory under this spec that lists
  every remaining internal dual path in preview-shell, persistence, route, and
  browser-entry code. Each item must name:
  canonical owner, old alias, current callers, deletion strategy, and why the
  alias still exists today.
- **FR-002**: Product-path browser code must expose one canonical preview-shell
  runtime contract. Repo-owned aliases such as `_getPreviewGridEditorCompat`,
  ELK-era pane/controller globals, and duplicate relayout entry names must be
  deleted or collapsed to one canonical symbol.
- **FR-003**: Generic graph-layout pane/runtime owners must stop exposing ELK as
  the architectural namespace. Neutral graph-layout or layout-params names are
  the only allowed internal owner names after closeout.
- **FR-004**: Save/load paths must not preserve unsupported or foreign
  `engineLayout` keys merely because they were already present. Unknown keys are
  stripped or rejected; they are not carried forward indefinitely.
- **FR-005**: Route and schema aliases remain only if there is a named,
  repo-owned external caller that cannot be updated in the same slice. If all
  callers are repo-owned, update them and delete the alias in the same branch.
- **FR-006**: Any unavoidable migration must be explicit and finite:
  repo script, fixture rewrite, or one-time document rewrite plan. Permanent
  runtime dual support is not an acceptable substitute for migration.
- **FR-007**: Active product code, active specs, and active tests must stop
  describing internal dual-path support as an acceptable steady state. Historical
  notes may remain in archived packages only.
- **FR-008**: Preview-shell public exports must converge on canonical names.
  Repo-owned call sites must not import or read old aliases after closeout.
- **FR-009**: The close gate is search-backed. This spec cannot close unless the
  repo proves that the banned internal aliases and deprecated preservation tests
  are gone from active product code and active tests.
- **FR-010**: Do not replace one dual path with another thinner dual path. If an
  alias still exists after a task, the task is incomplete unless the spec
  explicitly records the external contract that still requires it.

## Success Criteria

- **SC-001**: A committed deletion inventory exists and every item is marked
  `delete now`, `migrate then delete in-spec`, or `external contract`.
- **SC-002**: Repo-owned browser callers no longer read through
  `_getPreviewGridEditorCompat` or equivalent preview-shell alias facades.
- **SC-003**: Repo-owned product code no longer exports or consumes ELK-era
  graph-layout pane/controller aliases when the owner is generic.
- **SC-004**: Save-time tests prove unsupported `meta.elk` / `meta.dagre` keys
  are stripped or rejected, not preserved.
- **SC-005**: Repo-owned routes and links no longer depend on superseded viewer
  path aliases if the canonical route can be emitted directly.
- **SC-006**: `rg` evidence for this spec shows no remaining active-code hits for
  the banned internal alias list defined in the deletion inventory, except for
  explicitly approved external-contract shims.
- **SC-007**: `npm --prefix packages/layout-engine run build:browser`,
  `npm --prefix packages/layout-engine test`,
  `npm --prefix apps/preview test`,
  `node scripts/check-browser-bundle-fresh.mjs`, and
  `node scripts/check_no_new_python.mjs` pass after the deletions land.
- **SC-008**: The repo state is leaner after closeout: fewer browser globals,
  fewer public aliases, fewer schema branches, and fewer preview-shell shims.

## Closeout Gate

This spec is **not** `Closeout Ready` unless all of the following are true:

1. Every repo-owned internal alias in the deletion inventory is deleted, or the
   remaining exception names a concrete external contract and a follow-up owner.
2. No active product-path test asserts that unsupported engine-layout keys are
   preserved.
3. No active product-path runtime keeps two repo-owned names for the same
   behavior merely because migration once existed.
4. Search evidence is committed under this spec and demonstrates the deletion,
   not just a comment claiming it happened.
5. The implementation reduces ownership complexity rather than moving it into a
   new wrapper layer.

## Risks

- Some old aliases are currently referenced by narrow VM-style contract tests.
  Those tests must be rewritten to the canonical API, not used as justification
  to keep the alias alive.
- Deleting save/load aliases may require fixture updates. That is acceptable if
  the fixture rewrite is smaller than the permanent runtime debt.
- Public package exports may need a short-lived coordinated rename across app and
  package code. That is still preferable to carrying dual names indefinitely.

## Initial Debt Candidates

These are the first items the deletion inventory should confirm or remove:

- `_getPreviewGridEditorCompat` and the preview-script helper/test harnesses
  built around it
- `window.getV3RelayoutStatus`, `window.requestV3Relayout`, and other duplicate
  relayout browser-global entry names when a canonical preview-shell API already
  exists
- ELK-era typed/public aliases such as `ElkPreviewController`,
  `ElkLayoutControls`, and similar names in generic graph-layout code
- save-time preservation of unsupported `meta.elk` and `meta.dagre` keys
- route aliases such as `/v3/view/` if all repo-owned callers can be migrated
- arrow-id fallbacks such as `legacyArrowComponentId` if fixture/corpus audit
  proves the repo no longer needs them

# Plan: Spec 072 Preview Engine Hardening

## Implementation shape

1. Inventory the recurring inbox items and map each one to 061, 064, already
   closed work, or this spec.
2. Fix the stage-fit parity regression in the single render-node owner and add a
   focused test proving right/bottom padding survives engine-tab switches.
3. Remove stale engine badge chrome, normalize V3 labeling to `Autolayout`, and
   land the section-heading rhythm adjustment with focused owner tests.
4. Widen the no-central-branching guard, extract sequence/document-kind handling
   behind a typed seam, and replace manual builtin install-unit registration
   with a shared builtin list.
5. Extend the browser persistence regression to prove save -> reload ->
   switch-back preserves live state for non-active engines.

## Validation

- `npm --prefix packages/layout-engine test`
- `npm --prefix apps/preview test`
- `node scripts/check_no_new_python.mjs`

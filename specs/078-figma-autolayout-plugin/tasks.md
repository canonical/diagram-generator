# Tasks: Spec 078 Figma autolayout plugin

**Input**: `specs/078-figma-autolayout-plugin/spec.md`
**Plan**: `specs/078-figma-autolayout-plugin/plan.md`
**Branch**: `feat/078-figma-autolayout-plugin`

## Phase 1: Spec package

- [x] T001 Create spec package, checklist, and `docs/specs.md` catalog entry.

## Phase 2: US1 canonical leaf proof

- [x] T010 Add `apps/figma-plugin/` with a development manifest, plugin runtime,
      UI, and README.
- [x] T011 Add `scripts/serve-figma-plugin-dev.mjs` and sample payload data for
      localhost development.
- [x] T012 Implement native Figma auto-layout import for one canonical leaf node
      with stable plugin-data tags and icon fetch from localhost.
- [x] T013 Add a root npm script for the plugin dev server and validate the
      localhost payload contract.

## Phase 3: Manual validation

- [ ] T020 Import the plugin into the linked Figma Design test file and verify
      width, padding, icon size, text wrapping, and editability by hand.
- [ ] T021 Record the manual verification result or known gaps in this spec
      package before widening scope to parent/section import.

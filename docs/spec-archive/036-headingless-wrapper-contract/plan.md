# Plan: Headingless wrapper contract

## Phase 1 - Contract audit

- trace the current wrapper-promotion path across preview style overrides, YAML persistence, frame parsing, and resolved style application
- confirm which combinations of `level` / `fill` / `border` are incorrectly promoting headingless wrappers into panel chrome
- decide the supported authored path for any intentionally visible non-headed container

## Phase 2 - Wrapper-safe implementation

- tighten preview/editor style behavior so headingless wrappers preserve structural-only semantics by default
- keep style-picker labels aligned with the real base/authored state using `as defined` wording
- add focused save/reload and render coverage for invisible wrappers

## Phase 3 - Validation and follow-up boundary

- validate wrapper behavior in preview, persistence, and SVG output
- document the restored wrapper rule in repo tracking/docs
- only open a follow-up variant spec if a real remaining use case still cannot be expressed cleanly

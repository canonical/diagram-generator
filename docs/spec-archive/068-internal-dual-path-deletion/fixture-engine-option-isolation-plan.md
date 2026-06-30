# Fixture and Engine Option Isolation Plan

**Date**: 2026-06-30  
**Owner spec**: 068 for the immediate validation blocker; follow-up product
work belongs to the engine workspace / option-surfacing specs.

## Problem

`scripts/diagrams/frames/example-deployment-pipeline.yaml` is an authored,
mutable preview fixture. Manual control-panel exploration changed it from:

```yaml
meta:
  layout_engine: v3
```

to an `elk-radial` document with `meta.dagre` and radial `meta.elk` controls.
That is a legitimate authoring experiment, but
`packages/layout-engine/tests/elk-layout.test.ts` also consumed the same file as
a stable ELK layered regression fixture. The direct layered test then inherited
radial-only options and failed with unsupported layered keys.

This exposed two separate smells:

- Regression tests depend on a mutable authored fixture whose metadata can be
  changed by normal preview usage.
- Direct engine tests can bypass the active-engine manifest filtering used by
  the preview/save path, so a test can accidentally feed one engine family
  another family's controls.

## Immediate 068 Fix

Keep the user's YAML intact. Do not revert the manual control experiment just to
make tests pass.

For tests that need a specific engine family, normalize the loaded fixture
inside the test before invoking the direct engine API:

- Set `diagram.layoutEngine` explicitly to the engine under test.
- Clear or provide only that engine's option bucket before calling the direct
  layout function.
- Prefer a local cloned/sanitized diagram over modifying the source fixture.

This keeps the regression scoped to the behavior it claims to test and prevents
manual preview exploration from contaminating unrelated suites.

## Product Follow-Up Plan

1. Add an authoring-fixture policy: files under
   `scripts/diagrams/frames/` are source-of-truth examples, but tests that need
   fixed metadata must clone/sanitize them or use purpose-built test fixtures.
2. Add a small helper for direct engine tests, for example
   `asEngineFixture(diagram, engineId, options)`, that clears non-target
   engine metadata and makes the intended engine explicit.
3. Audit direct layout tests for shared mutable fixture reads. Any test that
   asserts ELK layered, radial, force, stress, Dagre, or v3-specific behavior
   should either use a dedicated fixture or normalize the engine before layout.
4. Harden direct engine entry points where practical: if a diagram declares
   `layoutEngine: elk-radial`, a direct layered entry should either ignore
   radial-only metadata through the active manifest or fail with a message that
   names the engine mismatch, not just unsupported keys.
5. Keep save behavior strict: when saving through preview, unsupported or
   foreign option keys should be stripped/rejected by the manifest-aware
   persistence path, not silently preserved.
6. Add a regression that switching from one engine tab to another does not carry
   inactive engine controls into the newly active engine's layout request.

## Out Of Scope For 068

The user-observed issue where clicking some engine tabs does not visibly change
the previewed diagram is not a 068 deletion problem. It belongs to spec 060
(`Output pane engine tabs and live rerender`) and possibly a follow-up to spec
057 if the root cause is engine compatibility/fidelity rather than rerender
plumbing.

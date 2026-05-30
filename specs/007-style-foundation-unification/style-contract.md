# Style Semantic Contract (WS1)

Date: 2026-05-30
Feature: 007-style-foundation-unification

## Purpose

Define one canonical mapping from inspector style options to semantic override intent for v3 frames.

This contract is implementation-facing and test-facing. If code and this file diverge, code must be updated or the contract revised explicitly in the same change.

## Canonical Style Keys

Allowed user-facing style values:

- `default`
- `parent`
- `section`
- `annotation`
- `highlight`
- `""` (reset/original)

Legacy alias:

- `accent` -> normalize to `parent`

## Semantic Mapping

For v3 overrides, style selection maps to semantic fields as follows:

| Style key | level | fill | border | persisted `style` |
|---|---:|---|---|---|
| `default` | 1 | `WHITE` | `SOLID` | `default` |
| `parent` | 2 | `GREY` | `NONE` | `parent` |
| `section` | 3 | `WHITE` | `SOLID` | `section` |
| `annotation` | unset | `WHITE` | `NONE` | `annotation` |
| `highlight` | unset | `BLACK` | `NONE` | `highlight` |
| `""` (reset) | clear | clear | clear | clear |

Notes:

- `section` expresses semantic section intent via `level=3`; visual treatment may remain transparent+outlined after style resolution.
- For `annotation` and `highlight`, `level` is intentionally unset to avoid forcing class-level semantics over variant-like visual intent.

## Normalization Rules

1. Normalize incoming style value:
   - `accent` -> `parent`
2. If normalized style is unknown:
   - clear style semantic fields (`level`, `fill`, `border`, `style`)
3. Persist normalized style key only.

## Backward Compatibility

On load/save roundtrips:

- Existing overrides with `style: accent` must be treated as `style: parent`.
- Existing payloads that have only `fill/border` and no `style` should continue to render; editor may add canonical `style` on next write.

## Verification Targets

- Unit/contract tests for normalization and mapping
- Browser regression tests for visible style impact in both local-ready and fallback modes
- Roundtrip tests for legacy alias payload compatibility

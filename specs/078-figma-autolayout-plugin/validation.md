# Validation: Spec 078 Figma autolayout plugin

## Closeout status

Spec 078 is ready for adversarial review.

The decisive sizing bug was fixed at the payload boundary: the local Figma
payload server now consumes `layoutFrameTree(...).coerced`, serializes effective
layout sizing, and downgrades any Figma-illegal fill-under-hug combination to
fixed-at-placed geometry before the plugin builds frames.

The plugin builder no longer performs client-side parent-axis coercion. After a
diagram import, it reads back every semantic frame and generated body frame's
actual `layoutSizingHorizontal` / `layoutSizingVertical` values and fails the
import if any value differs from the effective payload.

## Figma verification

2026-07-10 user/Opus verification confirmed the telecom import now exposes
Fill/Hug/Fixed as expected in Figma for the diagram generated from the same YAML
as the preview editor.

Representative effective payload sizing served from
`/api/frame-diagram?slug=ai-infra-telecom-services-stack`:

```text
page FIXED/FIXED body=FIXED/FIXED size=1600x1200 bodySize=1600x1200
services_layer FILL/HUG body=FILL/HUG size=1552x168 bodySize=1534x88
ai_workflows FILL/FIXED body=FILL/FILL size=288x304 bodySize=270x206
compute_nodes FIXED/HUG body=FIXED/HUG size=552x64 bodySize=552x64
whitebox_switches HUG/HUG body=HUG/HUG size=160x64 bodySize=160x64
```

The `ai_workflows` row is the important regression case: authored YAML requested
`FILL/FILL`, but the effective Figma payload correctly emits `FILL/FIXED`
because the original vertical fill sits under a hugging spine.

## Repo-owned regressions

- `dev-server.test.ts` proves primary-axis engine coercion is consumed.
- `dev-server.test.ts` proves cross-axis fill-under-hug is downgraded for Figma.
- `dev-server.test.ts` proves the telecom payload contains no Figma-illegal
  fill-under-hug pairs.
- `code.test.ts` proves illegal payload sizing is rejected instead of hidden by
  client coercion.
- `code.test.ts` imports the real telecom effective payload and verifies the
  created fake-Figma nodes match payload sizing for representative telecom
  nodes.

# Opus adversarial review request — v3 autolayout, ports, and save/reload

Reviewer: Opus

Review the current uncommitted work in `diagram-generator` as a skeptical
external maintainer. This is an investigation/review request: do not edit
product code, generated bundles, fixtures, or YAML.

## Review focus

1. **FILL/HUG defaults and resize correctness**
   - Verify the parser contract: non-root frames default to width `FILL` and
     height `HUG`.
   - Trace `measure → remeasureWithWidthConstraints → place` for a nested
     headed panel. Look for cases where a FILL child does not receive its
     parent's content width, a HUG ancestor does not resize the canvas after a
     direction change, or min/max constraints disagree between measurement and
     placement.
   - Reproduce in the live v3 preview, including changing the top-row parent
     from horizontal to vertical and resizing a child below/above its bounds.
   - Reject any workaround that reintroduces authored `width`, `height`, or
     `sizing_*: fixed` values merely to hide an engine defect.

2. **Containment**
   - Audit whether fixed or bounded parents can still place a child outside the
     parent's usable content rectangle after heading/body synthesis.
   - Distinguish a true engine invariant from a fixture-specific dimension
     patch. State what should be enforced, where, and what regression is
     missing.

3. **Parallel arrows and ports**
   - Audit the native parallel-edge attachment work in
     `packages/layout-engine/src/arrow-routing.ts` and the ELK port work in
     `packages/layout-engine/src/elk-layout.ts`.
   - Decide whether the result is a real reusable port model or only an
     anonymous routing heuristic. Check reciprocal arrows, same-direction
     multi-edges, explicit endpoint sides, authored waypoints, resize, save /
     reload, and non-horizontal pairs.
   - If it is not an explicit box-port model, define the smallest credible
     follow-up boundary: port identity, side/order/position constraints,
     persistence, layout-engine adapters, rendering, and interaction/editing.
     Do not accept per-diagram spacing or styling exceptions as a solution.

4. **Save/reload contract**
   - Verify the regression where Save succeeded but reload failed with
     `TypeError: options.createScene is not a function`.
   - Check the browser-entry public contract rather than only unit-level
     aliases. Confirm an actual dirty save reloads successfully and does not
     lose the active engine, layout state, or canvas dimensions.

5. **Architecture and scope**
   - Flag any widening of `scripts/preview/*.js`, duplicate runtime authority,
     stale browser bundle, source-only test, or misleading green validation.
   - Confirm authored YAML stays semantic and compact; image-to-YAML output
     must not contain large populations of fixed width/height workarounds.

## Required output

Write concise, actionable findings directly into `AGENT-INBOX.md` under a new
dated **Opus adversarial review findings** section. Preserve the existing active
handoff. Each finding must include severity, exact owner/file, a reproduction
or evidence path, and a recommended disposition. Record `No findings` only
after the live save/reload and resize paths have been exercised.

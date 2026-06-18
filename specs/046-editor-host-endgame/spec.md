# Feature Specification: Editor host endgame

**Feature Branch**: `feat/046-editor-host-endgame`

**Created**: 2026-06-16

**Status**: Complete

Closeout note: preview-shell engine onboarding no longer needs to start in
`editor.js`, and the remaining `layout-bridge.js` runtime now sits behind a
typed `previewBridge.host` owner instead of acting as the browser-side
integration sink.

Final checkpoint note: the bridge no longer owns arrow render/patch, frame/SVG
patch behavior, bootstrap/state ownership, or local-vs-ELK relayout
orchestration. Those now live behind typed owners including
`app-inspector-display-runtime.ts`,
`app-inspector-selection-runtime.ts`, and
`app-layout-bridge-runtime.ts`. `editor.js` still remains a large coordinator
at about 1.7k lines, but the spec closeout bar is responsibility-based rather
than a literal line-count target: future engine onboarding no longer needs to
widen either `editor.js` or `layout-bridge.js`, and the cold-start answer now
starts at typed registration points.

**Priority**: Highest active preview-shell follow-up

**Depends on**: spec 043 (archived complete), spec 044 (in progress), spec 045 (in progress), spec 038 (archived complete)

## Problem Statement

Spec 043 was successful in one important sense: shared preview behavior moved into typed `preview-shell` owners instead of continuing to grow only inside `scripts/preview/editor.js`.

But that closeout left a second problem unresolved:

- `scripts/preview/editor.js` is still about 2.8k lines
- it remains the main browser entrypoint for the grid shell
- cold-start maintainers still have to reopen one large trap file to understand load, selection, drag, resize, text edit, tree UI, and bootstrap wiring
- every new engine discussion keeps rediscovering the same concern: "is this really the end state?"

For a repo targeting 20-50 engine lanes, the answer must be **no**.

The current `editor.js` is better than the old monolith, but it is still too large and too central to count as finished architecture. Repeated "500 lines smaller" iterations without an explicit endgame simply defer the same problem.

## Mission

Finish the editor-host decomposition so `scripts/preview/editor.js` stops being an architectural bottleneck and becomes a genuinely thin entry/bootstrap file for the grid shell.

For closeout purposes, "thin" must be judged against the real scaling goal:
the preview shell must stop being a blocker for adding dozens or hundreds of
future engine lanes.

For this spec, the scaling target is not rhetorical. Closeout must be judged
against readiness for roughly **150 distinct layout engines / diagram
algorithms**, including:

- external dependencies such as `elkjs`
- ports of multi-diagram suites such as Mermaid families
- fully bespoke in-house layout engines

## Product decision

Do **not** assume `editor.js` should remain a 3k-line hand-authored monolith.

Small JS host glue is acceptable in a TypeScript-led repo.
Large, behavior-heavy shell trap files are acceptable only as a migration state.
This spec exists to end that migration state.

## Why now

The best time to tackle this is **now**, before more engine lanes are added.

Reasons:

1. every new grid-lane feature still pays `editor.js` coordination cost
2. shell tiers are not yet stable enough to support many engine lanes cleanly
3. continuing with only server-host modularity or only bridge decomposition would leave the main grid-shell entrypoint as the same cold-start bottleneck

Spec 045 remains useful, but non-critical preview-host work should not outrank this editor-host endgame.

## Scope

This spec covers:

- remaining ownership slices still concentrated in `scripts/preview/editor.js`
- extraction of browser-edge host/coordinator behavior into typed or narrowly-owned modules
- explicit closeout criteria for when `editor.js` is actually thin enough
- trap-file guardrails so the same monolith does not quietly regrow
- the browser-shell side of the "can we add many more engines without touching
  the legacy JS sink files?" closeout test

This spec does not cover:

- `layout-bridge.js` decomposition beyond the work owned by spec 044
- Node preview-host/server modularity beyond the work owned by spec 045
- a framework rewrite
- changing YAML document semantics

## Architectural position

- **Spec 044** owns browser contract shape, bundle boundaries, and `layout-bridge.js`.
- **Spec 045** owns Node preview-host modularity.
- **Spec 046** owns the remaining grid-shell entrypoint monolith: `scripts/preview/editor.js`.

## User Scenarios & Testing

### User Story 1 - Change a grid-shell behavior without reopening a 3k-line file (Priority: P1)

As a maintainer, I want grid-shell behavior changes to land in concern-owned modules so I do not have to patch one large browser entry file for every interaction fix.

**Independent test**: a bounded interaction or bootstrap fix can be implemented without editing a large cross-cutting region of `editor.js`.

### User Story 2 - Add more engine lanes without treating `editor.js` as the integration sink (Priority: P1)

As a maintainer, I want future engine-lane work to integrate through shell tiers and contracts rather than defaulting to `editor.js`.

**Independent test**: a new engine-facing hook can be wired without growing `editor.js` as the main integration layer.

### User Story 4 - Onboard a new engine lane without touching legacy JS sinks (Priority: P1)

As a platform maintainer, I want the browser-shell path for a future engine lane
to start from typed registration points rather than from `editor.js` or
`layout-bridge.js`, so scaling to dozens of engines does not recreate the same
monolith in a different file.

**Independent test**: an engine that reuses an existing shell tier can be
registered through preview-engine / preview-host owners without modifying
`editor.js`, and without widening `layout-bridge.js` for engine-specific
behavior.

### User Story 5 - Support large engine diversity without browser-shell rewrites (Priority: P1)

As a platform maintainer, I want external libraries, ported diagram families,
and bespoke engines to enter the system through the same architectural seams so
the next 50-150 engines do not require repeated shell rewrites.

**Independent test**: representative engines from all three categories can be
described as registrations/adapters against the existing host/shell contracts,
without new engine-specific branches in the legacy JS trap files.

### User Story 3 - Cold-start review sees a thin entrypoint, not a hidden host monolith (Priority: P1)

As a reviewer, I want the residual `editor.js` to read as obvious bootstrap/event glue so the project looks like a modular TS/YAML/Node system instead of a repo still anchored by one legacy browser file.

**Independent test**: the remaining `editor.js` can be skimmed quickly, with each major concern mapping to an explicit owner outside the file.

## Requirements

### Functional Requirements

- **FR-001**: `scripts/preview/editor.js` MUST stop being the default home for new grid-shell behavior.
- **FR-002**: Remaining concern-heavy regions in `editor.js` MUST be assigned to explicit owners or extraction targets.
- **FR-003**: New engine-facing shell hooks MUST prefer typed shell tiers/contracts over widening `editor.js`.
- **FR-004**: The final residual `editor.js` MUST be limited to bootstrap, DOM lookup, event hookup, and thin coordinator glue.
- **FR-005**: This spec MUST preserve the namespaced browser contract established by spec 044 and MUST NOT reintroduce flat `LayoutEngine.*` consumers.
- **FR-006**: Closing this spec MUST require that adding a future engine lane
  which reuses an existing shell tier does not need behavioral edits in
  `editor.js`.
- **FR-007**: `editor.js` MUST NOT remain the place where engine identity,
  engine capability branching, or engine-specific control wiring accumulates.
- **FR-008**: This spec MUST define a browser-shell onboarding proof that can be
  used to reject false closeout.
- **FR-009**: Spec 046 closeout MUST be blocked if `layout-bridge.js` still
  functions as an equivalent browser-side integration sink for new engines,
  even though the extraction work there remains owned by spec 044.
- **FR-010**: Spec 046 closeout MUST require an explicit engine-scale
  acceptance gate framed around readiness for approximately 150 engines, not
  around the current two-engine state.
- **FR-011**: Adding an engine that reuses an existing shell tier MUST require
  only:
  1. preview-engine registration / manifest work
  2. preview-host lane registration when a new lane is actually needed
  3. engine-local adapter work inside typed TypeScript owners
  It MUST NOT require behavior edits in `editor.js` or engine-specific
  branching in `layout-bridge.js`.
- **FR-012**: Browser-shell capability routing MUST be based on typed
  shell-mode / capability contracts, not on accumulating engine-name
  conditionals in legacy JS files.
- **FR-013**: Representative future engine classes MUST be supportable through
  the same seams:
  1. external library-backed engines
  2. ported multi-diagram families
  3. bespoke engines
- **FR-014**: Closing spec 046 MUST be blocked if a reviewer can still
  plausibly say "to add engine X, start by editing `editor.js`" or "add a new
  special case in `layout-bridge.js`."

### Non-Functional Requirements

- **NFR-001**: This work MUST optimize for the true end state, not just incremental line-count reduction.
- **NFR-002**: The spec SHOULD define a concrete trap-file bar so completion is not ambiguous.
- **NFR-003**: The resulting architecture SHOULD make `editor.js` materially easier to replace, bundle-split, or adapt for more shell tiers later.
- **NFR-004**: The closeout bar SHOULD be evaluated against the "50-150 engine"
  scaling target, not against the current two-engine reality.
- **NFR-005**: Acceptance criteria SHOULD be strong enough to stop "500 lines
  smaller" from being mistaken for architecture closure.

## Success Criteria

- **SC-001**: `editor.js` is no longer a multi-thousand-line architectural trap
  file that future engine work must widen, even if the file remains larger than
  an ideal thin bootstrap.
- **SC-002**: No major grid-shell concern remains ownerless.
- **SC-003**: Cold-start maintainers can map load/bootstrap, tree UI, inspector actions, drag/resize, text edit, selection, and relayout coordination to explicit owners outside `editor.js`.
- **SC-004**: The project can add further engine lanes without treating `editor.js` as the main sink for browser integration.
- **SC-005**: A future engine lane that reuses an existing shell tier can be
  onboarded without editing `editor.js`.
- **SC-006**: No remaining preview-shell JS trap file reads like the mandatory
  integration sink for future engine lanes.
- **SC-007**: A reviewer can articulate the onboarding path for approximately
  150 heterogeneous engines without requiring repeated browser-shell rewrites.
- **SC-008**: At least one representative engine from each major future class
  can pass the onboarding proof:
  1. external dependency-backed engine
  2. ported diagram-family engine
  3. bespoke in-house engine
- **SC-009**: Neither `editor.js` nor `layout-bridge.js` remains the default
  place to add engine identity checks, engine-local control wiring, or
  engine-specific render/update branches.

## Closeout bar

This spec is not done when `editor.js` is merely "smaller."

It is done when all of the following are true:

1. `editor.js` reads as a thin entry/bootstrap file rather than as the main behavioral surface.
2. No single remaining hand-authored preview-shell JS trap file is obviously blocking cold-start maintenance.
3. The remaining size of `editor.js` is small enough that a reviewer can reasonably skim it end-to-end.
4. A maintainer can describe the browser-shell onboarding path for another
   engine lane without saying "edit `editor.js`" or "add another bridge special
   case."
5. If an engine reuses an existing shell tier, its onboarding proof can be
   satisfied through typed registry / host / shell owners rather than through
   the legacy JS sink files.
6. The same statement must still hold when the hypothetical engine is from any
   of these categories:
   - external dependency-backed layout engine
   - ported diagram family / suite
   - bespoke in-house engine
7. A reviewer must be able to imagine repeating that onboarding pattern across
   roughly 150 engines without predicting that `editor.js` or
   `layout-bridge.js` will become the integration sink again.

The exact line count is not the sole goal, but this spec should treat anything still around the current ~2.8k-line scale as unfinished.

For practical closeout review, anything where `editor.js` still reads as a
behavior-bearing coordinator instead of obvious bootstrap glue should be treated
as unfinished even if the task checklist is mostly checked off.

## Browser-shell onboarding proof

Spec 046 cannot close without an explicit sanity check framed like this:

1. Register a representative future engine through the preview-engine and
   preview-host owners.
2. Reuse an existing browser shell tier where possible.
3. Confirm that onboarding did not require new behavior in `editor.js`.
4. Confirm that onboarding did not rely on widening `layout-bridge.js` with
   engine-specific branching.

This is a design/ownership proof, not necessarily a full product launch of a
new engine.

## 150-engine readiness acceptance criteria

Spec 046 MUST NOT close unless all of the following are true:

1. **No legacy-JS-first onboarding**
   A maintainer adding a new engine must not begin in `scripts/preview/editor.js`
   or `scripts/preview/layout-bridge.js` unless they are fixing a regression in
   an existing shell tier.

2. **Three-class onboarding proof**
   The architecture must support a credible onboarding story for:
   - an external dependency-backed engine such as `elkjs`
   - a ported diagram family such as Mermaid-derived diagram types
   - a bespoke in-house engine

3. **Capability-driven shell routing**
   Browser-shell behavior must be explainable through shell tiers, manifests,
   capabilities, and typed preview-shell / preview-host owners rather than
   through engine-name branching in legacy JS.

4. **Legacy files are not engine sinks**
   `editor.js` and `layout-bridge.js` must both read as thin adapters around
   typed owners, not as the practical location where future engines would need
   bespoke logic.

5. **Cold-start answer test**
   If a cold-start reviewer asks "how do I add 150 engines?", the answer must
   begin with typed registration points (`preview-engine`, `preview-host`,
   shell-mode/capability owners) rather than with the trap files.

6. **False-closeout veto**
   Even if the checklist is mostly green, spec 046 remains open whenever the
   honest answer to the 150-engine question is "we would still have to widen the
   legacy browser shell."

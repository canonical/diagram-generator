# Implementation Plan: Repository coherence rewrite

**Branch**: `feat/spec-kit-retrofit-core-engine-specs` | **Date**: 2026-05-31 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-repo-coherence-rewrite/spec.md`

## Summary

Execute the repo-wide audit requested in `docs/gpt-5.5-audit-context.md` as a controlled rewrite. The work starts by recording evidence, then closes spec 007, collapses duplicate authority, removes renderer-side style reinterpretation, deletes stale compatibility paths, and finishes with focused tests plus browser verification.

The goal is not to preserve local precedent. The goal is to leave the repo harder to misuse.

## Technical Context

**Languages**: Python 3.11+, TypeScript, browser JavaScript, Markdown

**Primary code paths**:

- `scripts/frame_loader.py`
- `scripts/layout_v3.py`
- `scripts/frame_style_classes.py`
- `scripts/frame_yaml_persistence.py`
- `scripts/preview/layout-bridge.js`
- `scripts/preview/editor.js`
- `scripts/preview_server.py`
- `packages/layout-engine/src/resolve-styles.ts`
- `packages/layout-engine/src/frame-classes.ts`
- `packages/layout-engine/src/frame-classes.contract.json` (remove as authored source or demote to generated artifact)

**Primary docs**:

- `.github/copilot-instructions.md`
- `DIAGRAM.md`
- `docs/frame-classes.md`
- `STATUS.md`
- `TODO.md`
- `ROADMAP.md`
- `specs/007-style-foundation-unification/`
- `docs/gpt-5.5-audit-context.md`

**Testing**:

- `npm --prefix packages/layout-engine test`
- `npm --prefix packages/layout-engine run build`
- `npm --prefix packages/layout-engine run build:browser`
- `python -m pytest scripts/test_frame_loader.py scripts/test_autolayout.py scripts/test_layout_v3.py scripts/test_parity.py scripts/test_frame_classes.py scripts/test_frame_yaml_persistence.py scripts/test_style_parity.py scripts/test_preview_support_engineering_flow.py -q`
- browser verification at `http://127.0.0.1:8100/view/v3:<slug>` after preview/editor changes

**Constraints**:

- no interactive Python relayout fallback
- no new JSON or YAML sidecar authority
- no `localStorage` in the v3 interactive editing path
- no faux small caps
- no renderer-side raw fill/border style heuristics
- no new status-like docs
- no broad rewrites before evidence is recorded
- do not revert unrelated dirty work

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| Anti-patch protocol | PASS | Classification: architectural contract cleanup. Fixes land at owning layers. |
| Layer ownership | PASS | The plan removes renderer/editor ownership of style semantics. |
| DIAGRAM.md visual contract | PASS | Visual prose remains in `DIAGRAM.md`; machine contract becomes derived/testable. |
| Test before ship | PASS | Each phase has validation gates. |
| Sensible defaults | PASS | Removes redundant overrides and sidecar authorities that mask defaults. |
| Stable public interfaces | CAUTION | Any layout-engine API break must be recorded in `HISTORY.md`. Prefer additive internal fields only. |
| No format lock-in | PASS | No new repo-named persisted format. |
| Semantic YAML | PASS | Raw visual fields should contract, not expand. |

## Authority Map

Use this map whenever files disagree:

| Concept | Normative authority | Allowed derivatives |
|---------|---------------------|---------------------|
| workflow discipline | `.github/copilot-instructions.md` | `STATUS.md` summary only |
| visual language prose | `DIAGRAM.md` | `docs/frame-classes.md` references |
| frame class semantics | `docs/frame-classes.md` | generated code/data artifacts only; `packages/layout-engine/src/frame-classes.ts` and `scripts/frame_style_classes.py` are adapters, not authored truth |
| interactive execution | `specs/007-style-foundation-unification/spec.md` plus this spec | `STATUS.md`, `TODO.md` summaries |
| active tasks | Spec Kit `tasks.md` files and `TODO.md` | `STATUS.md` current-state pointer |
| future direction | `ROADMAP.md` | no duplicate backlog elsewhere |
| completed work | `HISTORY.md` | terse current-state mentions only |
| authored diagram state | `scripts/diagrams/frames/*.yaml` | generated exports and preview serialization |

## Seed Findings To Verify First

These are not final findings until Phase 1 records exact line references, but they give GPT 5.4 a grounded starting queue:

1. `scripts/preview/layout-bridge.js` still contains raw `frame.fill === LayoutEngine.Fill.BLACK` branches for icon/text contrast after `resolvedFill`/`resolvedStroke` were added.
2. `scripts/frame_loader.py` still contains raw black-fill heading propagation branches; verify whether this belongs in semantic resolution or is still necessary for synthetic heading construction.
3. `docs/architecture/v3-engine-audit.md` still references `/api/relayout-v3/<slug>`, which current docs say was removed.
4. `ROADMAP.md` still describes replacing `requestV3Relayout()` with local layout as future work, while `STATUS.md` and spec 007 say it is complete.
5. `docs/diagram-schema.json` still lists `accent` as a style enum while spec 007 says `accent` is a legacy alias and the v3 editor style vocabulary no longer uses it.
6. `TODO.md`, `STATUS.md`, and `ROADMAP.md` each restate migration state in enough detail to diverge.
7. `DIAGRAM.md`, `docs/frame-classes.md`, `frame-classes.contract.json`, Python resolver code, and TS resolver code can all look like separate style authorities unless the generated/derived relationship is made explicit.
8. `scripts/text_metrics.py`, `scripts/diagram_shared.py`, and TS text adapters need role labels so old measurement heuristics are not treated as interactive truth.
9. Existing JSON parity fixtures may be acceptable as generated test data, but new tests should prefer semantic vectors rather than serialized runtime snapshots.

## Workstreams

### WS0 - Evidence and guardrails

Record a concrete findings list before code edits. Each finding must include file path, line number, severity, owner layer, and proposed action: rewrite, delete, derive, or keep.

### WS1 - Close spec 007 before broad rewrite

Finish the remaining adversarial review tasks in `specs/007-style-foundation-unification/tasks.md`. Do not start speculative architecture cleanup while 007 still has open closure gates.

### WS2 - Collapse documentation authority

Rewrite current-state docs so each file has one role. Delete or archive stale architecture docs only after durable facts move to the correct canonical file.

### WS3 - Make style contract single-source

Make `docs/frame-classes.md` the explicit authored authority for frame-class semantics. Any JSON artifact must be generated or removed; it cannot remain a hand-authored source of truth.

### WS4 - Make renderers consume a resolved style snapshot

Create or consolidate a resolved style snapshot that includes fill, stroke, text color, icon color, heading typography, and border visibility. Renderers should read it directly. No renderer should infer contrast from raw `fill`.

### WS5 - Remove interactive state forks

Delete server fallback paths, stale comments, sidecar authority hooks, and localStorage usage in v3 interactive state. Keep save/export APIs that write canonical YAML.

### WS6 - Contract Python to oracle/export roles

Label or delete Python code. Retained Python modules must serve parsing/defaults, batch/export rendering, or parity validation. Delete compatibility helpers that only exist for old interactive behavior.

### WS7 - Validation and migration-end checklist

Run TS, Python, preview, and browser checks. Update `STATUS.md`, `TODO.md`, `ROADMAP.md`, and `HISTORY.md` in the same change-set as any behavior change.

## Rewrite Plans Required By The Audit Brief

### Prioritized Findings List

Write the final findings list into this `plan.md` under "Audit Ledger" before implementation. Use this format:

```text
P1 | file:line | owner layer | problem | action | validation
```

### Single Authoritative Architecture

Target architecture:

```text
Frame YAML
  -> parser/defaults (`scripts/frame_loader.py`)
  -> semantic style resolution (shared frame-class contract)
  -> layout/measure/place (TS interactive, Python oracle/export)
  -> resolved layout + resolved style snapshot
  -> renderers/preview patchers (no reinterpretation)
  -> canonical YAML save/export
```

### Deletion Plan

Default deletion candidates, subject to evidence:

- stale `/api/relayout-v3` docs and tests
- interactive server fallback branches
- renderer raw style heuristic branches
- legacy `accent` vocabulary in v3 paths
- JSON sidecar override authority for v3 editing
- localStorage-backed v3 state
- compatibility comments that describe removed migration modes
- tests that certify serialized defaults instead of semantic behavior
- Python helpers not serving parser/default/export/parity roles

### Doc Rewrite Plan

- `DIAGRAM.md`: visual prose only; point to frame-class contract for testable class table.
- `docs/frame-classes.md`: concise machine-facing explanation; no competing prose defaults.
- `STATUS.md`: short current state; remove long historical implementation narrative.
- `TODO.md`: active work only; remove permanent visual rules and completed history.
- `ROADMAP.md`: future direction only; remove completed migration descriptions that sound active.
- `HISTORY.md`: completed work archive.
- `docs/architecture/*`: delete, archive, or mark historical if stale; do not let old audits override current specs.

### Code Rewrite Plan

- Add or consolidate one resolved style object on frame/layout output.
- Populate it from the frame-class semantics owned by `docs/frame-classes.md` after YAML semantic fields and overrides are applied.
- Thread it through the live TS model, preview patching, and TS SVG rendering. Audit retained Python/export paths only to avoid stale reinterpretation; do not extend `scripts/layout_v3.py` just to mirror TS snapshot fields.
- Replace raw fill/border branches in renderers with resolved style reads.
- Keep raw authored fields available for persistence only, not rendering decisions.
- Add tests that fail if leaves resolve white, panels lose grey class fill, sections use faux small caps, or highlighted text/icon contrast comes from raw fill.

### Migration-End Checklist

The migration is complete only when all are true:

- v3 interactive relayout has no server fallback.
- v3 interactive state has no localStorage authority.
- v3 save/load writes canonical YAML fields in place.
- no v3 JSON sidecar acts as diagram or editor state authority.
- renderers consume resolved style semantics.
- HarfBuzz-backed measurement is required for interactive text measurement.
- Python is documented and tested as batch/export oracle only.
- docs no longer disagree about the above.
- focused TS tests and one browser/export smoke check pass; run focused Python tests only when the touched slice still owns a retained Python contract.

## Audit Ledger

Worktree overlap recorded from `git status --short --branch` on 2026-05-31:
`DIAGRAM.md`, `STATUS.md`, `TODO.md`, `HISTORY.md`, `docs/frame-classes.md`, `scripts/frame_loader.py`, `scripts/layout_v3.py`, `scripts/preview/editor.js`, `scripts/preview/layout-bridge.js`, `scripts/preview_server.py`, `packages/layout-engine/src/*`, `packages/layout-engine/tests/*`, and `specs/007-style-foundation-unification/*` already have user or prior-agent edits in flight. Do not revert unrelated changes while executing this plan.

P1 | `scripts/preview/layout-bridge.js:327-349` | preview patcher | `_frameBoxRenderState()` still derives icon/text contrast from raw `frame.fill === LayoutEngine.Fill.BLACK` after `resolvedFill` / `resolvedStroke` were introduced. This is a renderer-side style fork. | Rewrite this path to consume a resolved style snapshot end-to-end, including text/icon contrast. | `npm --prefix packages/layout-engine test`; `python -m pytest scripts/test_preview_support_engineering_flow.py -q`

P1 | `scripts/preview/editor.js:4508-4546`; `scripts/frame_yaml_persistence.py:10-15,196-208` | interactive editor + persistence | Style semantics are duplicated in the inspector/persistence layer (`default` / `parent` / `section` / `annotation` / `highlight`) instead of being derived from one shared contract. | Collapse style-option mapping into one shared semantic source or explicitly generated helper consumed by editor and YAML persistence. | `python -m pytest scripts/test_frame_yaml_persistence.py scripts/test_preview_support_engineering_flow.py -q`

P1 | `scripts/test_frame_classes.py:142-155` | test contract | Section headings are validated as small-caps unconditionally, which conflicts with the repo's explicit fallback rule of bold sentence case at authored size when editable SVG cannot honestly render true small caps. | Rewrite the test to validate the allowed contract rather than a single typography implementation. | `python -m pytest scripts/test_frame_classes.py -q`

P1 | `docs/architecture/v3-engine-audit.md:29,74,94` | stale architecture docs | The doc still treats `/api/relayout-v3/<slug>` and `scripts/test_relayout_v3.py` as current, while `STATUS.md` and spec 007 say the endpoint and test were removed. | Delete, archive, or mark this document historical after moving any still-useful facts to canonical docs. | `rg -n "relayout-v3|test_relayout_v3" docs STATUS.md TODO.md ROADMAP.md specs`

P1 | `ROADMAP.md:208-221` | roadmap | Stage 15.5 is still written as a future migration program ("Replace `requestV3Relayout()` HTTP POST with synchronous local layout call") even though the current repo state says this cutover is complete. | Rewrite Stage 15.5 so it reflects completed cutover plus remaining future work only. | `rg -n "requestV3Relayout|Stage 15.5|interactive execution path" ROADMAP.md STATUS.md TODO.md specs/007-style-foundation-unification`

P1 | `STATUS.md:19,71-80`; `TODO.md:158-161` | current-state docs | Migration state is restated in multiple files with enough detail to drift. `STATUS.md` still says "Spec 007 Phase 7 is now in progress" while `TODO.md` says the interactive path is already single-path and only parity/oracle work remains. | Collapse these files to one concise current-state story and let spec tasks own migration closure detail. | Human review plus `rg -n "Phase 7|interactive state|single interactive|oracle/reference" STATUS.md TODO.md`

P2 | `docs/diagram-schema.json:127-130,149` | schema/docs | Legacy `accent` remains in the schema enum and the description still frames style as a raw fill/text preset. This conflicts with the v3 style vocabulary and semantic frame-class direction. | Either remove the legacy enum from current docs or explicitly mark this schema as non-v3 historical scope. | `rg -n "\\baccent\\b|box_style|style" docs/diagram-schema.json specs/007-style-foundation-unification docs/frame-classes.md`

P2 | `packages/layout-engine/src/resolve-styles.ts:74-82`; `scripts/frame_loader.py:403-410` | style resolver | Highlight and synthetic-heading behavior still pivot on raw `Fill.BLACK` inside the resolver. This may be acceptable if the resolver is the only owner, but it is currently indistinguishable from legacy raw-fill semantics. | Decide whether raw fill remains the semantic carrier for highlight in the resolver or replace it with an explicit variant/class field. In either case, keep this logic in the resolver only and remove it everywhere else. | `npm --prefix packages/layout-engine test`; `python -m pytest scripts/test_style_parity.py scripts/test_frame_classes.py -q`

P2 | `scripts/frame_loader.py:233-245` | parser/defaults | Synthetic heading creation derives heading fill and icon fill from parent raw fill during parse. That couples parse-time structure synthesis to style semantics and duplicates resolver intent. | Either move heading contrast into resolved style output or document this as a temporary parser bridge and cover it with parity tests. | `python -m pytest scripts/test_frame_loader.py scripts/test_style_parity.py -q`

P1 | `packages/layout-engine/src/frame-classes.contract.json`; `packages/layout-engine/src/frame-classes.ts:2,65-88`; `scripts/frame_style_classes.py:26-64`; `docs/frame-classes.md` | shared contract | The repo now has a JSON frame-class artifact plus TS/Python loaders plus prose docs. The JSON file cannot remain a hand-authored authority without violating the repo's no-sidecar-authority direction. | Make `docs/frame-classes.md` the authored source and either generate the JSON artifact from it or delete the JSON artifact entirely. Do not expand the JSON file as a new truth layer. | `npm --prefix packages/layout-engine test`; `python -m pytest scripts/test_frame_classes.py -q`

P2 | `scripts/preview/editor.js:18-30,3025,4032` | preview/editor commentary | Compatibility-shim and server-relayout comments still describe obsolete architecture even where behavior is already local-only. These comments will mislead cold-start agents. | Remove or rewrite stale comments after verifying the code path is genuinely local-only. | `rg -n "compatibility shims|server relayout|round-trip" scripts/preview/editor.js scripts/preview/layout-bridge.js`

P3 | `packages/layout-engine/tests/fixtures/style-parity-fixtures.json`; `scripts/test_style_parity.py`; `packages/layout-engine/tests/style-parity.test.ts` | tests/fixtures | Shared JSON parity fixtures are defensible as cross-language vectors, but they should remain semantic contract fixtures, not grow into runtime snapshots that restate defaults node by node. | Keep the fixture set semantic and small; reject future machine-expanded snapshot growth. | Review fixture diffs during future test additions

## Stop Rules

Stop and update this spec before proceeding if:

- a task requires preserving a compatibility branch only for comfort
- a proposed fix adds another source of truth
- a proposed fix turns a JSON or YAML sidecar into an authored semantic authority
- a renderer needs raw style heuristics to pass tests
- a test fixture must become a serialized runtime snapshot instead of a semantic vector
- user changes overlap with the files being rewritten in a way that makes intent unclear

## Validation Gates

1. Phase 1 evidence ledger complete.
2. Spec 007 T064 and T065 complete or explicitly superseded by this spec with rationale.
3. Style contract tests pass in TS and Python.
4. Preview/editor tests pass without server fallback.
5. Browser verification passes for at least `support-engineering-flow` or another representative v3 diagram.
6. Current-state docs are aligned in the same final change-set.

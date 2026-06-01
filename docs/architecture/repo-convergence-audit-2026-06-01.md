# Repository Convergence Compliance Audit — 2026-06-01

> **HISTORICAL** – this is an audit snapshot, not an active plan. Durable
> findings have been triaged into `specs/008-repo-coherence-rewrite/` and
> the canonical workflow docs. Do not add new findings here.

Status: `PARTIAL COMPLIANCE`

This is an audit artifact, not a canonical architecture source. The durable
authorities should remain `DIAGRAM.md`, `docs/frame-classes.md`,
`.github/copilot-instructions.md`, `STATUS.md`, `TODO.md`, `ROADMAP.md`, and
the active Spec Kit package.

## Scope

Compared:

- prior cleanup brief: `docs/gpt-5.5-audit-context.md`
- active Spec Kit packages: `specs/007-style-foundation-unification/`,
  `specs/008-repo-coherence-rewrite/`
- historical PM/docs stack: `README.md`, `ROADMAP.md`, `TODO.md`, `STATUS.md`,
  `HISTORY.md`, `.github/agents/agent.md`, `.github/skills/*`
- live code and tests in `scripts/` and `packages/layout-engine/`
- current branch/worktree and runtime smoke behavior

Validation run during this audit:

- `npm --prefix packages/layout-engine test`
- `python -m pytest scripts/test_frame_loader.py scripts/test_autolayout.py scripts/test_layout_v3.py scripts/test_parity.py scripts/test_frame_classes.py scripts/test_frame_yaml_persistence.py scripts/test_style_parity.py scripts/test_preview_support_engineering_flow.py -q`
- `npm --prefix packages/layout-engine run build`
- `npm --prefix packages/layout-engine run build:browser`
- preview smoke:
  - `GET /view/v3:support-engineering-flow` -> `200`
  - `GET /api/frame-tree/support-engineering-flow` -> `200`
  - `GET /view/memory-wall` -> `404`
  - `GET /force/view/force-juju-landing-pages` -> `404`

## Executive Judgment

The repository is converging on the intended v3 editor direction, but it is
not yet a fully coherent single-path system.

What is genuinely converged:

- v3 persisted authority is YAML, not `localStorage` or a JSON sidecar.
- v3 edits save back into the original YAML in place.
- v3 interactive relayout is local TypeScript only; the Python relayout
  fallback path is gone.
- HarfBuzz-backed browser measurement is live and required for the interactive
  path.

What is not yet converged:

- TypeScript is not the only renderer or end-to-end execution path.
- Python still bootstraps the live preview by producing the initial SVG,
  component tree, and grid metadata.
- style semantics are cleaner, but still duplicated across Python, TS, editor
  UI maps, persistence maps, and stale docs.
- the repo’s human/agent guidance is unsafe: several root docs, agent prompts,
  and skills still instruct dead pipelines, missing files, and 404 routes.

The current code changes are reducing ambiguity in the engine and persistence
path, but the documentation/governance layer is still adding contradictory
precedent. Right now the highest-risk failure mode is not test failure; it is a
future agent following the wrong local document.

## Compliance Matrix

| Target state | Status | Evidence |
|---|---|---|
| YAML is the persisted source of truth | `COMPLIANT` | `scripts/preview/editor.js:5339-5379`, `scripts/frame_yaml_persistence.py:318-355` |
| No persistent local storage in v3 | `COMPLIANT` | repo-wide search found no v3 `localStorage` usage in code |
| No JSON sidecar authority in v3 | `COMPLIANT IN CODE`, `NON-COMPLIANT IN HISTORICAL DOCS` | save path writes YAML; historical docs still describe JSON overrides |
| Browser/editor saves flatten back into original YAML | `COMPLIANT` | `scripts/frame_yaml_persistence.py:252-355`; tests pass |
| TS local-only interactive relayout | `COMPLIANT` | `scripts/preview/editor.js:5074-5177`, no `/api/relayout*` route in `scripts/preview_server.py:702-766` |
| TS is the only renderer/execution path | `NON-COMPLIANT` | initial load still depends on Python layout + render + component-tree endpoints |
| Python limited to oracle/export only | `PARTIAL` | Python still serves initial preview SVG/tree and still owns shared primitive/render modules |
| One authoritative docs stack | `NON-COMPLIANT` | root docs, repo agent prompt, and skills still teach removed/missing surfaces |

## Actual Canonical Execution Path Today

This is the real v3 path in the current repo, as implemented:

1. Authored state lives in `scripts/diagrams/frames/*.yaml`.
2. `scripts/preview_server.py` loads YAML through `scripts/frame_loader.py`.
3. Python lays out and renders the initial preview via `scripts/layout_v3.py`
   and `scripts/diagram_render_svg.py`, and also serves:
   - `/api/tree/<slug>` from Python layout result
   - `/api/grid/<slug>` from Python layout result
   - `/api/frame-tree/<slug>` from raw pre-layout frame YAML serialization
4. The browser editor loads the Python-rendered SVG plus the Python component
   tree/grid, then initializes the TypeScript layout bridge from
   `/api/frame-tree/<slug>` and HarfBuzz.
5. Interactive edits relayout locally in TS only.
6. Save posts canonical override payloads back to `/api/overrides/<slug>`,
   which rewrites the original YAML in place.
7. Reload returns to the Python bootstrap path again.

Conclusion: the repo has one persisted authority and one interactive relayout
executor, but not one end-to-end runtime representation.

## Priority Findings

### P1 — Repo guidance is actively unsafe

- `README.md` still instructs users and agents to use removed pipelines,
  missing scripts, and dead routes: `README.md:43-50`, `69-80`, `111-174`,
  `178-205`, `334-471`.
- `.github/agents/agent.md` still tells agents to ask which of three pipelines
  to use and references files that do not exist:
  `.github/agents/agent.md:44-50`.
- `.github/skills/diagram-build-validate/SKILL.md` is built around missing
  scripts and old v1/v2 workflows:
  `.github/skills/diagram-build-validate/SKILL.md:11-25`.
- `.github/skills/diagram-redraw/SKILL.md` still routes work through missing
  generator/build/compare scripts:
  `.github/skills/diagram-redraw/SKILL.md:28-30`.
- `.github/copilot-instructions.md` still points its Spec Kit note at
  `specs/004-diagram-audit/plan.md` instead of the active work package:
  `.github/copilot-instructions.md:296-299`.

Assessment: this is the single biggest ambiguity source in the repo.

### P1 — ROADMAP still codifies the architecture that the repo is trying to delete

- The architecture blueprint still states:
  - multiple layout engines including force and `v2` fallback:
    `ROADMAP.md:41-47`
  - Layer 6 sidecar override persistence via stable IDs:
    `ROADMAP.md:53-55`
- Stage numbering is duplicated and historical layers are interleaved with
  active ones:
  `ROADMAP.md:172`, `176`, `189`, `199`, `208`.

Assessment: the stated architecture blueprint conflicts directly with the
current v3 YAML-only persistence direction. This cannot remain the repo’s
"non-negotiable" blueprint in its current form.

### P1 — TypeScript is not yet the only renderer or end-to-end runtime

- initial preview SVG is still rendered in Python:
  `scripts/preview_server.py:983-1007`
- the editor still bootstraps from Python component tree and grid endpoints:
  `scripts/preview/editor.js:431-465`
- the TS bridge fetches a second, raw frame-tree projection from the server:
  `scripts/preview/layout-bridge.js:905-957`

Assessment: interactive relayout is single-path TS, but load/bootstrap is still
Python-first and dual-projection. That is convergence, not completion.

### P1 — The resolved-style contract is still incomplete and duplicated

- the only explicit resolved style fields on `Frame` are fill/stroke:
  `scripts/frame_model.py:136-138`,
  `packages/layout-engine/src/frame-model.ts:209-211`, `277-279`
- text color, icon color, and heading style are still pushed by mutating labels
  and `icon_fill` in Python and TS frame-class adapters:
  `scripts/frame_style_classes.py:15-23`, `97-135`,
  `packages/layout-engine/src/frame-classes.ts:9-16`, `110-157`
- the editor also carries its own semantic style map:
  `scripts/preview/editor.js:4511-4516`
- YAML persistence carries another semantic style map:
  `scripts/frame_yaml_persistence.py:9-18`

Assessment: the repo has removed the hand-authored JSON contract, but it has
not yet reduced style semantics to one machine-owned source. It now has
prose authority plus multiple code maps.

### P1 — `README.md`, `DIAGRAM.md`, `STATUS.md`, and runtime disagree on live surfaces

- `README.md` claims `view/memory-wall` and force routes are demo surfaces:
  `README.md:48-50`, `189-193`; both were `404` in this audit.
- `README.md` says override persistence is JSON drafting state:
  `README.md:205`, while current v3 save writes YAML.
- `DIAGRAM.md` still recommends dead commands:
  `DIAGRAM.md:667-670`
- `STATUS.md` is more current at the top, but later sections still cite missing
  scripts and old build lanes:
  `STATUS.md:95`, `114`, `119`, `165`, `169`, `170`.

Assessment: the repo has a correct current-state summary, buried inside a larger
document set that still teaches older repo shapes.

### P1 — Active v3 code still depends on legacy v2 modules as mixed shared/legacy surfaces

- `layout_v3.py` imports render primitives from `diagram_layout.py`:
  `scripts/layout_v3.py:18-25`
- `diagram_render_svg.py` also imports primitive classes from `diagram_layout.py`:
  `scripts/diagram_render_svg.py:14-30`
- `diagram_layout.py` is a mixed legacy/current monolith: it defines active
  primitives and also the legacy declarative grid engine:
  `scripts/diagram_layout.py:1-9`, `72-238`
- `diagram_layout.py` still documents stale frame-box variants:
  `scripts/diagram_layout.py:194-200`
- `diagram_model.py` still exposes legacy `BoxStyle.ACCENT` semantics:
  `scripts/diagram_model.py:47-74`, `110-140`

Assessment: v3 has not been cleanly separated from the legacy declarative grid
surface. Shared primitives live in the wrong place and keep the old model alive.

### P2 — Historical docs still advertise sidecar JSON persistence

- `docs/architecture/layout-grid.md` still states grid overrides live in
  `tmp/overrides/<slug>.json`:
  `docs/architecture/layout-grid.md:125-144`
- `README.md` still describes override JSON persistence:
  `README.md:205`
- `ROADMAP.md` still describes sidecar override architecture:
  `ROADMAP.md:53-55`

Assessment: code has moved past sidecar authority; historical docs have not.

### P2 — Force mode is not a reliable current surface

- `README.md` still presents force demos and force JSON inputs as active:
  `README.md:172-195`
- the corresponding files are absent from the repo
- `/force/view/force-juju-landing-pages` returned `404` during the audit
- `scripts/preview_server.py` still contains force routes and session plumbing:
  `scripts/preview_server.py:350-415`, `726-764`
- `scripts/preview/force.js` still uses `accent` vocabulary:
  `scripts/preview/force.js:13-17`

Assessment: force mode is neither cleanly supported nor cleanly archived.
Leaving it half-present is drift bait.

### P2 — `docs/diagram-schema.json` is legacy scope but still looks current

- it still exposes `box_style = default|accent|highlight` and describes style
  as raw fill/text/icon presetting:
  `docs/diagram-schema.json:127-130`

Assessment: this file is not the v3 YAML contract and should not remain
ambiguous. Keep only if marked legacy or split to a v3-accurate schema.

### P2 — The editor still contains extra semantic inference layers

- it keeps compatibility/global shims:
  `scripts/preview/editor.js:18-39`
- it infers the current style name from override payloads, rendered DOM fill and
  stroke, and raw node fields:
  `scripts/preview/editor.js:4534-4577`

Assessment: these are not persisted competing authorities, but they are
runtime drift vectors. New code can still learn the wrong pattern here.

### P3 — Python/TS parity is still a deliberate maintenance burden

Parity surfaces still being actively maintained:

- style resolver: `scripts/frame_loader.py:384-454` and
  `packages/layout-engine/src/resolve-styles.ts:60-131`
- frame-class semantics: `scripts/frame_style_classes.py` and
  `packages/layout-engine/src/frame-classes.ts`
- layout parity tests: `scripts/test_parity.py` and
  `packages/layout-engine/tests/parity.test.ts`
- style parity tests: `scripts/test_style_parity.py` and
  `packages/layout-engine/tests/style-parity.test.ts`
- shared fixtures: `packages/layout-engine/tests/fixtures/parity-fixtures.json`
  and `style-parity-fixtures.json`

Assessment: this is acceptable only as an explicit migration/oracle lane. It
must not expand into a permanent dual-implementation program.

## State Mechanisms That Compete With YAML

### Persisted authority in live v3 code

- Current status: no competing persisted authority was found.
- Save rejects transient keys like `dx`, `dy`, `dw`, `dh`, and `waypoints`:
  `scripts/frame_yaml_persistence.py:51-55`, `252-260`
- Save writes canonical fields back into the original YAML:
  `scripts/frame_yaml_persistence.py:318-355`

### Runtime shadow layers that are still present

- in-memory browser edit state:
  `model.overrides`, `model.gridOverrides`, `_coercedKeys`
  (`scripts/preview/component-model.js:75-82`,
  `scripts/preview/editor.js:5071-5151`)
- Python component-tree projection:
  `scripts/preview_server.py:183-187`, `1010-1016`
- raw frame-tree projection for TS:
  `scripts/preview_server.py:197-285`, `1017-1028`
- Python-rendered initial SVG:
  `scripts/preview_server.py:983-1007`

Assessment: these are not persisted authorities, but they mean the runtime
still has multiple derived representations of the same diagram.

### Historical/empty leftovers that should not remain visible

- empty overrides lane: `diagrams/2.output/overrides/force/`
- sidecar persistence described in `ROADMAP.md`, `README.md`,
  `docs/architecture/layout-grid.md`

## Recommended Documentation Hierarchy

Use this hierarchy for future work:

1. `.github/copilot-instructions.md`
   Workflow discipline and anti-patch rules.
2. `DIAGRAM.md`
   Visual language and renderer-facing diagram rules only.
3. `docs/frame-classes.md`
   Authored frame-class semantics only.
4. `specs/008-repo-coherence-rewrite/tasks.md` plus `TODO.md`
   Active cleanup execution queue.
5. `STATUS.md`
   Short current-state summary only.
6. `ROADMAP.md`
   Future direction only, after rewrite.
7. `HISTORY.md`
   Completed work archive only.
8. `docs/specs.md`
   External references and sibling-repo relationships only.

Everything else should be one of:

- active feature-spec support material
- historical audit evidence
- archived legacy workflow material

## Keep / Rewrite / Archive / Quarantine / Delete

### Keep

- `scripts/diagrams/frames/*.yaml`
- `scripts/frame_loader.py`
- `packages/layout-engine/`
- `scripts/frame_yaml_persistence.py`
- `scripts/test_preview_support_engineering_flow.py`
- `docs/frame-classes.md`
- `specs/008-repo-coherence-rewrite/`

### Rewrite

- `README.md`
- `ROADMAP.md`
- `STATUS.md`
- `TODO.md`
- `.github/agents/agent.md`
- `.github/skills/diagram-build-validate/SKILL.md`
- `.github/skills/diagram-redraw/SKILL.md`
- `DIAGRAM.md` sections that still teach dead commands or pre-v3 styling
- `scripts/diagram_layout.py` docstrings / module boundary
- `scripts/preview/editor.js` style-semantic mapping path

### Mark Historical / Archive

- `docs/gpt-5.5-audit-context.md`
- `docs/architecture/adversarial-audit-2026-05-27.md`
- `docs/architecture/layout-grid.md`
- completed spec packages that are no longer execution owners once their facts
  are folded into canonical docs

### Quarantine

- `scripts/test_parity.py`
- `packages/layout-engine/tests/parity.test.ts`
- `packages/layout-engine/tests/fixtures/parity-fixtures.json`
- `scripts/diagram_model.py` legacy `BoxStyle`/`ACCENT` surface
- `scripts/diagram_layout.py` legacy declarative grid engine surface
- `packages/layout-engine/src/canvas-text-adapter.ts` and
  `MockTextAdapter` browser-facing exports unless clearly labeled test-only
- force-mode code if it is not restored immediately

### Delete

- empty `diagrams/2.output/overrides/force/`
- dead guidance that references missing scripts, missing files, or 404 routes
- any remaining generated/hand-authored truth artifacts once their authority is
  folded into the correct canonical source

## Staged Cleanup Plan

### Stage 1 — Governance hard stop

- Rewrite `README.md`, `ROADMAP.md`, `STATUS.md`, `TODO.md`,
  `.github/agents/agent.md`, and the two outdated skills so they describe only
  the current repo.
- Remove all references to missing scripts:
  `build_v2.py`, `build_outputs.py`, `_compare_3way.py`, `_audit_v2.py`,
  `build_compare_pages.py`, `generate_remaining_diagrams.py`,
  `diagram_render_drawio.py`, `test_svg_renderer.py`, `test_relayout_v3.py`.
- Rewrite the ROADMAP architecture blueprint so it no longer enshrines sidecar
  override persistence or `v2` as an architectural fallback.

### Stage 2 — Define the real v3 runtime contract

- Declare the actual canonical v3 path explicitly:
  YAML -> frame-tree -> TS layout/patch -> YAML save.
- Treat the current Python preview bootstrap as temporary until removed.
- Remove `/api/tree` and the Python component-tree bootstrap once the editor can
  derive its model from the frame-tree + TS layout output directly.
- Decide whether initial SVG should also be TS-rendered or whether the Python
  bootstrap remains a temporary exporter path with an explicit removal gate.

### Stage 3 — Collapse style semantics to one machine contract

- Replace duplicated semantic maps in:
  - `scripts/frame_style_classes.py`
  - `scripts/frame_yaml_persistence.py`
  - `scripts/preview/editor.js`
  - `scripts/preview/box-styles.js`
- Keep `docs/frame-classes.md` as the authored source, but generate or derive
  machine maps from one place instead of hand-maintaining parallel tables.
- Either add a full resolved-style snapshot object or explicitly document that
  line/icon fields are mutated during resolution and must be treated as
  authoritative resolved state.

### Stage 4 — Separate active v3 modules from legacy v2 modules

- Extract shared primitive classes out of `diagram_layout.py` into a v3-neutral
  module.
- Leave legacy declarative grid code in a clearly named `legacy` or historical
  namespace if it must remain.
- Do the same for legacy `diagram_model.py` style vocabulary where possible.

### Stage 5 — Decide the fate of force mode

- If force mode is still a real product surface, restore the missing backend and
  example assets and document it as separate from v3.
- If it is not, archive/remove the routes, docs, UI, and empty overrides lane.
- Do not leave a documented surface that returns `404`.

### Stage 6 — Quarantine parity work

- Keep semantic parity tests that protect the migration.
- Freeze large snapshot-style parity fixtures; do not let them become the
  permanent primary contract.
- Label Python parity surfaces as temporary oracle coverage, not active product
  implementation.

## Guardrails To Prevent Regression

- Add CI grep checks that fail on:
  - `build_v2.py`
  - `build_outputs.py`
  - `_compare_3way.py`
  - `_audit_v2.py`
  - `requestRelayout`
  - `relayout-v3`
  - `localStorage`
  - `overrideRole`
  - `accent` inside v3 editor docs/code
- Require any architecture change to update:
  - `README.md`
  - `.github/agents/agent.md`
  - affected `.github/skills/*`
  - `STATUS.md`
  - `ROADMAP.md`
  in the same changeset.
- Keep historical audits and completed specs explicitly marked historical.
- Do not allow new persisted truth layers in JSON or derived YAML.
- Do not allow v3 bootstrap to add another server-derived representation if the
  same fact can be derived from frame YAML + TS layout output.

## Final Determination

The repo is genuinely converging on:

- YAML as the persisted source of truth
- no `localStorage`
- no persisted v3 JSON sidecar authority
- local-only TypeScript interactive relayout

The repo is not yet genuinely converged on:

- one end-to-end execution path
- TypeScript as the only renderer/runtime
- one machine-readable style contract
- one safe documentation hierarchy

The next cleanup should prioritize document/agent-surface correction and
runtime projection collapse before adding more features.

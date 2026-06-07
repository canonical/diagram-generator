# Implementation plan: TypeScript authority and Python removal (design-foundry port prep)

## Goal

Make `diagram-generator` a clean YAML-source-of-truth, TypeScript-only repo and prepare `packages/layout-engine/` for relocation into design-foundry as `@design-foundry/operator-autolayout`. Stop the weeks-long relapse by replacing soft "Python is narrowing" guidance with an enforced ratchet, replacing the Python preview server with a Node app, deleting residual product-path Python, and reshaping the engine along design-foundry's real port contracts.

## Summary

This is a structural migration in four phases. Phase 0 installs the ratchet (cheap, stops drift now). Phase 1 is the keystone: a Node preview app that imports the TS packages directly instead of Python spawning Node through subprocess pools. Phase 2 deletes the residual product-path Python. Phase 3 reshapes `packages/layout-engine/` internal seams to match design-foundry and adds the operator-kernel-shaped facade and render-ir emit path. Phase 4 (physical relocation) is explicitly handled by a separate design-foundry session and appears here only as a handoff.

The migration is mostly de-risked already: specs 012, 013, 022, and 030 moved SVG rendering, preview layout, authoring, and sequence into TypeScript. What remains is the **preview control plane** plus the final package reshaping — not semantic de-duplication.

## Technical Context

| Item | Detail |
| --- | --- |
| **Authored truth** | Frame YAML under `scripts/diagrams/frames/` (unchanged) |
| **Implementation authority** | TypeScript in `packages/layout-engine/` |
| **Only Node project today** | `packages/layout-engine` (`@diagram-generator/layout-engine`); no root `package.json` |
| **Front door today** | `python scripts/preview_server.py` (README / STATUS / stakeholder-guide) |
| **Residual product-path Python** | `preview_server.py`, `preview_ts_layout.py`, `preview_ts_export.py`, `frame_yaml_persistence.py` |
| **Parity oracle (tests only)** | `layout_v3.py`, `frame_loader.py` |
| **Port target** | `@design-foundry/operator-autolayout` (relocation + thin adapter) |
| **Port contracts (DF-side, ready)** | operator-kernel (K4), render-ir (K1), text-shape (K3), document-schema |
| **CI surface** | No `.github/workflows/`; guard is a local validation gate wired into documented validation commands |

### Preview route surface the Node app must replicate

GET: `/`, `/api/runtime-identity`, `/api/preview-engines`, `/preview/*` (incl. `/preview/bf-fonts/*`), `/svg/*`, `/view/*` (autolayout v3), `/force/view/*`, `/v3/view/*`, `/v3/svg/*`, `/api/tree/*`, `/api/preview-document/*`, `/api/frame-tree/*`, `/api/grid/*`, `/api/force-spec/*`, `/api/icon/*`, `/reference/*`.

POST: `/api/overrides/*` (save), `/api/force-save/*`.

Plus: SSE live-reload and the diagram nav/picker HTML.

## Approach

### Phase 0 — Architectural ratchet (P1)

1. Establish `specs/038-ts-authority-python-removal/` as the single migration home and repoint the SpecKit context block in `.github/copilot-instructions.md` at this plan.
2. Replace the four-role "Python's role (narrowing)" section with one hard rule: no Python in the diagram product path; the only allowed Python is the dated parity oracle, draw.io batch tooling, and `design_tokens.py` until `tokens.ts` is sole source.
3. Correct the stale "do not migrate / interface not ready" guidance to reflect that the design-foundry kernel contracts are ready and the blocker is this repo's Python front door.
4. Add a guard check (`scripts/check_no_new_python.mjs`) with an allowlist of current `.py`; it fails on a new non-test diagram-logic `.py`. Wire into the documented validation commands.
5. Mirror the one rule at the top of `README.md` and `STATUS.md`.

### Phase 1 — Node preview app, the keystone (P1)

1. Create `apps/preview/` as a Node project depending on `@diagram-generator/layout-engine` — the first non-Python entry point in the repo.
2. Implement the HTTP server in TypeScript, replicating the full route surface, importing `LayoutEngine`, `frame-serialize`, `grid-info`, `component-tree`, and `svg-render` **directly** — no subprocess pools.
3. Implement file watch + SSE live reload to replace the Python watcher.
4. Port YAML save into TypeScript to replace `frame_yaml_persistence.py`, preserving the canonical `root` + `arrows` format; reuse `test_frame_yaml_persistence.py` cases as TS parity tests.
5. Port the diagram nav/picker HTML; the sidenav auto-populates from the filesystem.
6. Flip the documented front door to `npm run preview`; update `README.md`, `STATUS.md`, and `docs/stakeholder-guide.md`.
7. Browser-verify autolayout v3, force, and sequence at parity; run the spec 027 preview browser test API against the Node server.
8. Delete `preview_server.py`, `preview_ts_layout.py`, `preview_ts_export.py`; port or retire their Python tests.

### Phase 2 — Delete residual product-path Python (P1)

1. Demote `layout_v3.py` and `frame_loader.py` to a dated parity oracle: add a header noting the removal date and that they exist only for cross-language parity, and remove any non-test import.
2. Confirm `frame_yaml_persistence.py` is deleted (replaced in Phase 1).
3. Reduce the guard allowlist to the dated oracle, draw.io tooling, `design_tokens.py`, and `test_*.py`.

### Phase 3 — Reshape layout-engine along real design-foundry seams (P2, parallel-able)

1. Carve internal seams matching design-foundry — document-model/schema, operator-autolayout, render adapter, text adapter — inside `packages/layout-engine/` first, keeping public signatures stable.
2. Add an operator-kernel-shaped facade: typed inputs (frame document + parameters) → sync `evaluate()` → output, documented as the de-facto port interface.
3. Add a render-ir emit path (`LayoutOutput` → `DisplayListItem[]`) alongside the existing SVG-string path; keep `svg-render.ts` as the diagram-generator-local string renderer.
4. Route text measurement through a text-shape-compatible adapter (HarfBuzz already in deps).
5. Add parity tests proving the render-ir path and the SVG-string path produce equivalent geometry.

### Phase 4 — Relocation (out of scope; handoff only)

1. Write an `AGENT-INBOX.md` note in `../design-foundry/` describing the reshaped seams and the port interface so a design-foundry session can relocate the package as `@design-foundry/operator-autolayout` behind a thin adapter, extend `document-schema` with the autolayout frame primitive, and run a parity test against the in-place engine.

## Sequencing and dependencies

- Phase 0 is independent and lands first.
- Phase 1 depends on Phase 0 (the rule and tracking spec exist).
- Phase 2 depends on Phase 1 (the Node app must own preview + save before the Python is deleted).
- Phase 3 can run in parallel with Phases 1–2; it touches `packages/layout-engine/` internals, not the preview server.
- Phase 4 is a separate cross-repo session and never runs inside this repo's spec.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Node server drifts from the Python route surface | Enumerate the route surface (above) as an acceptance checklist; run spec 027 browser tests against Node |
| YAML save divergence corrupts authored files | Reuse `test_frame_yaml_persistence.py` cases as TS parity tests; assert byte-identical output before deleting the Python merge |
| Reshaping breaks the de-facto port interface | Keep public exported signatures stable; assert empty `git diff` on exported types |
| render-ir path diverges from SVG-string geometry | Lock with geometry-parity fixtures before treating the path as port-ready |
| Parity oracle lingers indefinitely | Dated removal window in the file header; guard allowlist shrinks in Phase 2 |

## Validation

```bash
npm --prefix packages/layout-engine test
python -m pytest scripts -q
node scripts/check_no_new_python.mjs
```

After Phase 1, browser-verify each engine lane against the Node server at `http://127.0.0.1:8100/view/v3:<slug>`, `/force/view/<slug>`, and the sequence lane, and run the spec 027 preview browser test API against the Node server.

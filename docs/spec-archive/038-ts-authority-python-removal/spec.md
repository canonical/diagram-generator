# Feature Specification: TypeScript authority and Python removal (design-foundry port prep)

**Feature Branch**: `feat/038-ts-authority-python-removal`

**Spec Package**: `038-ts-authority-python-removal`

**Created**: 2026-06-07

**Status**: Draft

**Depends on**: spec 012 (complete), spec 013 (complete), spec 022 (complete), spec 025 (complete), spec 026 (compatible), spec 027 (complete)

**Input**: The repo has been transitioning off Python for weeks, but every new session re-reads Python as a negotiable part of the architecture and the migration stalls. The agreed end-state — stated in `README.md`, `packages/layout-engine/src/frame-yaml-loader.ts`, and `../design-foundry/PIVOT.md` — is a clean YAML-source-of-truth, TypeScript-only repo whose layout engine eventually relocates into design-foundry as `@design-foundry/operator-autolayout`. This spec makes that end-state a hard architectural ratchet, removes the last Python from the product path, and reshapes `packages/layout-engine/` along design-foundry's real port contracts so the eventual move is relocation, not redesign.

## Problem Statement

The runtime already runs on TypeScript: layout (`layout.ts`), measure (`text-measure.ts` + HarfBuzz), SVG render (`svg-render.ts`), the authoring compiler (`diagram-author/compile.ts`), sequence layout, force core, and the preview DTOs are all TS. Specs 012 and 013 already retired the Python SVG renderer and the Python preview layout. Yet the migration keeps relapsing for three concrete reasons:

1. **The literal front door is Python.** `README.md`, `STATUS.md`, and `docs/stakeholder-guide.md` tell users to run `python scripts/preview_server.py`. As long as the first command a session sees is Python, Python reads as load-bearing.
2. **The instructions license Python.** `.github/copilot-instructions.md` enumerates four "retained" Python roles. An enumeration of allowed roles is an invitation to keep using them.
3. **Stale port guidance.** The instructions say "Do NOT migrate code to design-foundry yet. The target kernel operator interface is not ready." design-foundry's own `TODO.md` marks the kernel contracts (operator-kernel K4, render-ir K1, text-shape K3) **complete**. The real blocker is on this side: the Python preview control plane.

What actually remains in the product path is **not semantic logic** — it is the **preview control plane**:

- `scripts/preview_server.py` (~900 lines): HTTP serving, file watching, asset serving, save orchestration, subprocess-pool management.
- `scripts/preview_ts_layout.py` and `scripts/preview_ts_export.py`: thin subprocess-pool wrappers around Node `.mjs` CLIs. Zero semantics.
- `scripts/frame_yaml_persistence.py` (~200 lines): YAML save-merge on user Save.

The remaining non-product Python is the parity oracle (`layout_v3.py`, `frame_loader.py`, tests only), draw.io batch tooling, and `design_tokens.py` (a mirror of `tokens.ts`).

A soft "Python is narrowing" framing has not converged after weeks. This spec replaces it with a hard ratchet plus the one keystone change that makes "TypeScript-only" literally true: a Node preview app.

## Mission

Convert `diagram-generator` into a clean YAML-source-of-truth, TypeScript-only repo by (1) installing an enforced architectural ratchet that stops Python re-entering the product path, (2) replacing the Python preview server with a Node app that imports the TS packages directly, (3) deleting the residual product-path Python on a dated window, and (4) reshaping `packages/layout-engine/` along design-foundry's real operator-kernel / render-ir / text-shape seams so the eventual port is a relocation. The physical relocation into design-foundry is explicitly out of scope here and handled by a separate design-foundry session.

## Source-of-truth and authority

- **Authored truth**: Frame YAML on disk under `scripts/diagrams/frames/`. Unchanged by this spec.
- **Implementation authority**: TypeScript in `packages/layout-engine/`. This spec removes every competing or ambiguous authority statement that still points at Python.
- **Port target authority**: `../design-foundry/PIVOT.md` §5 (no-double-work guarantee; relocation + thin adapter, not reimplementation) and design-foundry's operator-kernel / render-ir / text-shape contracts.

## Scope

### In scope

- Hard-ratchet edits to `.github/copilot-instructions.md`, `README.md`, and `STATUS.md`.
- A guard check that fails when a new non-test, diagram-logic Python file is added under `scripts/`.
- A Node preview app replicating the current preview route surface, importing TS packages directly (no subprocess pools).
- Porting YAML save into TypeScript.
- Flipping the documented front door from `python scripts/preview_server.py` to an npm script.
- Deleting `preview_server.py`, `preview_ts_layout.py`, `preview_ts_export.py`, and `frame_yaml_persistence.py`.
- Demoting `layout_v3.py` and `frame_loader.py` to a dated parity oracle with a removal window.
- Reshaping `packages/layout-engine/` internal seams to match design-foundry, adding an operator-kernel-shaped facade and a render-ir emit path, keeping public signatures stable.

### Out of scope

- Physically relocating packages into `../design-foundry/` (separate design-foundry session; handoff via `AGENT-INBOX.md`).
- The `scripts/preview/*.js` browser-shell → TypeScript migration (spec 026 territory). Phase 1 swaps the server, not the shell.
- Deleting draw.io batch tooling (`drawio_style_*.py`, `export_*.py`). Allowed non-product Python; a possible later phase.
- Creating an `operator-force` package. Force is not a design-foundry port target; it stays a diagram-generator engine.
- Any new layout, measure, or rendering capability. This is a structural migration, not a feature.

## Key decisions

- **Drop `operator-force` as a port target.** `../design-foundry/PIVOT.md` names `operator-autolayout` and lists ELK as the planned graph option; there is no force operator planned, and `operator-fuzzy-boids` is the existing peer. Force stays local to diagram-generator.
- **render-svg is a re-point, not a relocation.** `svg-render.ts` emits SVG strings; design-foundry's `@design-foundry/render-svg` (K2) consumes a render-ir display list. The port therefore adds a render-ir emit path; the SVG-string renderer stays diagram-generator-local.
- **Port output must conform to operator-kernel and render-ir.** The facade exposes typed inputs → `evaluate()` → render-ir `DisplayListItem[]`, not relocated SVG.
- **Parity oracle on a dated window.** `layout_v3.py` / `frame_loader.py` remain only as a cross-language parity check with an explicit removal date, then are deleted.
- **The Node app is the keystone.** Until the front door is Node, Python keeps reading as architecture. This is sequenced as the next major work item.

## User Scenarios & Testing

### Primary scenario — stakeholder makes a diagram (front door is Node)

A stakeholder follows `docs/stakeholder-guide.md`: copies a frame YAML, runs the documented preview command, opens `/view/v3:<slug>`, edits, saves, and optionally exports SVG. After this spec the documented command is an npm script, the server is Node, and the save path writes the same on-disk YAML as before. No Python is invoked anywhere in this flow.

### Scenario — agent cannot reintroduce Python

A future session adds `scripts/new_layout_helper.py` containing diagram logic. The guard check fails with a message pointing at spec 038 and the TypeScript-only rule, and the file is rejected before it can become load-bearing.

### Scenario — all engines render at parity on the Node server

Autolayout v3, force, and sequence lanes all load and render through the Node preview server with identical geometry to the retired Python server, verified by the spec 027 preview browser test API.

### Scenario — the eventual port is a relocation

A later design-foundry session reads the operator-kernel-shaped facade and the render-ir emit path, relocates the package as `@design-foundry/operator-autolayout` behind a thin adapter, and runs a parity test against the in-place engine — without reimplementing layout.

## Success Criteria

- The documented front door in `README.md`, `STATUS.md`, and `docs/stakeholder-guide.md` is an npm script; no documentation tells a user to run a Python command for preview.
- `scripts/preview_server.py`, `scripts/preview_ts_layout.py`, `scripts/preview_ts_export.py`, and `scripts/frame_yaml_persistence.py` are deleted.
- The Node preview server serves the full prior route surface and all three engine lanes at geometry parity; spec 027 browser tests pass against it.
- YAML save runs in TypeScript and produces byte-identical on-disk results to the retired Python merge for the covered cases.
- `.github/copilot-instructions.md` states a single hard rule ("no Python in the diagram product path") instead of enumerating retained Python roles, and the stale "interface not ready" guidance is corrected.
- The guard check fails on a planted new diagram-logic `.py` and passes on the migrated tree.
- `rg -l "import (layout_v3|frame_loader|frame_yaml_persistence)" scripts` returns only parity-oracle and test files.
- `packages/layout-engine/` exposes an operator-kernel-shaped facade and a render-ir emit path with geometry parity against the SVG-string path; public exported signatures are unchanged (empty `git diff` on exported types).
- `npm --prefix packages/layout-engine test` is green; the retained Python parity oracle is green within its dated window.

## Non-goals and explicit deferrals

- No physical move into design-foundry (handoff only).
- No browser-shell rewrite.
- No removal of draw.io tooling or `design_tokens.py` in this spec (tracked as later cleanup).
- No new engines or layout features.

# Status

## What this repo is

`diagram-generator` is a constrained interactive diagram editor that turns frame YAML into on-brand SVG and draw.io outputs. It owns the single autolayout codebase in the workspace (`packages/layout-engine/`, TypeScript) which will eventually port to `design-foundry` as `@design-foundry/operator-autolayout`. See `../design-foundry/PIVOT.md` for the full cross-repo plan.

**TypeScript is the implementation language.** All new features target the TS engine first. Python is retained only for YAML parsing (`frame_loader.py`), batch SVG export (`diagram_render_svg.py`), and transitional parity testing. See `.github/copilot-instructions.md` for the full TS-first mandate.

## Project context

This repo is **Stream E** (constrained editor) of a broader Canonical diagram project tracked under [DE-941](https://warthogs.atlassian.net/browse/DE-941) on Jira. Three layers, intentionally separate:

| Layer | Tool | What lives there |
|-------|------|------------------|
| Strategic | Jira DE-941 → Stream epics | Milestone issues for stakeholder visibility |
| Working surface | Coda pages (tracked in `diagram-generator-planning/docs/coda-pages/`) | Taxonomy, corpus, type system, enablement |
| Execution | spec-kit `specs/` + `TODO.md` | T001-level tasks, refactors, code hardening |

Don't create Jira issues for refactors or spec-level tasks. Jira is for milestones a PM would ask about. The sibling `diagram-generator-planning` repo owns the corpus, taxonomy (11 families), Coda pages, and Streams A–D. This repo is Stream E only.

## Current state

- **Engine:** v3 autolayout with TypeScript local-only relayout. HarfBuzz-backed browser text measurement. No Python relayout fallback.
- **Authored state:** Frame YAML only. No JSON sidecar authority.
- **Tests:** 212 TS layout-engine tests passing (incl. parity fixtures under spec 011 + heading synthesis). Python batch tests unchanged.
- **Export:** `node packages/layout-engine/scripts/export-frame-svg.mjs --slug <name>` (TS layout + HarfBuzz + SVG).
- **Diagrams:** 32 v3 Frame YAML definitions.

**Active focus (2026-06-03):** Spec **012** in progress — preview live SVG is TS-only (T060a done); next: `svg-render.ts` parity (icons, arrows, overlays) then retire `diagram_render_svg.py` (T060b). Spec 005 WS2 and spec 008 Phase 5 queued after 012. YAML is already authoring source of truth; remaining split is TS vs Python **runtime**, not YAML adoption.

## Key files

| Purpose | File |
|---------|------|
| **TS layout engine** | `packages/layout-engine/` |
| TS style resolution | `packages/layout-engine/src/resolve-styles.ts` |
| TS relayout bridge | `scripts/preview/layout-bridge.js` |
| Python YAML parser | `scripts/frame_loader.py` |
| Python layout (parity) | `scripts/layout_v3.py` |
| Python SVG export (batch only; preview retired) | `scripts/diagram_render_svg.py` |
| Frame-class definitions | `scripts/frame_style_classes.py` |
| Frame YAML sources | `scripts/diagrams/frames/*.yaml` |
| Interactive editor | `scripts/preview/editor.js` |
| Preview server | `scripts/preview_server.py` |
| Visual language contract | `DIAGRAM.md` |
| Frame-class contract | `docs/frame-classes.md` |
| Architecture detail | `docs/architecture-status.md` |

## Critical invariants

- `DIAGRAM.md` is the canonical source for diagram tokens and output constraints.
- Final SVG deliverables must stay Illustrator-safe: no `<symbol>`, no `<use>`, no external `<image href>`, no marker refs.

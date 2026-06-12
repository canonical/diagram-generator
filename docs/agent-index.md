# Agent index (diagram-generator)

Tier-1 orientation for AI agents. Read this before searching the repo. For operational rules (search hygiene, commits, sweeps), see [`AGENTS.md`](../AGENTS.md).

## What this repo does

Frame YAML → measure/layout → on-brand SVG, with an interactive preview editor (save overrides back to YAML). TypeScript is the product path; Python under `scripts/` is legacy parity/oracle debt (spec 038).

**Stakeholder path:** [`docs/stakeholder-guide.md`](stakeholder-guide.md)  
**Human cold-start:** [`STATUS.md`](../STATUS.md) · **Design tokens:** [`DIAGRAM.md`](../DIAGRAM.md)  
**Spec catalogue:** [`docs/specs.md`](specs.md)

---

## Packages and apps

| Path | Role |
|------|------|
| `packages/layout-engine/` | Core: frame model, layout, measure, SVG render, diagram-author, preview-shell, arrow routing |
| `packages/graph-layout-core/` | Graph IR shared by ELK adapters |
| `packages/graph-layout-elk/` | ELK layered/force option mapping |
| `apps/preview/` | Node preview server (`src/server.ts`), persistence (`src/persistence/`) |
| `scripts/preview/` | Browser editor: `editor.js`, `layout-bridge.js`, `save-client.js`, `component-model.js` |

Browser loads `packages/layout-engine/dist/layout-engine.iife.js` (rebuild with `npm --prefix packages/layout-engine run build:browser` after changing browser exports).

---

## Main pipelines

### A. Frame diagram (v3 autolayout) — default path

```
scripts/diagrams/frames/{slug}.yaml
  → loadFrameYaml (packages/layout-engine)
  → layoutFrameTree → renderFrameDiagramToSvg
  → apps/preview serves SVG + wire JSON to browser
  → layout-bridge.js local relayout / editor.js overrides
```

| Step | Primary files |
|------|----------------|
| Load YAML | `packages/layout-engine/src/frame-yaml-loader.ts`, `frame-record-parser.ts` |
| Layout | `packages/layout-engine/src/layout.ts` |
| Render | `packages/layout-engine/src/svg-render.ts`, `render-adapter/` |
| Preview server | `apps/preview/src/server.ts` |
| Client bridge | `scripts/preview/layout-bridge.js` |
| Inspector / overrides | `scripts/preview/editor.js`, `component-model.js` |

### B. Preview save (overrides → YAML)

See deep map: [`specs/006-arrow-routing-redesign/preview-override-flow.md`](../specs/006-arrow-routing-redesign/preview-override-flow.md)

Short path: `editor.js` overrides → `save-client.js` POST `/api/overrides/{slug}` → `frame-diagram.ts` → YAML on disk.

Allowlists: `packages/layout-engine/src/preview-shell/frame-override-manifest.ts`

### C. Diagram author (compile / export)

```
.diagram / Mermaid / D2 input
  → packages/layout-engine/src/diagram-author/
  → frame YAML AST → validate → lower-to-frame → loadFrameYaml path
```

Docs: [`docs/diagram-authoring.md`](diagram-authoring.md) · Spec: `specs/022-diagram-authoring-ast/`, `specs/028-diagram-interchange-mermaid-d2/`

### D. ELK layered preview

```
meta.layout_engine: elk-layered
  → packages/layout-engine/src/elk-layout.ts
  → graph-layout-elk → elkjs in browser bundle
  → local relayout skipped in layout-bridge for ELK diagrams
```

Spec: `specs/035-compatible-engine-switcher/`, `specs/025-multi-engine-preview-architecture/`  
**Known gap (INBOX):** headings/icons on parent containers may not survive ELK layout — no flow map yet.

### E. Force preview mode

```
/view/force:{slug} → scripts/preview/force.js
  → packages/layout-engine/src/force-runtime.ts
  → persist via apps/preview/src/persistence/force-spec.ts
```

Spec: `specs/023-force-layout-restoration/`, `specs/029-force-preview-shell-convergence/`

### F. Sequence preview mode

```
packages/layout-engine/src/sequence-layout/
  → preview engine manifest entry SEQUENCE_PREVIEW_ENGINE
```

Spec: `specs/030-sequence-layout/`

### G. Arrow routing (spec 006, in progress)

```
YAML arrows → layoutFrameTree (gap promotion) → routeArrows (arrow-routing.ts)
  → svg-render / layout-bridge patchArrowsSvg
```

Docs: `docs/architecture/arrow-routing-redesign.md` · Spec: `specs/006-arrow-routing-redesign/`  
**Known gap (INBOX):** routing when container direction flips vertical ↔ horizontal — no flow map yet.

---

## Key directories

| Path | Contents |
|------|----------|
| `scripts/diagrams/frames/` | Canonical frame YAML (authoring source of truth) |
| `specs/` | Spec-kit packages (`spec.md`, `plan.md`, `tasks.md`) |
| `packages/layout-engine/tests/` | Vitest (layout, render, diagram-author, arrow) |
| `apps/preview/src/persistence/` | YAML save/load tests (node:test) |
| `scripts/preview/` | Browser editor scripts (large: `editor.js`) |
| `docs/architecture/` | Deep audits (historical; prefer specs + flow maps for agents) |

---

## Deep flow maps (tier 2)

Created on demand when a cross-layer path is easy to break. **Do not map the whole project** — add a map when you touch an area and the path isn't obvious from tests.

| Topic | Map | Status |
|-------|-----|--------|
| Preview override save / `gap_delta` | [`specs/006-arrow-routing-redesign/preview-override-flow.md`](../specs/006-arrow-routing-redesign/preview-override-flow.md) | Exists |
| ELK layered + headed containers | — | Needed (INBOX #1) |
| Arrow routing + direction changes | — | Needed (INBOX #2) |
| Engine switcher + `meta.layout_engine` | — | Consider when editing 035/037 |
| Diagram-author compile round-trip | — | Consider when editing 022/028 |

Template for new maps: same file shape as `preview-override-flow.md` (pipeline ASCII, key-files table, tests to run, known limits, ≤60 lines).

---

## Tests by area

| Area | Command |
|------|---------|
| Layout engine (all) | `npm --prefix packages/layout-engine test` |
| Gap delta / wire round-trip | `npm --prefix packages/layout-engine test -- gap-delta-wire-roundtrip frame-override-manifest` |
| Preview persistence | `npm --prefix apps/preview test` |
| No new Python ratchet | `node scripts/check_no_new_python.mjs` |
| Clean stale src emit before tests | `npm run clean:src-artifacts` (runs automatically as `pretest`) |

---

## Active work pointers (2026-06)

| Source | Item |
|--------|------|
| `INBOX.md` | ELK drops headings/icons on parent containers |
| `INBOX.md` | Arrow routing broken on vertical ↔ horizontal switch |
| `INBOX.md` | Spec 039 typography token cleanup — review and execute |
| `TODO.md` | Spec 006 review follow-ups (gap classifier, arrow ordering, geometry ownership) |

When picking up an INBOX item, check whether a tier-2 flow map exists (table above). If not, see [`AGENTS.md`](../AGENTS.md) — add one if you touch that path.

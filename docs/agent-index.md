# Agent index

Read this before broad repo searches.

## What matters

- Product path: TypeScript
- Source of truth: frame YAML in `scripts/diagrams/frames/`
- Preview front door: `apps/preview/`
- Layout/render authority: `packages/layout-engine/`
- `scripts/preview/*.js` is legacy compatibility shell, not a valid default
  home for new behavior-heavy preview logic
- Workflow authority: [`AGENTS.md`](../AGENTS.md) (includes handover — do not read `STATUS.md`)

## First files

1. [`AGENTS.md`](../AGENTS.md)
2. [`DIAGRAM.md`](../DIAGRAM.md)
3. `packages/layout-engine/src/tokens.ts`
4. `packages/layout-engine/src/frame-classes.ts`
5. `packages/layout-engine/src/layout.ts`
6. `apps/preview/src/server.ts`

## Trap files (never read whole file)

| File | ~Lines | Instead |
|------|-------:|---------|
| `scripts/preview/force.js` | 1,600 | same |
| `packages/layout-engine/dist/layout-engine.iife.js` | 3.5 MB | edit `packages/layout-engine/src/`; run `build:browser` |
| `diagrams/**` | binaries | ignored by `.cursorignore`; not product code |
| `specs/**` (bulk) | 8k+ | open **one** active `specs/<id>-<slug>/` when doing spec work |

Thin shell modules (safe to read whole): `editor.js`, `layout-bridge.js`, `editor-state.js`, `editor-base.js`, `save-client.js`, `undo-manager.js`, `elk-controller.js`.

## Tier-2 flow maps

| Topic | Map |
|-------|-----|
| Preview override persist / `gap_delta` | [`specs/006-arrow-routing-redesign/preview-override-flow.md`](../specs/006-arrow-routing-redesign/preview-override-flow.md) |
| Preview text-block edit / YAML persist | [`specs/041-text-block-inline-editing/text-edit-flow.md`](../specs/041-text-block-inline-editing/text-edit-flow.md) |
| Shell decomposition boundaries | [`docs/spec-archive/043-preview-shell-editor-ts-extraction/boundaries.md`](./spec-archive/043-preview-shell-editor-ts-extraction/boundaries.md) |
| Preview shell callback ordering | [`docs/spec-archive/043-preview-shell-editor-ts-extraction/shell-callback-flow.md`](./spec-archive/043-preview-shell-editor-ts-extraction/shell-callback-flow.md) |
| Post-043 shell surface audit | [`docs/spec-archive/044-preview-shell-architecture-followup/surface-audit.md`](./spec-archive/044-preview-shell-architecture-followup/surface-audit.md) |
| `layout-bridge.js` decomposition map | [`docs/spec-archive/044-preview-shell-architecture-followup/layout-bridge-decomposition-map.md`](./spec-archive/044-preview-shell-architecture-followup/layout-bridge-decomposition-map.md) |
| Post-043 shell contract shape | [`docs/spec-archive/044-preview-shell-architecture-followup/contract-shape.md`](./spec-archive/044-preview-shell-architecture-followup/contract-shape.md) |
| Post-043 bundle strategy | [`docs/spec-archive/044-preview-shell-architecture-followup/bundle-strategy.md`](./spec-archive/044-preview-shell-architecture-followup/bundle-strategy.md) |
| Preview host lane/page topology | [`docs/spec-archive/045-preview-host-engine-modularity/host-topology.md`](./spec-archive/045-preview-host-engine-modularity/host-topology.md) |
| Editor host decomposition map | [`specs/046-editor-host-endgame/decomposition-map.md`](../specs/046-editor-host-endgame/decomposition-map.md) |
| ELK sizing / live resize / debug | [`specs/048-elk-sizing-interaction-followup/elk-sizing-interaction-flow.md`](../specs/048-elk-sizing-interaction-followup/elk-sizing-interaction-flow.md) |
| Preview editor recovery | [`specs/050-preview-editor-recovery/preview-editor-recovery-flow.md`](../specs/050-preview-editor-recovery/preview-editor-recovery-flow.md) |
| Agent token / workspace slimming | [`docs/spec-archive/040-agent-token-slimming/spec.md`](./spec-archive/040-agent-token-slimming/spec.md) |

Add a new row when you land a cross-layer map (UI → server → engine → disk). Keep maps ≤60 lines.

## Main paths

| Path | Role |
|------|------|
| `packages/layout-engine/src/` | TS engine and browser bundle source |
| `packages/layout-engine/tests/` | Vitest coverage |
| `apps/preview/src/` | Node preview app |
| `scripts/preview/` | Legacy browser-shell compatibility layer; prefer TS owners and delegation, not new ownership |
| `scripts/diagrams/frames/` | Authored diagrams |

## Runtime flow

```text
frame YAML
  -> loadFrameYaml
  -> layoutFrameTree
  -> renderFrameDiagramToSvg
  -> preview app
  -> browser shell
```

## Commands

```bash
npm --prefix packages/layout-engine test
npm --prefix apps/preview test
npm run preview
node scripts/check_no_new_python.mjs
```

## Search hygiene

- Locate before loading: narrow `rg` / `Glob` first; then `Read` only the hit region (`offset`/`limit` on trap files). Whole-file reads are fine for thin modules listed above.
- Prefer narrow `rg` scoped to one directory.
- Read one targeted file after search hits.
- Avoid repo-wide sweeps unless the task is genuinely cross-cutting.
- Do not load `.github/agents/speckit.*` unless the user asked for spec-kit work.
- Completed spec packages live under `docs/spec-archive/` and are excluded from Cursor indexing; use `docs/specs.md` to find the active package first.

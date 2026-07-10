# Agent index

Read this before broad repo searches. This file owns **operational how-to** — trap
files, commands, search hygiene, token/test economy, and flow-map routing. It does
**not** own invariants (`AGENTS.md`), live state (`AGENT-INBOX.md`), the queue
(`TODO.md`), or spec status (`docs/specs.md`). One owner per fact; never restate.

## What matters

- Product path: TypeScript
- Source of truth: frame YAML in `diagrams/1.input/`
- Preview front door: `apps/preview/`
- Layout/render authority: `packages/layout-engine/`
- `scripts/preview/*.js` is legacy compatibility shell, not a valid default
  home for new behavior-heavy preview logic
- Workflow invariants: [`AGENTS.md`](../AGENTS.md) · Live state / handover: [`AGENT-INBOX.md`](../AGENT-INBOX.md)

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
| `scripts/preview/component-model.js` | 740 | persistence-critical hotspot; search `loadArrows` / `toOverridePayload`, then move ownership into TS |
| `scripts/preview/force.js` | 1,599 | same |
| `packages/layout-engine/dist/layout-engine.iife.js` | 4.4 MB | edit `packages/layout-engine/src/`; run `build:browser` |
| `diagrams/**` | binaries | ignored by `.cursorignore`; not product code |
| `specs/**` (bulk) | 8k+ | open **one** active `specs/<id>-<slug>/` when doing spec work |

Thin shell modules (safe to read whole): `editor.js`, `layout-bridge.js`, `editor-state.js`, `save-client.js`, `undo-manager.js`, `elk-controller.js`.

Not thin: `component-model.js` is still a persistence-critical save-path hotspot and `editor-base.js` still owns substantial legacy interaction state; search first, then read bounded slices.

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
| Editor host decomposition map | [`docs/spec-archive/046-editor-host-endgame/decomposition-map.md`](./spec-archive/046-editor-host-endgame/decomposition-map.md) |
| ELK sizing / live resize / debug | [`docs/spec-archive/048-elk-sizing-interaction-followup/elk-sizing-interaction-flow.md`](./spec-archive/048-elk-sizing-interaction-followup/elk-sizing-interaction-flow.md)|
| Preview editor recovery | [`docs/spec-archive/050-preview-editor-recovery/preview-editor-recovery-flow.md`](./spec-archive/050-preview-editor-recovery/preview-editor-recovery-flow.md) |
| Preview contextual aside | [`docs/spec-archive/051-preview-editor-contextual-aside/preview-contextual-aside-flow.md`](./spec-archive/051-preview-editor-contextual-aside/preview-contextual-aside-flow.md)|
| Layout engine onboarding | [`docs/spec-archive/052-layout-engine-onboarding-port/engine-onboarding-checklist.md`](./spec-archive/052-layout-engine-onboarding-port/engine-onboarding-checklist.md)|
| Preview editor post-refactor correctness | [`docs/spec-archive/053-preview-editor-post-refactor-correctness/preview-editor-post-refactor-flow.md`](./spec-archive/053-preview-editor-post-refactor-correctness/preview-editor-post-refactor-flow.md) |
| Preview engine workspace navigation | [`docs/spec-archive/055-preview-engine-workspace-navigation/engine-workspace-flow.md`](./spec-archive/055-preview-engine-workspace-navigation/engine-workspace-flow.md)|
| Preview arrow reroute invalidation | [`docs/spec-archive/056-arrow-reroute-structural-mutations/preview-reroute-flow.md`](./spec-archive/056-arrow-reroute-structural-mutations/preview-reroute-flow.md)|
| Editor mutation state determinism | [`docs/spec-archive/069-editor-mutation-state-determinism/editor-mutation-state-flow.md`](./spec-archive/069-editor-mutation-state-determinism/editor-mutation-state-flow.md) |
| Agent token / workspace slimming | [`docs/spec-archive/040-agent-token-slimming/spec.md`](./spec-archive/040-agent-token-slimming/spec.md) |

Add a new row when you land a cross-layer map (UI → server → engine → disk). Keep maps ≤60 lines.

## Main paths

| Path | Role |
|------|------|
| `packages/graph-layout-core/src/` | Engine-agnostic graph IR and capability contracts |
| `packages/graph-layout-elk/src/` | ELK graph layout adapters and algorithm param registries |
| `packages/layout-engine/src/` | TS engine and browser bundle source |
| `packages/layout-engine/tests/` | Vitest coverage |
| `apps/preview/src/` | Node preview app |
| `scripts/preview/` | Legacy browser-shell compatibility layer; prefer TS owners and delegation, not new ownership |
| `diagrams/1.input/` | Authored diagrams |

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
npm --prefix packages/layout-engine run build:browser
node scripts/check-browser-bundle-fresh.mjs
npm run preview
node scripts/check_no_new_python.mjs
```

## Search hygiene

- Locate before loading: narrow `rg` / `Glob` first; then `Read` only the hit region (`offset`/`limit` on trap files). Whole-file reads are fine for thin modules listed above.
- Prefer narrow `rg` scoped to one directory.
- Exclude generated browser bundles and other `dist/**` outputs from broad searches unless the task is bundle freshness or emitted-output triage: `rg pattern packages/layout-engine/src -g "!packages/layout-engine/dist/**"`.
- Read one targeted file after search hits.
- Avoid repo-wide sweeps unless the task is genuinely cross-cutting.
- Do not load `.github/agents/speckit.*` unless the user asked for spec-kit work.
- Completed spec packages live under `docs/spec-archive/` and are excluded from Cursor indexing; use `docs/specs.md` to find the active package first.

## Windows / WSL shell notes

Agents often run in PowerShell, not bash. `head`, `cat <<'EOF'`, and `find` fail or
behave differently — use PowerShell-native limits (`Select-Object -First N`). WSL is
usually more reliable for generated shell commands; mixed Windows-mounted paths
(`H:\...` or `/mnt/h/...`) add quoting and search-performance quirks. On Windows,
prefer direct interpreter calls like `.venv\Scripts\python.exe` over shell
activation.

## Token budget

- **Do not capture or analyze browser/Playwright screenshots unless the user explicitly asks.** Default verification: tests, preview URL, text description of the issue. If a visual check is requested, crop to the affected region — avoid full-viewport captures. Pasted images bill as vision input (hundreds to low-thousands of tokens each) and persist on every follow-up turn.
- **0 subagents** for single-file fixes; avoid parallel multi-agent reviews on small diffs.

## Test economy

Protect the live YAML → TypeScript → SVG path, but prefer lean, durable coverage over broad or temporary suites.

- One focused test at the owning layer beats the same behavior re-tested in 3 layers.
- Extend an existing targeted test rather than adding a sprawling fixture or browser suite.
- Do not add large regression harnesses for transitional, legacy, or likely-to-be-deleted code unless the user explicitly wants that protection.
- For small localized fixes, validate with the narrowest test that proves the contract and stop there.
- Keep broader end-to-end tests only when they protect a real user workflow that unit-level tests would miss.

## Scoped review (instead of full simo-sweep)

For localized preview/persist bugs: read this index + the relevant tier-2 flow map, run the listed tests, then at most **one** explore pass + **one** regression test if missing. Reserve multi-agent `/simo-sweep` for cross-cutting features (routing, ELK, new specs).

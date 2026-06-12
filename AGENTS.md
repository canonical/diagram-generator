# Agent instructions (diagram-generator)

Guidance for AI agents working in this repo. Goal: correct fixes with minimal token burn.

## Start here

1. **Read the project index:** [`docs/agent-index.md`](docs/agent-index.md) — packages, pipelines, tests, links to deep flow maps.
2. **Keep the working tree focused.** Stash or commit unrelated edits (especially formatted frame YAML under `scripts/diagrams/frames/`) before asking an agent to review or diff. Large cosmetic YAML diffs waste context on every `git diff`.
3. **Run `npm run clean:src-artifacts`** if vitest or tsx seems to execute stale code from `packages/*/src/**/*.js` (accidental tsc emit shadows `.ts`).

## Core rules

- Product path is Node + TypeScript.
- New layout, measure, render, save, and preview behavior belongs in `packages/layout-engine/` or `apps/preview/`.
- Do not add new Python product-path logic.
- `scripts/preview/*.js` is shell and glue, not engine authority.
- If a change needs real diagram semantics, put it in TypeScript first.
- `scripts/diagrams/frames/*.yaml` is the authored source of truth.
- Read the current YAML from disk before editing it and make minimal diffs.

## Cold-start path

Read these first:

1. [`docs/agent-index.md`](docs/agent-index.md)
2. [`DIAGRAM.md`](DIAGRAM.md)
3. Only the source files relevant to the task

Use [`STATUS.md`](STATUS.md) for a short handover only. Do not trawl large history docs unless the task explicitly needs them.

## Flow maps (tier 2 — add on demand)

Do **not** maintain flow maps for the entire project. When you work on a **cross-layer path** (3+ of UI → server → engine → disk) and no map exists yet:

1. Check the tier-2 table in [`docs/agent-index.md`](docs/agent-index.md).
2. If missing and the path is non-obvious, add a map **as part of that task** (same shape as [`specs/006-arrow-routing-redesign/preview-override-flow.md`](specs/006-arrow-routing-redesign/preview-override-flow.md): pipeline, key files, tests to run, known limits; aim for ≤60 lines).
3. Link it from the tier-2 table in `docs/agent-index.md`.

Skip creating a map if a focused test already documents the path or the change is single-file.

## Frame override allowlists

Do not duplicate key lists. Single source:

`packages/layout-engine/src/preview-shell/frame-override-manifest.ts`

- `PERSIST_FRAME_KEYS` → YAML save (`frame-diagram.ts`)
- `RELAYOUT_FRAME_KEYS` → client relayout (`layout-bridge.js` via `LayoutEngine.filterRelayoutOverrideEntry`)
- `UNDO_RELAYOUT_FRAME_KEYS` → undo/redo relayout trigger (`editor.js` via `LayoutEngine.hasV3FrameOverride`)

## Repo search hygiene (token + reliability)

Prefer **narrow, scoped searches** over repo-wide scans.

| Do | Don't |
|----|--------|
| `rg pattern apps/preview/src` | `rg pattern` from repo root (slow on large trees) |
| `rg pattern scripts/preview/editor.js` | Chain `find … \| head` — use PowerShell-native limits (`Select-Object -First N`) on Windows |
| One targeted read after rg | Re-read the same 6k-line file in every sub-agent |
| Run the tests listed in the flow map | Launch 5 parallel “sweep” agents for a single-file bug |

**Windows note:** Agents often run in PowerShell, not bash. Commands like `head`, `cat <<'EOF'`, and `find` fail or behave differently. That causes retries, background timeouts, and extra terminal polling — which inflates token usage even though the OS does not charge “more per token.”

**WSL note:** If you want lower agent friction, WSL is usually more reliable than PowerShell for generated shell commands. Best case: keep the repo in the WSL filesystem and run the toolchain there. Mixed Windows-mounted paths (`H:\...` or `/mnt/h/...`) work, but they can add quoting, path, and search-performance quirks. If you stay on Windows, prefer direct interpreter calls like `.venv\Scripts\python.exe` over shell activation commands.

## Scoped review (instead of full simo-sweep)

For localized preview/persist bugs:

1. Read [`docs/agent-index.md`](docs/agent-index.md) and the relevant tier-2 flow map (if any)
2. Run the listed tests
3. At most **one** explore pass + **one** regression test if missing

Reserve multi-agent `/simo-sweep` for cross-cutting features (routing, ELK, new specs).

## After changing layout-engine browser surface

If you add exports used by `layout-bridge.js` or `editor.js`:

```bash
npm --prefix packages/layout-engine run build:browser
```

Preview loads `packages/layout-engine/dist/layout-engine.iife.js`, not TypeScript source. `npm run preview` / `preview:dev` rebuild this automatically via `prestart` / `predev`. After changing browser exports, restart the preview server or run `npm run preview:build-browser`.

## Validation

```bash
npm --prefix packages/layout-engine test
npm --prefix apps/preview test
node scripts/check_no_new_python.mjs
```

Use targeted preview tests when changing preview routes, shell behavior, or save flows.

## Commits

Do not commit unrelated frame fixture reformats or inbox notes unless the user asked for them.

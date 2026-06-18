# Agent instructions (diagram-generator)

Guidance for AI agents working in this repo. Goal: correct fixes with minimal token burn.

## Start here

1. **Read the project index:** [`docs/agent-index.md`](docs/agent-index.md) — packages, pipelines, trap files, tier-2 flow maps.
2. **Keep the working tree focused.** Stash or commit unrelated edits (especially formatted frame YAML under `scripts/diagrams/frames/`) before asking an agent to review or diff. Large cosmetic YAML diffs waste context on every `git diff`.
3. **Run `npm run clean:src-artifacts`** if vitest or tsx seems to execute stale code from `packages/*/src/**/*.js` (accidental tsc emit shadows `.ts`).

## Workspace

- **Open only two roots when using the saved workspace:** `diagram-generator` + `diagram-generator-planning`, if the latter is explicitly mentioned. Drop every other sibling repo from the Cursor window — their `AGENTS.md` / rules inject **every turn**.
- Reopen [`diagram-generator.code-workspace`](diagram-generator.code-workspace) after changing roots. Old chats keep the workspace snapshot from when they started; start a **new chat** after trimming roots.
- `.cursorignore` and `.cursorindexingignore` exclude `diagrams/`, `node_modules/`, `dist/`, binaries, and spec-kit command files. Do not `@`-reference ignored paths unless the task requires them.

## Core rules

- Product path is Node + TypeScript.
- New layout, measure, render, save, and preview behavior belongs in `packages/layout-engine/` or `apps/preview/`.
- Do not add new Python product-path logic.
- `scripts/preview/*.js` is shell and glue, not engine authority.
- If a change needs real diagram semantics, put it in TypeScript first.
- `scripts/diagrams/frames/*.yaml` is the authored source of truth.
- Read the current YAML from disk before editing it and make minimal diffs.

## Priority ratchet

- Treat the remaining `scripts/preview/editor.js` monolith as a **top-priority architectural blocker**, not as acceptable steady state.
- Do **not** assume a 2k-3k-line hand-authored `editor.js` is "good enough" because earlier slices extracted some logic already.
- Until the `specs/046-editor-host-endgame/` closeout bar is met, agents should bias toward finishing that decomposition over starting secondary preview-shell polish or unrelated new engine-integration convenience work.
- A small line-count reduction is **not** completion. The target is a genuinely thin grid-shell entry/bootstrap file that would not block scaling toward dozens of engine lanes.
- Do **not** mark `specs/046-editor-host-endgame/` complete unless the repo is
  credibly ready for adding on the order of **150 heterogeneous engines**
  through typed registration points rather than through `editor.js` or
  `layout-bridge.js`.
- If a proposed change would widen `editor.js`, stop and route that work through the typed preview-shell owners or the active 046 decomposition plan instead.

## Spec workflow

- **Do not load spec-kit unless the user explicitly asks** (e.g. "/speckit", "write a spec", "run spec-kit"). Normal bugfixes skip `.github/agents/speckit.*`, `.github/prompts/speckit.*`, and bulk `specs/**` reads.
- When spec work *is* requested, open **one** package under `specs/<id>-<slug>/` named in the task; see [`docs/specs.md`](docs/specs.md) for the active index.
- Spec-driven work must use a matching feature branch: `feat/<id>-<slug>`.
- Keep one active spec per feature branch. Do not continue spec 046 work on a lingering `feat/043-...` branch or mix multiple active specs on one long-lived branch.
- If the active spec and current branch do not match, stop and either create/switch to the matching branch or ask the user how to split the work before making substantial edits.
- Review and merge per spec branch. After merge, delete the local and remote feature branch and archive the completed spec package under `docs/spec-archive/`.
- Completed or retired packages live under [`docs/spec-archive/`](docs/spec-archive/README.md). They are de-indexed on purpose; open them only when a task directly depends on historical context.
- Keep repo operating rules in this file. Do not duplicate them into Speckit prompts or agents.

## Cold-start path

Read these first:

1. [`docs/agent-index.md`](docs/agent-index.md)
2. [`DIAGRAM.md`](DIAGRAM.md)
3. Only the source files relevant to the task

**Read discipline:** do not load large context up front. Locate first with narrow `rg` / `Glob`, then read only what the task needs — usually a symbol hit or a bounded slice (`offset`/`limit` on trap files). Whole-file reads are fine for small modules; read whole files when that is genuinely simpler than stitching partial reads.

Use [`TODO.md`](TODO.md) for the execution queue and [`INBOX.md`](INBOX.md) for user async notes. Do not trawl large history docs unless the task explicitly needs them.

## Handover

*Agents: update this section when session state changes. Do not create parallel status docs.*

- **Product path:** Node preview app + TypeScript layout engine.
- **Source of truth:** frame YAML in `scripts/diagrams/frames/`.
- **Active spec (when relevant):** `specs/046-editor-host-endgame/` has cleared the structural integration-sink bar on the current branch: future engine onboarding no longer needs to widen `editor.js` or `layout-bridge.js`. It is **not** closed yet, because `editor.js` is still larger than an ideal thin bootstrap even after typed owners replaced the remaining inline selection/inspector/waypoint runtime assembly (`app-editor-runtime-set.ts`), bootstrap-tail runtime option mapping (`app-bootstrap.ts`), SVG-load runtime option mapping (`app-load.ts`), and relayout-runtime option mapping (`app-relayout-runtime.ts`). The browser-shell onboarding proof is test-backed across representative external, ported-family, and bespoke controller classes, and `layout-bridge.js` fresh-render recursion is fixed under the namespaced bridge contract. `specs/044-preview-shell-architecture-followup/` remains open for the residual compatibility/barrel cleanup around the preview bridge/browser contract, and `specs/045-preview-host-engine-modularity/` owns Node preview-host route/page modularity. `specs/047-render-ir-unification/` stays gated behind real 046 closeout. `docs/spec-archive/043-preview-shell-editor-ts-extraction/` is extraction-complete and reopens only for regressions. ELK midpoint-port follow-up remains under `specs/042-implicit-elk-side-ports/`. Otherwise see `TODO.md` / `docs/specs.md`.
- **Trap files (search, then partial read):** `scripts/preview/editor.js` (~1,695 lines in the current tree), `scripts/preview/layout-bridge.js` (~499 lines), `packages/layout-engine/dist/layout-engine.iife.js`.

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
| `rg` / `Glob` to locate, then partial `Read` | Open a trap file or spec tree whole-file without a search hit |
| One targeted read after rg | Re-read the same 6k-line file in every sub-agent |
| Run the tests listed in the flow map | Launch 5 parallel "sweep" agents for a single-file bug |

**Windows note:** Agents often run in PowerShell, not bash. Commands like `head`, `cat <<'EOF'`, and `find` fail or behave differently. That causes retries, background timeouts, and extra terminal polling — which inflates token usage even though the OS does not charge "more per token."

**WSL note:** If you want lower agent friction, WSL is usually more reliable than PowerShell for generated shell commands. Best case: keep the repo in the WSL filesystem and run the toolchain there. Mixed Windows-mounted paths (`H:\...` or `/mnt/h/...`) work, but they can add quoting, path, and search-performance quirks. If you stay on Windows, prefer direct interpreter calls like `.venv\Scripts\python.exe` over shell activation commands.

## Token budget

### Screenshots and pasted images

- **Do not capture or analyze browser/Playwright screenshots unless the user explicitly asks.**
- Default verification: tests, preview URL, text description of the layout issue.
- If the user requests a visual check: crop to the affected region; avoid full-viewport captures.
- Pasted chat images are billed as vision input — often **hundreds to low thousands of tokens per image**, and they stay in session history on every follow-up turn.

### Workspace and agents

- Trap files: `scripts/preview/editor.js`, `packages/layout-engine/dist/*.iife.js`, bulk `specs/**` reads.
- **0 subagents** for single-file fixes; avoid parallel multi-agent reviews on small diffs.

## Test economy

Be deliberate about test cost. Protect the **live YAML -> TypeScript -> SVG path**, but err on the side of **lean, durable coverage** over broad or temporary suites.

- Prefer one focused test at the owning layer over the same behavior re-tested in 3 layers.
- Prefer extending an existing targeted test over creating a new sprawling fixture or browser suite.
- Do not add large regression harnesses for transitional, legacy, or likely-to-be-deleted code unless the user explicitly wants that protection.
- For small localized fixes, validate with the narrowest test that proves the contract and stop there.
- Add or keep broader end-to-end tests only when they protect a real user workflow that unit-level tests would miss.

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
Do not default to adding new broad test suites unless the change affects a durable cross-layer contract.

## Commits

Do not commit unrelated frame fixture reformats or inbox notes unless the user asked for them.

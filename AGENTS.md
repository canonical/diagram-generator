# Agent instructions (diagram-generator)

Always-on repo **invariants and cold-start pointers only**. This file is auto-loaded
every turn, so keep it lean: no dated notes, no handover, no task state, no
operational how-to. Each of those has exactly one owner (below); never restate
another file's content here.

## Cold start — read in this order

1. [`AGENT-INBOX.md`](AGENT-INBOX.md) — **live state**: current task, blockers, last-known-green. Single owner of "what's happening now".
2. [`docs/agent-index.md`](docs/agent-index.md) — **operational playbook**: trap files, commands, search hygiene, token/test economy, flow maps.
3. [`DIAGRAM.md`](DIAGRAM.md), then only the source files the task needs. Do not front-load large context.

Single-owner map — never duplicate a row's content into another file:

| Need | Owner |
|------|-------|
| Always-on invariants (this file) | `AGENTS.md` |
| Live state / handover | `AGENT-INBOX.md` |
| Operational how-to (trap files, commands, search, economy, flow maps) | `docs/agent-index.md` |
| Execution order / queue | `TODO.md` |
| Spec catalog + status | `docs/specs.md` |
| Human async notes | `INBOX.md` |
| Durable per-spec detail | `specs/<id>-<slug>/` |

Keep the tree focused: stash or commit unrelated frame-YAML reformats before review or diff. Run `npm run clean:src-artifacts` if tests execute stale `packages/*/src/**/*.js`.

## Workspace

- **Open only two roots when using the saved workspace:** `diagram-generator` + `diagram-generator-planning`, if the latter is explicitly mentioned. Drop every other sibling repo from the Cursor window — their `AGENTS.md` / rules inject **every turn**.
- Reopen [`diagram-generator.code-workspace`](diagram-generator.code-workspace) after changing roots. Old chats keep the workspace snapshot from when they started; start a **new chat** after trimming roots.
- `.cursorignore` and `.cursorindexingignore` exclude `diagrams/`, `node_modules/`, `dist/`, binaries, and spec-kit command files. Do not `@`-reference ignored paths unless the task requires them.

## Core rules

- Product path is Node + TypeScript.
- New layout, measure, render, save, and preview behavior belongs in `packages/layout-engine/` or `apps/preview/`.
- Do not add new Python product-path logic.
- `scripts/preview/*.js` is a migration-era legacy shell compatibility surface, not a growth surface.
- Do **not** create new behavior-heavy files under `scripts/preview/`.
- Do **not** add new architecture-owned logic to existing `scripts/preview/*.js` just because those files already exist.
- If a preview change needs real diagram semantics, state shaping, engine branching, persistence logic, host routing logic, render logic, or shared controller behavior, put it in TypeScript first.
- The only acceptable JS-first exception is tiny browser-entry compatibility glue that immediately delegates to typed owners.
- If JS must be touched, the preferred direction is shrink, wrapper, and delegation into TypeScript owners, not new ownership.
- "Write JS now, migrate later" is not an acceptable default in this repo.
- `diagrams/1.input/*.yaml` is the authored source of truth.
- Read the current YAML from disk before editing it and make minimal diffs.

## Priority ratchet

- Spec 046 is archived, but its ratchet remains active: treat `scripts/preview/editor.js` and `scripts/preview/layout-bridge.js` as thin adapters, not acceptable growth surfaces.
- Do **not** assume a hand-authored legacy JS shell is "good enough" merely because earlier slices extracted some logic already.
- A small line-count reduction is **not** completion. The bar remains a genuinely thin grid-shell entry/bootstrap file that would not block scaling toward dozens or hundreds of engine lanes.
- The presence of many legacy files under `scripts/preview/` is **not** precedent for adding more. Treat new behavior-heavy JS there as architectural regression against spec 046.
- Preserve the literal many-engine closeout bar: future engine onboarding should remain possible through typed registration points rather than through `editor.js`, `layout-bridge.js`, or equivalent central browser-shell branching.
- If a proposed change would widen `editor.js`, `layout-bridge.js`, reintroduce central preview-host/document-kind/engine branching, or add new behavior-heavy ownership under `scripts/preview/*.js`, stop and route that work through the typed preview-shell owners or a new follow-up spec instead.

## Spec workflow

- **Do not load spec-kit unless the user explicitly asks** (e.g. "/speckit", "write a spec", "run spec-kit"). Normal bugfixes skip `.github/agents/speckit.*`, `.github/prompts/speckit.*`, and bulk `specs/**` reads.
- When spec work *is* requested, open **one** package under `specs/<id>-<slug>/` named in the task; see [`docs/specs.md`](docs/specs.md) for the active index.
- Spec-driven work must use a matching feature branch: `feat/<id>-<slug>`.
- Keep one active spec per feature branch. Do not continue spec 046 work on a lingering `feat/043-...` branch or mix multiple active specs on one long-lived branch.
- If the active spec and current branch do not match, stop and either create/switch to the matching branch or ask the user how to split the work before making substantial edits.
- Specs that touch the preview override/save path cannot claim **Closeout Ready** without a repo-owned `persist -> reload` regression that exercises the changed persistence behavior.
- Review and merge per spec branch. After merge, delete the local and remote feature branch and archive the completed spec package under `docs/spec-archive/`.
- Completed or retired packages live under [`docs/spec-archive/`](docs/spec-archive/README.md). They are de-indexed on purpose; open them only when a task directly depends on historical context.
- Keep repo operating rules in this file. Do not duplicate them into Speckit prompts or agents.

## Frame override allowlists

Do not duplicate key lists. Single source:

`packages/layout-engine/src/preview-shell/frame-override-manifest.ts`

- `PERSIST_FRAME_KEYS` → YAML save (`frame-diagram.ts`)
- `RELAYOUT_FRAME_KEYS` → client relayout (`layout-bridge.js` via `LayoutEngine.filterRelayoutOverrideEntry`)
- `UNDO_RELAYOUT_FRAME_KEYS` → undo/redo relayout trigger (`editor.js` via `LayoutEngine.hasV3FrameOverride`)

## After changing layout-engine browser surface

If you add exports used by `layout-bridge.js` or `editor.js`:

```bash
npm --prefix packages/layout-engine run build:browser
```

Preview loads `packages/layout-engine/dist/layout-engine.iife.js`, not TypeScript source. `npm run preview` / `preview:dev` rebuild this automatically via `prestart` / `predev`. After changing browser exports, restart the preview server or run `npm run preview:build-browser`.

## Commits

- `AGENT-INBOX.md` is **live state — commit it whenever it changes**, in the same
  commit as the work it describes. A stale inbox is a bug, not tidiness. Keep it
  drained: when a note is resolved or superseded, **triage it into the owning
  `specs/<id>-<slug>/` package** (or delete it — git holds the history); do not let
  notes rot. `docs/specs.md` (catalog) and `TODO.md` (queue) are bookkeeping owners
  too — update and commit them when a spec's status or order changes.
- "Do not commit **unrelated** changes" means keep a commit focused: do not sweep
  unrelated frame-fixture reformats or stray edits into a feature commit. It is
  **not** a rule against committing inbox / catalog / queue updates that reflect the
  work in that commit — those should be committed.

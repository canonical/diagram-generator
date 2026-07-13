# Adversarial review request — spec 075 (preview folder workspaces), Phases 0–1

You are an adversarial reviewer. Audit the spec 075 **Phase 0 + Phase 1** implementation
in the `diagram-generator` repo. Assume the author is over-claiming; verify everything
against the code and by running the suite. Be specific and evidence-based.

## Where to write your review (do NOT answer in chat)

Write your full findings to a new file:

```
docs/spec-reviews/075-preview-folder-workspaces-adversarial-review-2026-07-13.md
```

Create it yourself. Do not paste the review into the chat — only write the file, then
reply with a one-paragraph summary + the verdict line. Match the format of existing
reviews in `docs/spec-reviews/` (e.g. `077-mermaid-elk-cluster-lowering-port-adversarial-review-2026-07-10.md`):
a **Verdict** section, then findings grouped by severity **BLOCKER / HIGH / MEDIUM / LOW**,
each with file+line, a concrete reproduction, why it violates the spec or creates
silent loss/risk, a recommended fix, and whether an existing test covers it.

## Scope

- Repo: `H:\WSL_dev_projects\diagram-generator`
- Branch: `feat/075-preview-folder-workspaces`
- Commits under review: `97f1284` (Phase 0) and `b4ecffc` (Phase 1). Base is `main` (`ae003b6`).
- Spec package: `specs/075-preview-folder-workspaces/` (`spec.md`, `plan.md`, `tasks.md`).

**In scope:** the server-side workspace-source abstraction and multi-root server folders.
**Explicitly OUT of scope** (not built yet — do not fault their absence, but do sanity-check
that the current design does not paint them into a corner):
- Phase 2 browser `local-folder` (File System Access) source
- Phase 3 external-change/conflict handling
- Phase 4 security-docs closeout
- T012 per-source nav **section headers** (currently the nav is flat: extra-root diagrams
  appear as `sourceId:slug` entries)
- T014 read-only `bundled-examples` split

## Read first

- `AGENTS.md`, `AGENT-INBOX.md` (spec 075 Phase 0/1 handover notes), `docs/agent-index.md`
- `specs/075-preview-folder-workspaces/{spec.md,plan.md,tasks.md}`
- New/changed code:
  - `apps/preview/src/preview-host/workspace/diagram-workspace-source.ts`
  - `apps/preview/src/preview-host/workspace/workspace-registry.ts`
  - `apps/preview/src/preview-host/workspace/server-root-source.ts`
  - `apps/preview/src/preview-host/document-apis.ts`
  - `apps/preview/src/preview-host/builtin-autolayout-host.ts`
  - `apps/preview/src/preview-host/builtin-host-deps.ts`
  - `apps/preview/src/preview-host/builtin-host-runtime.ts`
  - `apps/preview/src/server.ts`
  - `apps/preview/src/persistence/workspace-source.test.ts`

## Claims to challenge (verify, don't trust)

1. **Path safety (FR-008 / SC-005).** `resolveContainedFramePath` uses realpath containment.
   Try to defeat it: `..` slugs, absolute paths, path separators, symlink escape (note:
   symlink test self-skips on Windows without privilege — verify it actually holds on a
   platform where symlinks work, e.g. WSL/Linux). Is `isBareSlug` the only gate on write?
   Can a qualified address smuggle a traversal through `parseQualifiedSlug`?
2. **FR-001 "no nav/open/save path references a raw directory".** The author claims the
   request path now resolves via the registry with an *identity fallback*. Check whether
   the fallback (`resolveFrameDir` returning null → base `framePreviewDocumentDeps.framesDir`)
   is a bypass: is there any endpoint (SVG/drawio export, frame-tree, overrides, save) that
   still reads/writes the default `framesDir` without going through a source? Is `read()`/
   `write()` on the source actually load-bearing in production, or only exercised by tests?
3. **Qualified-slug round-trip.** A diagram in a non-default `--root` is listed as
   `sourceId:slug`, linked as `/view/v3:sourceId:slug`, normalized (strip `v3:`), and must
   resolve back to the right folder for the viewer page AND every client API call
   (`/api/preview-document/…`, frame-tree, overrides, save, `/v3/svg/…`, `/v3/drawio/…`).
   Trace each. Do the SVG/drawio export routes (which parse the slug out of the *pathname*
   via `resolveSvgExportSlug`) preserve the `sourceId:` prefix, or do they silently drop it
   and read the default root? This is the most likely real bug — dig here.
4. **Backward compatibility.** Bare slugs must still resolve to the default source. Confirm
   existing deep links, the index page, and all `preview-host-contract` tests are unchanged.
5. **Listing collisions (SC-001).** Duplicate filenames across roots must stay distinct.
   Confirm, and check the default-source-bare / others-qualified rule can't collide (e.g. a
   default slug that literally looks like `other:foo`).
6. **Persistence (SC-002).** Saving a diagram opened from a non-default root must write back
   to that root, not the default. Is there a repo-owned persist→reload proving it end to end
   *through the running server/save endpoint* (not just the registry primitive)? The spec
   says specs touching the save path need a `persist → reload` regression before Closeout.
7. **No regressions / no new Python / no new behaviour-heavy `scripts/preview/*.js`.**

## Commands

```bash
npm --prefix apps/preview test          # node --test src/persistence/*.test.ts
npx --prefix apps/preview tsc -p apps/preview/tsconfig.json --noEmit
node scripts/check_no_new_python.mjs
# multi-root smoke: start with two roots and hit the nav + a qualified diagram
node --import tsx apps/preview/src/server.ts --root "Mine=H:\path\to\folder" --port 8137
```

**Known noise:** `apps/preview/src/persistence/editor-live-repaint-regression.test.ts` has a
flaky Chromium browser test ("engine-specific layout buckets …") that fails intermittently
**on `main` too** — confirm independently (stash the branch diff / run on `main`) before
attributing any failure there to this work. Everything else must pass.

## Deliver

- The review file at the path above.
- A merge verdict for the **Phase 0+1 server slice only**: clean-to-continue, or blocked
  (with the blocking findings). Judge it as an incremental slice, not the whole spec.

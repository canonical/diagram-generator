# Opus review — Spec 075 preview folder-workspace UX and delivery path

Date: 2026-07-20
Reviewer role: product + architecture owner (closeout review)
Scope: the real end-user workflow (open folder → grouped sidebar → canvas →
save back to that folder), not test coverage in isolation.
Reviewed tip: `main` @ `bbb9e73` (all Spec 075 phases are merged; see below).

## Verdict

**Changes requested — evidence-gated, not a code block.**

The target workflow is genuinely implemented and merged on `main`, in
TypeScript-first owners, with strong automated and real-OPFS-handle coverage.
Tracing the production routes (not the tests) confirms the four core promises:
a prominent Open-folder call to action, a grouped sidebar that lists an opened
folder's diagrams before the bundled corpus, qualified-address rendering onto
the canvas, and a save path whose success is gated on the actual browser
file-handle write. Read-only bundled examples, Save a copy, external-change
conflict handling, reconnect/forget, bounded ingest, and safe-mode YAML are all
present and wired at the correct boundaries.

Spec 075 still cannot be marked **Closeout Ready**, for two reasons that are
about *evidence and process*, not defects:

1. The single most user-facing state in the review brief — a **native OS file
   picker plus a real browser permission revoke/regrant** — has never been
   exercised. All handle evidence comes from a deterministic OPFS harness
   (T045).
2. This document is the **first actual adversarial closeout review** for 075.
   The prior Opus request
   (`075-preview-folder-workspaces-opus-review-request-2026-07-17.md`) was never
   fulfilled — its required findings file
   (`opus-adversarial-review-findings-2026-07-17-spec-075.md`) does not exist.

Separately, one target from the review brief — *"work for a non-repo user
without terminal setup beyond launching the preview"* — is **not delivered** and
is out of 075's declared scope. It belongs to a successor spec (see D1 → Spec
083).

## What was verified in the real workflow (not just tests)

| Promise | Evidence (production route) | Status |
|---|---|---|
| Prominent "Open folder…" CTA in empty state | [pages.ts](../../apps/preview/src/preview-host/pages.ts) builds the button in a top `dg-workspace-open-row` above browse sections, with first-run copy | Met |
| Opened folder appears in the sidebar, its group first | `listWorkspaceBrowseSections` sorts `local-folder` → server → `bundled-examples` in [builtin-host-runtime.ts](../../apps/preview/src/preview-host/builtin-host-runtime.ts#L203-L210); FR-010 satisfied at the browse-section boundary (not merely registry push order) | Met |
| Nav refreshes without a manual second reload | [local-folder-workspace.ts](../../packages/layout-engine/src/preview-shell/local-folder-workspace.ts) reloads once only when `/api/workspaces/open` reports `registered: true`, navigates directly otherwise | Met |
| Select → central canvas | qualified `sourceId:slug` → `/view/v3:<source>:<slug>` resolved through `WorkspaceRegistry.resolve` in [workspace-registry.ts](../../apps/preview/src/preview-host/workspace/workspace-registry.ts#L69-L85) | Met |
| Save writes back to that same folder, gated on the handle | `__DG_workspaceFetch` mirrors canonical YAML *after* the server response and returns only after the handle write; failures become 409/502 non-2xx and retain dirty state (`saveFailureResponse`, [local-folder-workspace.ts](../../packages/layout-engine/src/preview-shell/local-folder-workspace.ts#L293-L300)) | Met |
| Bundled examples read-only when a writable source exists | `sourceIsWritable` gate in [builtin-host-runtime.ts](../../apps/preview/src/preview-host/builtin-host-runtime.ts) | Met |
| Duplicate filenames | cross-source collision prevented by qualified `sourceId:slug`; case-insensitive in-folder duplicates rejected at ingest (T029) | Met |
| Unsupported browser | `showDirectoryPicker` feature-detected; button hidden and `--root "Name=path"` guidance shown | Met |
| Architecture ratchet (spec 046) | folder open, IndexedDB, mirror, reconnect all in typed `preview-shell`; `scripts/preview/save-client.js` stays a ~9-line delegating wrapper | Met |

## Findings, ordered by user impact

### G1 — High (evidence gap, blocks Closeout Ready)
Native OS chooser and a genuine permission **revoke → restart → regrant** cycle
are unproven. `scripts/verify-folder-workspace-chromium.mjs` and
`validation.md` supply real `FileSystemDirectoryHandle` objects
deterministically over OPFS; they never invoke the native picker or a real
permission drop. The review brief singles out permission/restart/regrant as
first-class states, so automated OPFS coverage is not a substitute here.
Remediation: perform the manual Chromium journey named in T045 (open two
same-named real folders via the OS chooser, edit/save each, externally change
one, reload, revoke permission in browser settings, restart the preview server,
regrant on return) and record the OS files plus grouped nav as evidence. Until
then T045 stays `[~]` and 075 stays closeout-pending.

### G2 — High (process gap, blocks Closeout Ready)
No adversarial closeout review existed before this file. The 2026-07-17 request
was never answered. This document discharges that gate for the code and
automated evidence, but the merge gate in
`075-preview-folder-workspaces-adversarial-review-2026-07-17.md`
(item 2, "Opus adversarial closeout") is only now satisfied — and only
conditionally on G1.

### G3 — Medium (governance)
The **entire** 075 implementation (Phases 0–3, commits `e079a4a`…`f0f440f`) is
already on `main` with **no `feat/075` branch** and the spec still labelled
"In progress". AGENTS.md requires a repo-owned `persist → reload` regression and
closeout before a preview save-path spec merges; here the code shipped ahead of
the closeout gates, so the review is retroactive and there is no pre-merge
revert point. `docs/specs.md` and `TODO.md` already describe this accurately
("Closeout pending — implementation on `main`"), so no queue/status change is
required — but future save-path specs should not repeat merge-before-closeout.
Remediation: none beyond finishing G1 then archiving; treat as a process note.

### D1 — Medium (scope: successor, not a 075 defect)
The review brief asks for a non-repo user to work "without terminal setup beyond
launching the preview." Launching the preview *is* the terminal setup today:
`npm run preview` requires a repo checkout, `npm install`, and a Node/nvm
toolchain ([package.json](../../package.json), [apps/preview/package.json](../../apps/preview/package.json)).
075 explicitly non-goaled a packaged desktop shell and deferred this in its open
question #1. This is real product debt but the wrong owner for 075.
Remediation: tracked as **Spec 083 preview folder-workspace delivery shell**
(scoping/naming only in this review — no product code).

## Requirements / task-status reconciliation

- FR-001…FR-011 and SC-001…SC-009 are implemented and route-verified. No
  requirement is falsely marked complete against missing code.
- T045 correctly remains `[~]` (native evidence outstanding) — accurate.
- T044 ("Opus closeout … findings file still pending") is discharged by this
  file; update its pointer to here.
- No task claims done without code. The only "done-without-full-proof" item is
  the native-picker manual journey, which is already flagged `[~]`.

## Validation performed for this review

- Traced production routes end to end (pages/nav/registry/save) rather than
  reading tests; cross-checked the save-gate, browse ordering, and reload-once
  logic against source.
- Confirmed 075 code is an ancestor of `main` (`git merge-base --is-ancestor`).
- Did not re-run the full suite; last green is recorded in `validation.md`
  (layout-engine 1,062; preview 188/1-skip; Chromium OPFS journey green).
- Could not exercise the live server in this environment (sandbox blocked the
  `tsx` IPC socket); this does not affect the code-trace findings and is
  orthogonal to G1's native-picker requirement.

## Prioritized path forward

1. **G1** — run and record the native OS picker + real revoke/restart/regrant
   journey (closes T045). Must-fix for Closeout Ready.
2. **G2** — this review satisfies the closeout-review gate conditional on G1.
3. Archive `specs/075-preview-folder-workspaces/` to `docs/spec-archive/` once
   G1 lands; flip `docs/specs.md` status to Closed.
4. **D1** — pursue Spec 083 (delivery shell) as follow-up, not a 075 blocker.

## Disposition of merge safety

The code is already on `main` and is, by trace, functionally sound and
architecture-compliant; there is nothing to block or revert. "Changes
requested" here means **do not declare Closeout Ready or archive** until the G1
native evidence exists. Everything else is follow-up (D1) or process note (G3).

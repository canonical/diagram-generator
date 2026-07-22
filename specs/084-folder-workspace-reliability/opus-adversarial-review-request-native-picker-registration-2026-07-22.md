# Opus adversarial review request — native folder selection does not register

**Date**: 2026-07-22
**Review target**: `feat/084-folder-workspace-reliability` at `f829f2c`, with
the live preview on `http://127.0.0.1:8100/`.
**Reviewer role**: adversarial browser-runtime, product, and integration
reviewer. Treat the following user observation as primary evidence; do not
explain it away as picker training or a test limitation.

## Required handback

1. Write the complete review only to:
   `docs/spec-reviews/opus-adversarial-review-findings-2026-07-22-spec-084-native-picker-registration.md`
2. Then edit the **Pending Opus review** line in `AGENT-INBOX.md`, replacing it
   with a direct Markdown link to that output and a one-line verdict. Do not
   otherwise rewrite `AGENT-INBOX.md`.

## The reported failure to investigate

The person running the actual local preview clicks **Open folder…**, selects a
folder in the native Chromium/macOS chooser, and confirms it with Enter.

- On the **index page**, the folder-workspace status ultimately says **“No
  folder was opened.”** even though a folder was selected and confirmed.
- On a **canvas/viewer page**, the same interaction has no visible result.
- In neither case does a named local-folder group appear above **Bundled
  examples** in the Browse sidebar.

This is a real native-picker result, not a mocked `AbortError` test. The
current code interprets every picker `AbortError` as cancellation, but that
classification has not been proven correct for the reported native selection.
The expected success path is also unproven: read the selected handle, POST it
to `/api/workspaces/open`, register a local source in the current preview host,
and navigate to a viewer whose Browse tree contains that source above bundled
examples.

Earlier changes added pending/cancelled/scan-progress messages, but they have
not resolved this actual selection-to-registration failure. Review the served
runtime identity before source-level conclusions: port 8100 must be the current
084 worktree, not the stale 075 worktree.

## Questions Opus must answer

1. Does the actual picker confirmation reach `showDirectoryPicker` resolution?
   If it rejects, capture its real `name`, `message`, and timing. Establish
   whether the selected-folder case is truly cancellation, a browser/security
   rejection, or a product misclassification of `AbortError`.
2. Compare the **index** and **viewer** bootstraps end-to-end. Is the same
   typed controller/bundle loaded, is the button listener installed once, and
   does each page expose the operation status visibly after selection?
3. For a folder that directly contains valid YAML, trace and observe every
   production boundary: directory enumeration, upload request/response,
   `registerWorkspaceSource`, navigation/reload, and Browse-tree rendering.
   Identify the first boundary that is absent, rejected, stalled, or loses
   state.
4. Verify whether Enter in the native macOS folder chooser actually confirms
   the selected folder in this browser/version, versus navigating into it or
   cancelling. If human/OS interaction prevents proof, state the limitation
   plainly and give the smallest reproducible observation needed; do not infer
   success from source or mocks.
5. Determine why a valid native selection can result in the user-facing final
   message **“No folder was opened.”** Recommend a state/error model that never
   misrepresents a failed selected-folder operation as voluntary cancellation.
6. Determine why a successful `/api/workspaces/open` would or would not be
   visible immediately in the current viewer/sidebar. Confirm local folders
   still sort before Bundled examples in the production owner, but do not call
   that sufficient without proving the source was registered in the serving
   process.
7. Assess the current 15-second scan timeout and progress text: do they aid
   diagnosis without hiding the underlying error, creating stale work, or
   falsely marking an operation complete?
8. Recommend the smallest implementation and regression set that can prove
   the native picker → registration → sidebar group path on both index and
   viewer pages. Preserve the Spec 046 ratchet: typed preview-shell and
   preview-host owners; no new behavior-heavy `scripts/preview/*.js` owner.

## Required method and evidence bar

- Establish server PID, working directory, branch/commit, URL, served HTML,
  and browser/profile before testing.
- Use real Chrome and the native operating-system chooser when available.
  Distinguish a real selection, actual cancellation, an `AbortError`, and a
  mocked test. Never mark picker success verified from a DOM click alone.
- Inspect live status text on index and viewer pages, browser console/network
  evidence, and preview-host registration state. If a needed native action
  cannot be performed autonomously, identify it as an evidence gap rather than
  fabricating a result.
- Trace production owners only after live identity is established:
  `packages/layout-engine/src/preview-shell/local-folder-workspace.ts`,
  `packages/layout-engine/src/preview-shell/app-bootstrap.ts`,
  `apps/preview/src/preview-host/builtin-server-routes.ts`, and
  `apps/preview/src/preview-host/builtin-host-runtime.ts`.

## Required output format

```markdown
# Opus adversarial review — native picker registration, Spec 084

Date: 2026-07-22
Reviewed branch/commit:
Live URL, server PID, and working directory:
Browser/profile and native-evidence status:

## Verdict

## What was independently observed

## Native selection trace

## Findings ordered by user impact

## Cross-page analysis

## Required implementation and regression changes

## Evidence gaps and closeout status
```

Every finding must include severity (`blocker`, `high`, `medium`, or `low`),
direct evidence, the owning code/requirement, and a concrete remediation. The
review is successful only if it resolves or sharply narrows the discrepancy
between “folder selected” and “No folder was opened,” and between registration
claim and absent Browse group.

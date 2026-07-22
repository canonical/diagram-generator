# Opus adversarial review request — Spec 084 folder-workspace reliability

**Date**: 2026-07-22  
**Review target**: current `feat/084-folder-workspace-reliability` documentation
tip, plus the currently served preview workflow on localhost.  
**Reviewer role**: adversarial product, UX, browser-runtime, and architecture
reviewer. Treat the reporter as a non-developer who will abandon the tool if a
first-run folder action is ambiguous.  
**Review output (required)**:
`docs/spec-reviews/opus-adversarial-review-findings-2026-07-22-spec-084-folder-workspace-reliability.md`

Do not overwrite this request, `AGENT-INBOX.md`, or the Spec 084 plan. Write
your complete review only to the required output path above.

## Why this review is needed

Spec 075 claimed a local-folder workflow with an **Open folder…** action, a
named Browse section for opened folders above Bundled examples, automatic
restore, reconnect, and handle-gated saves. The key sidebar fix landed in
`f0f440f` (2026-07-18) and remains in current history; no subsequent commit
removed its ordering or re-registration logic.

Nevertheless, the reported real UI shows **Open folder…** followed only by an
unrelated green `Ready` indicator—no folder chooser result, visible workspace
status, recovery action, or named Browse group. A controlled Chrome page on
the same local URL can show **Reconnect folder…** only after asynchronous
restore finds a denied remembered handle. That means recovery is state
conditional and may be absent exactly when a user needs to understand what to
do. The product currently makes it too hard to distinguish among a missing
native chooser, a cancelled operation, browser permission loss, a new local
origin, stale server registration, and a wrong build.

Spec 084 proposes to make the operation observable, keep recovery adjacent and
durable, prove grouped navigation after server restart, and require actual
Chrome native chooser/revoke/re-grant evidence before closeout.

## Materials to review

- Feature and proposed solution:
  - `specs/084-folder-workspace-reliability/spec.md`
  - `specs/084-folder-workspace-reliability/plan.md`
  - `specs/084-folder-workspace-reliability/research.md`
  - `specs/084-folder-workspace-reliability/contracts/workspace-operation-ui.md`
  - `specs/084-folder-workspace-reliability/tasks.md`
- Existing implementation and historical claim:
  - `specs/075-preview-folder-workspaces/workspace-flow.md`
  - `packages/layout-engine/src/preview-shell/local-folder-workspace.ts`
  - `apps/preview/src/preview-host/builtin-host-runtime.ts`
  - `apps/preview/src/preview-host/builtin-server-routes.ts`
  - `docs/spec-reviews/opus-adversarial-review-findings-2026-07-20-spec-075-ux-delivery.md`
- Live handover and status: `AGENT-INBOX.md`

## Required review method

1. **Establish runtime identity before drawing conclusions.** Record the local
   URL, the preview process working directory/branch, the HTML and browser-bundle
   identity actually served, and the browser/profile that was tested. Do not
   infer a live result from source files alone.
2. **Use real Chrome for the browser-facing journey.** Inspect the visible DOM
   before and after the asynchronous workspace restore. Attempt the Open-folder
   action under a real user gesture. If native chooser selection or permission
   acceptance requires a human, say exactly what was and was not observed; do
   not call mocked handles, OPFS, a DOM click alone, or source inspection proof
   of native-picker success.
3. **Exercise or explicitly mark unexercised**: first run with no remembered
   folder, chooser cancellation, valid-folder opening, named left-sidebar
   section, preview-server restart, granted restore, revoked permission,
   reconnect/re-grant, different localhost port/origin, invalid/empty folder,
   and save/reload after recovery.
4. **Trace production owners, not test doubles only.** Confirm state ownership
   stays in typed preview-shell and preview-host code; reject any plan that
   grows `scripts/preview/*.js` into another behavior owner.
5. **Assess the proposed remedy adversarially.** Identify whether Spec 084's
   visible operation-state contract is sufficient, where it can race or be
   overwritten, and whether it promises anything browsers cannot know across
   local origins. Recommend narrower or stronger requirements where needed.

## Questions Opus must answer

### Current functionality

1. Can a fresh user tell, from the page alone, whether **Open folder…** worked,
   was cancelled, is waiting on the native browser, or failed? Cite actual
   visible evidence.
2. Does every successful folder registration visibly produce the named Browse
   group before Bundled examples without a manual URL edit or accidental reload?
3. Is recovery discoverable and correctly scoped for a user who has no
   remembered record, a denied record, a server restart, or a new local port?
4. Can an unrelated `Ready` indicator be mistaken for a successful folder
   operation? If yes, classify that as a product defect rather than a training
   issue.
5. Does the current flow fail safely—no partial group and no false save success—
   under cancellation, invalid folders, denied permission, and re-registration
   failure?
6. Are the prior Spec 075 claims accurate, overstated, or missing critical
   native-browser evidence? Separate real proof from code trace and mocks.

### Plan to fix it

7. Does Spec 084 define a single owner and an adequate lifecycle for pending,
   cancelled, succeeded, recoverable, and failed states?
8. Is the proposed adjacent recovery/action model discoverable without knowing
   browser storage, ports, origins, worktrees, or developer tools?
9. Does the plan correctly preserve browser security boundaries rather than
   promising restoration across origins it cannot access?
10. Are the automated and real-Chrome gates enough to prevent this exact
    regression from returning? Identify missing cases, acceptance criteria, or
    evidence requirements.
11. Does the plan preserve the spec-046 architecture ratchet: typed owners,
    thin legacy adapters, no new central engine/document branching, and no
    behavior-heavy legacy JS?

## Required findings format

Start the output file with:

```markdown
# Opus adversarial review — Spec 084 folder-workspace reliability

Date: 2026-07-22
Reviewed branch/commit:
Live URL and process identity:
Browser and native-evidence status:

## Verdict

## What was independently verified

## Findings ordered by user impact

## Assessment of the Spec 084 plan

## Required changes before implementation

## Validation and evidence gaps

## Disposition
```

For each finding, state severity (`blocker`, `high`, `medium`, or `low`), the
observable evidence, the affected requirement/task, a concrete remediation, and
whether it blocks implementation, merge, or closeout. Do not mark native
chooser/revoke/re-grant as verified unless it was genuinely observed in Chrome
with the operating-system dialogs involved.

## Review bar

This is not a request to validate source-level intent. The review passes only
if it makes a skeptical decision about whether a person who clones/starts the
tool can trust the folder workflow without reverse-engineering browser state.
If live native interaction cannot be completed, report that limitation plainly
and retain the appropriate evidence gate; do not downgrade the gap because the
automated suite is green.

# Opus adversarial review — Spec 084 folder-workspace reliability

Date: 2026-07-22
Reviewed branch/commit: `feat/084-folder-workspace-reliability` @ `dc9bde1`. The
084 diff vs `main` is **documentation only** (spec, plan, research, contracts,
checklists, data-model, quickstart, tasks, plus `AGENT-INBOX.md`, `TODO.md`,
`docs/specs.md`). No implementation change exists on this branch yet, so this is
a pre-implementation review of an existing (Spec 075) runtime plus a proposed
fix.
Live URL and process identity: `http://127.0.0.1:8100/` served by node PID 224.
Its working directory is
`/Users/l/work/diagram-generator-worktrees/075-preview-folder-workspaces/apps/preview`
(branch `feat/075-preview-folder-workspaces` @ `06330e8`) — **not** the 084
review root. `127.0.0.1:8101` is not listening. The served controller file
(`packages/layout-engine/src/preview-shell/local-folder-workspace.ts`) is
byte-identical between the served 075 worktree and the 084 root, so the source I
traced matches the running behavior.
Browser and native-evidence status: I did **not** drive a real Chrome native OS
folder chooser, permission revoke, or re-grant. I inspected the served DOM via
HTTP (static markup, pre-JavaScript), read the browser bundle source, and traced
control flow. Native chooser / revoke / re-grant are therefore **not**
independently verified here; the evidence gate is retained, not satisfied.

## Verdict

The reported regression is **real and reproducible at the source + served-DOM
level**, independent of any single user's machine. Two defects are provable
without a native picker:

1. `Open folder…` gives **no visible outcome** while the picker is open and
   **no visible outcome on cancellation** — it can genuinely appear to do
   nothing.
2. The viewer template renders an empty workspace-status region **directly above
   an unrelated green `Ready` indicator**, so the only visible "positive" signal
   next to `Open folder…` is one that has nothing to do with folders.

Spec 084 correctly diagnoses the class of problem (observability, durable
recovery, native evidence) and preserves the spec-046 architecture ratchet. It
is safe to begin implementation, but the plan and contract have concrete gaps
that will let the same confusion survive if implemented as written. The native
Chrome evidence gate must remain a hard closeout blocker; the existing green
"Chromium" suite is mocked and does not satisfy it.

## What was independently verified

- **Runtime identity.** The live preview is the Spec 075 worktree on 8100, not
  the 084 branch. Confirmed by `lsof` cwd of PID 224 and `git worktree list`.
- **Served DOM, index page.** `#dg-open-folder`, a hidden `#dg-reconnect-folders`,
  a hidden `#dg-forget-folder`, and an **empty** `#dg-workspace-status`
  (`role="status" aria-live="polite"`). Groups render "Force demos" then
  "Bundled examples"; no opened-folder group when nothing is open.
- **Served DOM, viewer template.**
  [scripts/preview/viewer-unified.html](../../scripts/preview/viewer-unified.html#L79-L86)
  places `#dg-workspace-status` inside `.dg-workspace-open-row`, immediately
  followed by `<div class="build-status build-ok" id="build-status">Ready</div>`.
- **Silent open/cancel (source trace).** In `controller.openFolder`
  ([local-folder-workspace.ts](../../packages/layout-engine/src/preview-shell/local-folder-workspace.ts#L568-L595)):
  no status is set before/while awaiting the picker (no pending state), and the
  catch explicitly suppresses `AbortError`, so cancellation sets nothing.
- **Sidebar ordering is intact.**
  [builtin-host-runtime.ts](../../apps/preview/src/preview-host/builtin-host-runtime.ts#L207-L210)
  ranks `local-folder` → 0 and `bundled-examples` → 2. The f0f440f fix is
  present; the regression is **not** a reverted sort.
- **Existing automated "Chromium" test is mocked.**
  [scripts/verify-folder-workspace-chromium.mjs](../../scripts/verify-folder-workspace-chromium.mjs)
  runs `chromium.launch({ headless: true })` and assigns
  `window.showDirectoryPicker = async () => …` backed by OPFS handles. It proves
  wiring, not native picker presentation or real permission grant.
- **Test-file path defect.** The real controller test is
  [packages/layout-engine/tests/local-folder-workspace.test.ts](../../packages/layout-engine/tests/local-folder-workspace.test.ts);
  the path referenced by tasks and the plan does not exist.

Not verified (needs a human at a real Chrome + OS dialog): native chooser
invocation, cancellation UX in the real chooser, actual permission
revoke/re-grant, and post-JavaScript DOM after asynchronous restore.

## Findings ordered by user impact

### F1 — `Open folder…` is silent while pending and on cancellation
- **Severity**: blocker (for closeout of US1) / high user impact.
- **Evidence**: `openFolder` sets no status before/while `await picker(...)`
  and swallows `AbortError` with no status write
  ([local-folder-workspace.ts](../../packages/layout-engine/src/preview-shell/local-folder-workspace.ts#L568-L595)).
  A user who opens the chooser and cancels — or whose gesture is rejected as
  non-user-initiated and surfaces as an abort — sees the empty
  `#dg-workspace-status` remain empty.
- **Affected**: FR-001, US1 acceptance scenario 3, task T007, SC-001.
- **Remediation**: Set a `pending` state synchronously on activation before the
  picker call, and set an explicit `cancelled` final state on `AbortError`
  ("No folder was opened.") rather than treating abort as a no-op.
- **Blocks**: closeout; the fix is the MVP of US1.

### F2 — Unrelated green `Ready` sits where folder success should appear
- **Severity**: high.
- **Evidence**: In the viewer, `#dg-workspace-status` starts empty and
  `#build-status` renders a green "Ready" immediately below it
  ([viewer-unified.html](../../scripts/preview/viewer-unified.html#L82-L86)).
  This is exactly the reporter's "Open folder… followed only by an unrelated
  green Ready". Answering the question directly: **yes**, a user can and does
  mistake `Ready` for a successful folder operation — this is a product defect,
  not a training issue.
- **Affected**: FR-003, `contracts/workspace-operation-ui.md`, task T005, SC-002.
- **Remediation**: The plan/contract must explicitly require visual and semantic
  separation between the build/render status (`#build-status`) and the folder
  operation status. Either co-locate the folder status with its own clearly
  labelled affordance, suppress/relocate `Ready` adjacency, or give the folder
  region a distinct visual weight so an empty folder state is never read as
  green success. As written, T005 ("stable, accessible hooks only") does not
  address the adjacency that causes the confusion.
- **Blocks**: merge of the US4 "trust" story if left unaddressed.

### F3 — The "Active" state is set, then discarded by navigation
- **Severity**: high.
- **Evidence**: On success, `openDirectory` sets the "N diagrams loaded from
  <label>" status and then immediately calls `windowObject.location.assign(...)`
  ([local-folder-workspace.ts](../../packages/layout-engine/src/preview-shell/local-folder-workspace.ts#L369-L378)).
  Navigation discards that transient status; the destination page re-inits with
  an **empty** `#dg-workspace-status` (the server does not render an active-folder
  status into it). The contract's `Active` row ("`<count>` diagrams loaded from
  `<label>`") is therefore effectively never observable after a fresh open — the
  page looks idle even though a folder is registered and its group is present.
- **Affected**: FR-002, FR-003, SC-002, contract `Active` row, task T010.
- **Remediation**: The plan must state that the active-folder status is
  reconstructed on the destination page (server-rendered into the status region
  from the registry, or deterministically restored client-side), not merely set
  before `assign()`. T010 currently says "wait for/trigger the visible viewer
  navigation result" but does not require the landed page to render the active
  state.
- **Blocks**: closeout of US2/US4.

### F4 — Async restore can overwrite a newer user operation (unsequenced status)
- **Severity**: medium.
- **Evidence**: `setStatus` / `setReconnectVisibility` are global
  last-writer-wins DOM writes with no operation sequencing. `restoreFolders`
  runs asynchronously on load and writes status/visibility when it resolves
  ([local-folder-workspace.ts](../../packages/layout-engine/src/preview-shell/local-folder-workspace.ts#L590-L637)).
  If the user activates `Open folder…` (or cancels) while restore is in flight,
  the later-resolving writer wins non-deterministically. This is the
  "unobservable race" `research.md` names, but the plan's Design decision #1
  does not specify a precedence rule.
- **Affected**: FR-003, plan Design decision #1.
- **Remediation**: Introduce a monotonic operation/generation token in the typed
  owner; drop any status write whose generation is stale. Define explicit
  precedence: a user-initiated operation supersedes a background restore result.
- **Blocks**: implementation-design; should be resolved before US1/US3 coding.

### F5 — Restore forces a full `location.reload()`; no idempotency/loop guard
- **Severity**: medium.
- **Evidence**: `restoreFolders` calls `windowObject.location.reload()` whenever
  any restored registration reports `registered === true`
  ([local-folder-workspace.ts](../../packages/layout-engine/src/preview-shell/local-folder-workspace.ts#L629-L635)).
  A reload discards all transient status and, if a server restart makes
  registration report `registered` on every load, risks a reload flash or loop.
  Plan Design decision #4 promises "re-register after server restart and show
  its named Browse group" but does not address the reload's effect on visible
  state or loop protection.
- **Affected**: FR-004, SC-003, plan Design decision #4.
- **Remediation**: Specify an idempotent re-registration that reloads at most
  once per restart transition (guard flag / one-shot), and require the landed
  page to render the restored active state (see F3). Add an automated
  granted-restore contract that asserts a single navigation.
- **Blocks**: closeout of US3.

### F6 — Green automated suite does not exercise the reported native surface
- **Severity**: medium (evidence-integrity).
- **Evidence**: The only "Chromium" verification is headless with a mocked
  `showDirectoryPicker` and OPFS handles
  ([scripts/verify-folder-workspace-chromium.mjs](../../scripts/verify-folder-workspace-chromium.mjs)).
  No `specs/084-.../evidence/` directory exists yet. A green run here is
  necessary but **not** sufficient; it cannot prove the native picker opened or
  that permission was really revoked/re-granted.
- **Affected**: FR-009, FR-010, SC-005, tasks T001/T009/T018/T019.
- **Remediation**: Keep the native evidence gate a hard closeout blocker exactly
  as the plan states. The mocked suite must not be renamed or read as native
  proof; label it explicitly as wiring-only in its own header and in the
  evidence note. Do not downgrade this gate because the suite is green.
- **Blocks**: closeout.

### F7 — Tasks/plan reference a test file that does not exist
- **Severity**: low (correctness of the plan artifact).
- **Evidence**: Tasks T002, T008, T014 and the plan's project structure name
  `packages/layout-engine/src/preview-shell/local-folder-workspace.test.ts`. The
  actual file is
  [packages/layout-engine/tests/local-folder-workspace.test.ts](../../packages/layout-engine/tests/local-folder-workspace.test.ts).
- **Affected**: tasks T002/T008/T014, plan "Project Structure".
- **Remediation**: Correct the path in the plan and tasks before implementation
  to avoid a spurious new test file in the wrong location.
- **Blocks**: nothing hard; fix before starting to prevent misdirected edits.

### F8 — Contract has no explicit "Unsupported browser" final state
- **Severity**: low.
- **Evidence**: Current code hides `#dg-open-folder` when `showDirectoryPicker`
  is absent and sets a guidance status
  ([local-folder-workspace.ts](../../packages/layout-engine/src/preview-shell/local-folder-workspace.ts#L739-L746)).
  The contract's state table has Idle/Opening/Cancelled/Active/Permission
  needed/Failed but no `Unsupported` row, though FR-001 scenario 2 and T007
  cover it. Hiding the primary control while showing prose risks reading as a
  generic "Failed".
- **Affected**: `contracts/workspace-operation-ui.md`, FR-001, task T007.
- **Remediation**: Add an explicit `Unsupported` row with its own persistent
  text and defined control visibility so it is distinguishable from `Failed`.
- **Blocks**: nothing; tighten before implementation.

### F9 — Idle / origin-change copy is weaker than SC-004/FR-006 require
- **Severity**: low.
- **Evidence**: The contract's Idle persistent text ("Folders are opened for
  this local browser address.") is vaguer than FR-006 / SC-004, which require
  explaining that permission is scoped to the current local address **and**
  offering a direct open/recover path when the origin/port changes.
- **Affected**: FR-006, SC-004, contract Idle row.
- **Remediation**: Specify the exact idle and origin-change copy and the direct
  action offered on a new local address, so the requirement is testable.
- **Blocks**: nothing; clarify before implementation.

## Assessment of the Spec 084 plan

- **Single owner and lifecycle (Q7)**: The plan names one typed owner
  (`local-folder-workspace.ts`) and a state set (pending/cancelled/succeeded/
  recoverable/failed). Adequate in principle, but it omits (a) a sequencing rule
  so background restore cannot clobber a newer user operation (F4), (b)
  reconstruction of the active state after the post-open navigation (F3), and
  (c) an explicit unsupported state (F8). With those added, the lifecycle is
  sufficient.
- **Adjacent recovery discoverable without internals (Q8)**: The intent to keep
  recovery beside `Open folder…` and to proactively explain per-address scope is
  correct and does not require the user to know ports/origins/dev-tools. The
  current implementation only reveals reconnect after an async denied restore;
  the plan's proactive idle guidance is the right fix. Strengthen the copy (F9).
- **Security boundaries (Q9)**: Correct. Research and plan explicitly refuse to
  claim cross-origin restoration or server-side copies of browser folders, and
  rely on File System Access permission semantics. No overreach.
- **Gates prevent regression return (Q10)**: Partly. The plan requires
  per-outcome automated coverage plus native Chrome evidence — good. Missing:
  (a) an automated assertion that folder status is visually/semantically
  distinct from `#build-status` (F2), (b) a granted-restore test asserting a
  single navigation and a rendered active state (F3/F5), and (c) an explicit
  cancellation/abort assertion (F1). Add these acceptance criteria.
- **Architecture ratchet (Q11)**: Preserved. Behavior stays in the typed owner
  and preview-host; the viewer template is limited to structural hooks (T005
  says "do not add behavior there"); wiring goes through
  `browser-entry-preview-shell.ts`. No new central engine/document-kind
  branching and no behavior-heavy `scripts/preview/*.js` is proposed.

## Required changes before implementation

1. **Fix the plan/tasks test path (F7)** to
   `packages/layout-engine/tests/local-folder-workspace.test.ts`.
2. **Add a synchronous pending state and an explicit cancelled state (F1)** to
   the US1 tasks and the contract; abort must not be a no-op.
3. **Require post-navigation reconstruction of the Active state (F3)** in T010
   (server-rendered active status or deterministic client restore), not a
   transient pre-`assign()` write.
4. **Add an operation-sequencing/generation rule (F4)** to Design decision #1 so
   background restore cannot overwrite a newer user operation.
5. **Specify a bounded, idempotent restore reload (F5)** — at most one reload per
   restart transition — and an automated single-navigation assertion.
6. **Add a contract requirement to disambiguate folder status from
   `#build-status` "Ready" (F2)**, with an automated/visual acceptance check.
7. **Add an explicit Unsupported state (F8)** and **tighten idle/origin-change
   copy (F9)** in the contract.

## Validation and evidence gaps

- **Native Chrome journey unproven.** Open/cancel/success/restart/revoke/
  re-grant/save-reload were not observed in a real Chrome with OS dialogs.
  Retain FR-009 / SC-005 as a hard closeout blocker.
- **Existing automated proof is mocked (F6).** Headless + stubbed picker + OPFS.
  Necessary but not native evidence; do not treat green as sufficient.
- **Post-JavaScript DOM not inspected.** Findings on served DOM are from static
  HTTP responses and source trace; the asynchronous restore mutation was not
  observed live. F3/F4 should additionally be confirmed in a real browser during
  implementation.
- **No `evidence/` directory exists** for 084 yet; T001/T018 remain outstanding.

## Disposition

**Proceed to implementation with required plan changes.** The regression is
confirmed, the fix direction is sound, and the architecture ratchet is
preserved. Before merge, resolve F1–F3 (functional/observability blockers for
the P1 stories) and F4/F5 (recovery reliability). Before closeout, satisfy the
native Chrome evidence gate (F6) with genuine OS-dialog interaction — do not
substitute the mocked headless suite. F7–F9 are low-cost corrections that should
be made to the plan/tasks/contract before coding starts.

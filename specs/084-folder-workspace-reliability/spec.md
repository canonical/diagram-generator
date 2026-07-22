# Feature Specification: Folder Workspace Reliability

**Feature Branch**: `feat/084-folder-workspace-reliability`  
**Created**: 2026-07-22  
**Status**: Draft  
**Input**: User description: "Fix the preview folder workspace so Open folder always gives an observable outcome, opened folders reliably appear in the left sidebar, and restart/origin/permission recovery is clear and testable in Chrome."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open a diagram folder confidently (Priority: P1)

A person running the preview chooses **Open folder…** and receives an immediate,
observable outcome: a folder chooser opens, a supported-browser limitation is
explained, or a visible actionable error explains what prevented opening. The
action must never appear to do nothing.

**Why this priority**: Opening a folder is the first required action for local
editing. A silent failure makes the product appear broken and prevents all
downstream value.

**Independent Test**: In supported Chrome on localhost, activate **Open
folder…** and verify that the native chooser is invoked. Cancel it and verify
the preview remains usable with a clear status; choose a valid folder and
verify a visible successful transition.

**Acceptance Scenarios**:

1. **Given** a supported browser and a fresh preview, **When** the user selects
   **Open folder…**, **Then** the browser opens its native folder chooser without
   requiring the user to discover another control.
2. **Given** the chooser cannot be opened, **When** the user activates **Open
   folder…**, **Then** the preview displays a persistent, plain-language reason
   and the next action the user can take.
3. **Given** the user cancels the chooser, **When** control returns to the
   preview, **Then** the preview remains usable and clearly records that no
   folder was opened.

---

### User Story 2 - See an opened folder immediately (Priority: P1)

After choosing a valid folder, a person sees that folder by its chosen name in
the left Browse sidebar above bundled examples, and can open its diagrams.

**Why this priority**: The named section is the proof that the local workspace
is active. It must not depend on a hidden refresh, an inferred server state, or
knowledge of qualified URLs.

**Independent Test**: Open a folder with at least one root-level YAML diagram
and verify a named sidebar group appears above Bundled examples and one listed
diagram opens from that group.

**Acceptance Scenarios**:

1. **Given** a valid selected folder, **When** registration completes, **Then**
   the preview navigates or refreshes to a page containing that folder's named
   group above Bundled examples.
2. **Given** two opened folders with the same display name, **When** both finish
   opening, **Then** both are visibly distinguishable and their diagrams remain
   independently navigable.
3. **Given** a folder has no eligible diagrams or exceeds a supported limit,
   **When** opening is attempted, **Then** no partial sidebar group appears and
   the user sees the reason and a recovery action.

---

### User Story 3 - Recover after preview or permission changes (Priority: P2)

A person who previously opened a folder can understand and complete recovery
after restarting the preview, reloading a page, changing the local preview URL,
or losing browser permission. Recovery is visible where the person opened the
folder; it is never hidden behind an undiscoverable control.

**Why this priority**: Local folders are a long-lived workspace, while preview
servers and browser permissions are transient. A user must not need internal
knowledge of ports, origins, or process memory to restore their work.

**Independent Test**: Open a folder, restart the preview, then test both
granted and revoked permission paths. Verify automatic restoration when allowed
and a prominent recover action with clear outcome when permission is needed.

**Acceptance Scenarios**:

1. **Given** a previously opened folder with continuing permission, **When**
   the preview restarts or reloads, **Then** its named sidebar group returns
   automatically.
2. **Given** a previously opened folder needing permission, **When** the
   preview loads, **Then** an explicit recover action and explanation are
   visible next to the folder workflow, including why recovery is needed.
3. **Given** recovery succeeds, **When** the person grants permission, **Then**
   the named sidebar group returns without requiring a manual URL edit or
   browser reload.
4. **Given** the preview URL changes to a different local origin, **When** the
   person opens the folder workflow, **Then** the preview explains that browser
   folder permission is scoped to the current local address and offers a direct
   way to open or recover the folder there.

---

### User Story 4 - Trust the local preview state (Priority: P3)

A person can tell from the visible preview interface whether a folder operation
is pending, succeeded, was cancelled, or failed, without developer tools or a
Git/worktree investigation.

**Why this priority**: The current ambiguity makes normal local setup look like
a broken or wrong build. Clear operation state is essential for trust.

**Independent Test**: Exercise success, cancellation, unsupported-browser,
permission-needed, and registration-failure paths; each produces a visible,
specific final state in the folder workflow area.

**Acceptance Scenarios**:

1. **Given** any folder operation, **When** it completes or fails, **Then** its
   final status stays visible until superseded by the next folder operation.
2. **Given** recovery is unavailable, **When** the user reads the status, **Then**
   it states the limitation and a safe next step rather than implying success.

### Edge Cases

- The browser exposes folder selection but rejects the request because it is no
  longer treated as a user-initiated action.
- The server restarts after a browser has remembered a folder but before it has
  restored the group.
- A remembered handle belongs to a different local origin or has been revoked.
- A valid folder contains zero eligible root-level YAML diagrams, duplicate
  names, or exceeds ingest limits.
- The user cancels a native chooser or declines a permission request.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The preview MUST give every **Open folder…** activation an
  immediate, visible outcome; it MUST NOT silently ignore the action.
- **FR-002**: The preview MUST show a named, opened-folder group above bundled
  examples after a valid folder is registered.
- **FR-003**: The preview MUST preserve a visible final status for folder
  opening, cancellation, failure, and recovery until another folder action
  supersedes it.
- **FR-004**: The preview MUST automatically restore previously opened folders
  when permission is still available after reload or server restart.
- **FR-005**: The preview MUST present a prominent, adjacent recovery action
  whenever a remembered folder needs permission; it MUST explain the reason and
  expected result.
- **FR-006**: The preview MUST explain local-address permission boundaries when
  they prevent automatic restoration and provide a direct path to open the
  folder at the current address.
- **FR-007**: The preview MUST leave no partial workspace group after an invalid
  folder, cancellation, or failed registration.
- **FR-008**: The preview MUST retain existing local-folder safety limits,
  isolation, and save behavior while improving the operation experience.
- **FR-009**: The feature MUST be verified in a supported real Chrome session,
  including native chooser invocation, cancellation, successful opening,
  restart restoration, and permission re-grant.
- **FR-010**: The feature MUST have repeatable automated coverage for all
  outcomes that do not require a native browser or operating-system permission
  dialog.

### Key Entities

- **Folder workspace**: A user-selected local directory, its visible label,
  eligible diagram list, and current availability state.
- **Folder operation**: A user-visible attempt to open, restore, reconnect, or
  forget a folder, with pending and final outcome states.
- **Recovery state**: The reason a remembered workspace is not active and the
  action required to restore it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a supported Chrome session, 100% of ten consecutive **Open
  folder…** activations produce a native chooser or a visible actionable error
  within one second; none are silent.
- **SC-002**: After opening a valid folder, its named sidebar group is visible
  above Bundled examples before the user performs another manual navigation.
- **SC-003**: With continuing permission, an opened folder is restored after a
  preview restart in a single page load without user intervention.
- **SC-004**: With revoked permission, the page exposes a visible recovery
  action and explanatory status without requiring developer tools, source-code
  knowledge, or URL edits.
- **SC-005**: The full native Chrome journey—open, cancel, open successfully,
  restart, revoke/re-grant, and save/reload—is recorded as repo-owned evidence
  before closeout.
- **SC-006**: Automated tests cover success, cancellation, invalid-folder,
  registration-failure, granted-restore, denied-restore, and origin-change
  messaging outcomes.

## Assumptions

- The first release targets supported Chromium-based desktop browsers on a
  localhost preview.
- Browser folder permission can be revoked or scoped differently after a restart
  or local-address change; this is a normal recoverable condition, not user
  error.
- Spec 084 improves the in-app reliability and clarity of the existing folder
  workflow. Packaging a preview for people without a repository remains Spec
  083's separate responsibility.
- Existing limits, safe YAML behavior, conflict handling, and handle-authority
  save guarantees remain in scope as constraints but are not redesigned here.

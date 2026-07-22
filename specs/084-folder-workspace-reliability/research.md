# Research: Folder Workspace Reliability

## Decision: Do not reimplement the workspace registry

**Rationale**: Commit `f0f440f` already introduced the required local-folder
ranking and post-registration reload behavior. It remains an ancestor of both
current `main` and the prior Spec 075 worktree. The existing registry is the
correct owner of grouped Browse sections.

**Alternatives considered**:

- Re-sort sidebar markup in a legacy browser script — rejected because source
  ordering belongs to the typed preview host.
- Create a second browser-only list of folders — rejected because it would drift
  from the server render/save source registry.

## Decision: Make operation and recovery state explicit and durable

**Rationale**: The current action can leave no visible result, and reconnect is
initially hidden until an asynchronous handle restore finds a denied record.
This creates an unobservable race and makes the valid recovery path
undiscoverable.

**Alternatives considered**:

- Add more console logging — rejected because end users do not have developer
  tools open.
- Show only a toast — rejected because the state can be missed while a native
  chooser or asynchronous restore is in progress.

## Decision: Explain local-address scope proactively

**Rationale**: Browser-held folder access is scoped to the local browser address.
Changing from `127.0.0.1:8101` to `127.0.0.1:8100` can legitimately leave no
remembered handle on the new origin. The application cannot inspect another
origin's browser storage, so it must explain the rule and provide a direct Open
folder path rather than claim it can restore an unknown prior record.

**Alternatives considered**:

- Share browser handles across ports — rejected because browser origin isolation
  prevents it.
- Retain server-side copies of browser folders — rejected because it violates
  the existing local-handle authority model.

## Decision: Native Chrome evidence is mandatory

**Rationale**: Automated tests and bundle inspection can prove handler wiring,
but not native picker presentation or actual permission re-grant. The prior
Spec 075 closeout explicitly lacked this proof.

**Alternatives considered**:

- Accept a mocked File System Access test as closeout — rejected because it does
  not exercise the reported failure surface.

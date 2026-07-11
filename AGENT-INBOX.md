# Agent inbox — live state (single owner)

Session-start read for **what's happening right now**: current task, active
blockers, and last-known-green validation. This is the single owner of transient
state — no other file restates it. Keep it short; when a note is resolved or
superseded, **delete it** (git and the spec package hold the history). Do not park
session logs, spec inventories, resolved reviews, or validation transcripts here.

Other owners: invariants → [`AGENTS.md`](AGENTS.md) · operational how-to →
[`docs/agent-index.md`](docs/agent-index.md) · queue/order → [`TODO.md`](TODO.md) ·
spec catalog/status → [`docs/specs.md`](docs/specs.md) · human notes →
[`INBOX.md`](INBOX.md) · durable per-spec detail → `specs/<id>-<slug>/` ·
adversarial reviews → `docs/spec-reviews/`.

**Last-known-green (2026-07-11, spec 079 strict SlotNode slice):**
`apps/figma-plugin` **35/35**; Figma plugin build ok;
`packages/layout-engine` **1009/1009**; `apps/preview` **166/166**;
`check_no_new_python.mjs` ok; server health ok on `http://localhost:3846`.

---

## Current handoff (2026-07-10) — spec 079 implementation

**Branch:** `feat/079-figma-component-variant-import`

Spec 078 is merged to `main` and archived. Spec 079 is the follow-up for
mapping diagram boxes to user-authored native Figma component variants,
direction-aware component slots, and arbitrary selected YAML import.

Spec package:
[`specs/079-figma-component-variant-import/`](specs/079-figma-component-variant-import/).

Current slice implements selected-YAML import, component-mode import for the
visible `box` variants `Role=Child`, `Role=Parent`, and `Role=Section`, and
current-file copied icon matching by stable normalized names. The resolver
loads/searches all Figma pages, matching the user's file layout where imports
happen on `Page 1`, the box component lives on `Components`, and copied icons
live on `Brand icons`. It only accepts the real `COMPONENT_SET` named `box` as
the master and ignores `box`-named instances plus stale/deleted node handles.

After the user converted both content and icon placeholders to Figma slots, the
component path is strict SlotNode insertion: parent/section content is inserted
only into a real `SLOT` named `slot`, icons are inserted only into exactly one
real non-content `SLOT` on each mapped box instance, and the importer fails
instead of detaching or replacing ordinary live instance sublayers. Copied icon
assets may be nested in frames/folders as Figma components, icon-sized Figma
instances named with or without `.svg`, or `.svg`-named cloneable nodes.
Missing-icon errors include source counts/samples plus first failure reasons.
The fake Figma model now rejects structural mutation on ordinary instance
sublayers and recursively invalidates old handles on detach, so the prior
fake-green component/slot tests now exercise the real architectural constraint.
Validation/result indexing uses a slot-aware safe traversal so stale ordinary
instance sublayers are not walked after slot mutation.

The canonical frame YAML corpus has moved from the former scripts frame
directory to `diagrams/1.input`; preview, layout-engine tests, and the Figma dev
server now default to that path.

Open before spec closeout: choose a durable selected-YAML identity strategy for
same-basename files because browser file selection exposes only `file.name`.
Remote Brand-icons-library import by component key is still a separate
follow-up, not part of the current-file copied-icon slice.

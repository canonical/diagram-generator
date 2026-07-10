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

**Last-known-green (2026-07-10, spec 079 native-icon-instance-swap slice):**
`apps/figma-plugin` **33/33**; Figma plugin build ok;
`packages/layout-engine` **1009/1009**; `apps/preview` **166/166**;
`check_no_new_python.mjs` ok; restarted server health ok on
`http://localhost:3846`; `preview-smoke` slug payload ok from
`diagrams/1.input`.

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
current-file copied icon matching by stable normalized names. The resolver now
loads/searches all Figma pages, matching the user's file layout where imports
happen on `Page 1`, the box component lives on `Components`, and copied icons
live on `Brand icons`. It only accepts the real `COMPONENT_SET` named `box` as
the master and ignores `box`-named instances plus stale/deleted node handles.
Cleanup, prior imported-root replacement, imported-node scans, and result
bookkeeping also tolerate stale/deleted Figma node handles so `get_parent`
internals do not mask the actionable import error. Parent/Section slot
containers are generated and validated; runtime fallback detaches only if live
instance-slot mutation is rejected. Copied icon assets may be nested in
frames/folders as Figma components, icon-sized Figma instances named with or
without `.svg`, or `.svg`-named cloneable nodes. Copied icon instances are
applied through their accessible main component via native `swapComponent`
before falling back to clone/replacement, and missing-icon errors now include
source counts/samples plus first failure reasons.

The canonical frame YAML corpus has moved from the former scripts frame
directory to `diagrams/1.input`; preview, layout-engine tests, and the Figma dev
server now default to that path.

Open before spec closeout: choose a durable selected-YAML identity strategy for
same-basename files because browser file selection exposes only `file.name`.
Remote Brand-icons-library import by component key is still a separate
follow-up, not part of the current-file copied-icon slice.

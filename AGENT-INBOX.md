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

**Last-known-green (2026-07-13, spec 079 live-slot reparent indexing):**
`apps/figma-plugin` **41/41**; Figma plugin build ok;
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
component path is strict SlotNode insertion with no detach fallback. The current
implementation discovers slots on the master component, addresses live instance
slots by stable instance-sublayer id, and does not recursively walk live
instances to find slots. Title/helper text prefer component properties but fall
back to a direct stable-id `TEXT.characters` override when a property is absent;
this is non-structural and does not walk live instance children. Helper
visibility remains component-property controlled; an icon-less node clears its
real icon `SLOT` when no icon-visibility property exists. Copied icon assets may be nested in frames/folders as Figma
components, icon-sized Figma instances named with or without `.svg`, or
`.svg`-named cloneable nodes. Missing-icon errors include source counts/samples
plus first failure reasons. The fake Figma model now rejects `.children` reads
on ordinary instance sublayers by default, and validation/result indexing avoids
recursive instance descent by combining normal frame traversal with the current
build context for generated slot bodies.

The canonical frame YAML corpus has moved from the former scripts frame
directory to `diagrams/1.input`; preview, layout-engine tests, and the Figma dev
server now default to that path.

Open before spec closeout: choose a durable selected-YAML identity strategy for
same-basename files because browser file selection exposes only `file.name`.
Remote Brand-icons-library import by component key is still a separate
follow-up, not part of the current-file copied-icon slice.

**Blocker (2026-07-12, corrected 2026-07-13) — `missing imported frame` wave:**
adversarial review at
[`docs/spec-reviews/079-figma-component-variant-import.md`](docs/spec-reviews/079-figma-component-variant-import.md)
(sections "Opus Review – 2026-07-12" + "Correction – 2026-07-13"). Correction
retracts P0-3: `SlotNode` is a **freeform container** that supports `appendChild`
of arbitrary nodes with a configurable `maxChildren` (Figma docs verified), so
**Option B is reachable** — keep every box (containers included) a live instance
and put one generated body frame in its real `SLOT`. The current error is an
**indexing bug**: ids are recorded before reparent into the slot. Fix = append
into the `SLOT` first, then record ids, resolve via `getNodeByIdAsync`, assert
`slot.limitViolations.length === 0`; only ever mutate `type === 'SLOT'` nodes
(never ordinary instance sublayers); author real slots via `createSlot`; run
T002 live before more code.

Latest live Figma blockers: run T002 against the user's real file to prove
converted `SLOT` mutation is legal and non-invalidating; verify title/helper
master text targets or properties, helper visibility, and icon-slot clearing;
then
rerun live visual validation for no `get_children` errors, no hardcoded heights,
no visible default helper/icon placeholders, component icon provenance, and no
duplicated parent/section slot nesting. Connector design context for
`Role=Parent` showed helper/icon/slot-like props (`hasHelperText`,
`networkSvg2`, `slot`), but did not prove the plugin API property keys, and the
title still appeared as literal `Parent`.

Latest live error fixed in code/tests: `get_componentPropertyDefinitions` on a
variant component. The importer now reads component property definitions from
the `box` component set only; the fake rejects variant definition reads with the
same error shape.

Latest code fix: text properties are now preferred, not mandatory. If a variant
such as `Role=Section` lacks an exposed title property, the importer resolves
the master title `TEXT` id into the live instance and applies a targeted
`characters` override without detaching, recursion, or structural mutation.

Latest code fix: a default icon no longer requires an icon-visibility property.
For an icon-less YAML node, the importer resolves and clears the live real icon
`SLOT`; icon-bearing nodes still insert a copied Figma icon source into it.

Latest code fix: sizing/component readback records generated-body and mapped
child ids only after their final live-slot reparenting. It uses global/direct
readback when Figma permits it, but treats an opaque post-insert descendant as
mutation-time verified after sizing application plus empty `limitViolations`;
it never traverses an instance. The fake re-keys, hides, and invalidates this
subtree; content/icon mutations still fail on non-empty `limitViolations`.

Latest code fix (awaiting live visual confirmation): component-mode import now
records V3 effective geometry and reapplies only `FIXED` axes after Figma
auto-layout reparenting, which can otherwise replace fixed dimensions with
master/default geometry. Hug axes remain component/slot-content driven.

Latest code fix (awaiting live visual confirmation): V3 `kind: container`
layout wrappers now remain raw generated auto-layout frames. Only semantic
section/panel/leaf-like nodes create `box` instances, preventing placeholder
`Parent` instances from being nested for rows and other structural groups.

Next owner/action: Terra should execute
[`specs/079-figma-component-variant-import/terra-live-fix-runbook.md`](specs/079-figma-component-variant-import/terra-live-fix-runbook.md).
Further changes are blocked until the runbook identifies a failed live
assertion. Current evidence says the remaining cheapest work is T002
SlotNode/addressing proof and visibility/slot-contract verification, not another
importer architecture change.

# Review: spec 059 — Cross-document style source of truth

**Branch:** `feat/059-cross-document-style-source-of-truth`
**Claimed status:** In Progress.
**Real status:** **zero commits.** `git log main..feat/059` is empty. The branch
is "In Progress" in `docs/specs.md` but no work exists. This is the clearest case
of status drift in the cluster — it must read **Draft / Not started**.

Treat this file as the design brief, not a review of work.

## What 059 must actually do (INBOX #11, #14)

The user's request is explicit (INBOX line 53, 63, 41): **one** reusable styling
source so a single change updates the whole set, and stop per-document drift.

1. **One box-rhythm source of truth.** Today box rhythm tokens live in
   `tokens.ts` / `frame-classes.ts` but `service-handshake-sequence` (a `sequence`
   document) renders with different font sizes and a different text top-offset
   than v3 boxes. FR-001/FR-002: extract/centralize the box chrome metrics (font
   size, padding rhythm, heading-to-child spacing) into one contract consumed by
   *both* the frame renderer and the sequence renderer.
2. **Single font size, hardened.** INBOX #11: "only one font size is to be used";
   arrow/outside annotations currently render smaller. Encode a single authored
   body font size and assert no renderer path emits a different size for
   annotations. This is a testable invariant (scan rendered text nodes for a
   single font-size value).
3. **Heading bottom spacing +8px** (INBOX #14, line 63): section-box headings sit
   too close to the first child. Add 8px to the heading-bottom rhythm token — and
   because it's a shared token, this is exactly the "one change updates the set"
   proof.
4. **Engine identity on sequence lane** (FR-004): show engine identity where it
   helps. Coordinate with 060's output-header chrome; do not invent a second
   chrome path.

## Hard constraints from the spec (keep them)

- No one-off fixture literals to make `service-handshake-sequence` look right
  (Non-goal). The fix is the shared token contract, then both renderers consume
  it.
- No screenshot-only approval. Prove parity with a test that compares the resolved
  box-rhythm metrics between a v3 box and a sequence box (FR-003 / SC-001).

## Dependencies / sequencing

- Depends on 047 (render IR unification — shared renderer ownership) which is
  already Closeout Ready, so the shared-renderer seam exists.
- The "selection cannot change box type on sequence" half of INBOX #11 is a
  **058** concern (selection/inspector), not 059. Keep that boundary.
- "Box type change triggers relayout" (INBOX #12) is **057**, not 059.

## Closeout gate for this branch

README §3 plus:

- A style-parity test asserting v3 and sequence boxes resolve identical
  rhythm/font tokens from one source (SC-001).
- A single-font-size invariant test over rendered text.
- The +8px heading-bottom change reflected in the shared token and a test that
  catches regressions.
- Browser check on `service-handshake-sequence` recorded under `evidence/`.

**First action on this branch:** fix the status drift — set `docs/specs.md` and
the spec header to Draft/Not-started until real commits exist, so nobody else
assumes 059 is underway.

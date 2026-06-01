# GPT-5.5 Audit Context

> **HISTORICAL** – superseded by `specs/008-repo-coherence-rewrite/`. Do not
> treat this file as an active brief. The executable plan lives in that spec
> package.

Use this brief to audit the repository and rewrite it into a coherent,
manageable state.

## Mission

Audit the repo as a whole and then rewrite the code/docs/governance so
the system is coherent, layered, and hard to misuse.

The repo is drifting toward unmanageability because:

- nearby local patterns are often copied even when they contradict the
  governing plan
- multiple files act like "truth" at once
- legacy compatibility and fallback layers keep teaching the wrong
  architecture
- temporary migration structures are not being deleted fast enough

Your job is to restore coherence, not to preserve local precedent.

## Read Order

Read these first, in order:

1. `.github/copilot-instructions.md`
2. `DIAGRAM.md`
3. `docs/frame-classes.md`
4. `STATUS.md`
5. `TODO.md`
6. `ROADMAP.md`
7. `specs/007-style-foundation-unification/spec.md`
8. `specs/007-style-foundation-unification/plan.md`
9. `specs/007-style-foundation-unification/tasks.md`

Read these next if needed for evidence:

- `specs/005-autolayout-hardening/`
- `specs/006-arrow-routing-redesign/`
- `docs/architecture/adversarial-audit-2026-05-27.md`
- `scripts/preview/layout-bridge.js`
- `scripts/frame_loader.py`
- `scripts/layout_v3.py`
- `packages/layout-engine/src/resolve-styles.ts`
- `packages/layout-engine/src/frame-classes.contract.json`
- `packages/layout-engine/src/frame-classes.ts`

## Current Direction

The intended direction is clear and must win over local precedent:

- one interactive execution path: TypeScript local relayout only
- YAML is the authored source of truth
- no JSON sidecars as authority for editor or diagram state
- no localStorage in the interactive editing path
- one render contract: renderers consume resolved semantics, they do not
  invent or reinterpret styling
- HarfBuzz-backed text measurement is a hard requirement for the
  interactive path
- faux small caps are forbidden
- compatibility and fallback branches should be deleted aggressively
  once the migration gate is passed

Python may remain temporarily as batch/export oracle and parity
reference while the migration closes, but the long-term trajectory is
contraction, not expansion, of Python surface area.

## Non-Negotiable Invariants

These are the rules you should enforce everywhere:

1. No interactive server fallback.
2. No new sidecar authority in JSON or YAML.
3. No raw fill/border heuristics deciding style in renderers.
4. No raw `frame.fill === black` branches for text/icon contrast when a
   resolved style field should exist.
5. No white fill on leaf boxes in the semantic frame-class contract.
   Leaves should resolve to transparent fill so a leaf inside a panel
   does not create a white patch.
6. Panels are grey by class, not by scattered manual overrides.
7. Section heading fallback is bold sentence case at authored size, not
   fake small caps.
8. New tests should be semantic and minimal, not machine-expanded blobs
   that restate defaults at every node.
9. Do not add new status-like documents. Consolidate instead.
10. If two files disagree, reduce them to one authority or make one
    generated/derived.

## Known Drift / Current Problems

There are already concrete examples of incoherence:

- style semantics were supposed to be centralized, but some preview
  logic still derives text/icon contrast from raw fill instead of a
  resolved class snapshot
- annotation text expectations have drifted across docs/tests/code
- section typography expectations have drifted across docs/tests/code
- old JSON fixture patterns are being cargo-culted into new migration
  work even though the repo is trying to move toward YAML + semantic
  sources
- there are too many documents that partially restate architecture and
  therefore slowly diverge
- legacy Python modules still exist as drift bait even after TS
  migration work

Treat these as symptoms of governance failure, not isolated bugs.

## What To Audit

Audit the repo for:

- duplicated sources of truth
- code paths that still fork on legacy compatibility
- renderer branches that reinterpret style instead of consuming resolved
  style
- docs that disagree with code
- tests that certify the wrong contract
- migration leftovers that should be deleted
- places where nearby local precedent is stronger than the governing
  architecture
- Python code that still exists only because nobody has culled it yet

## Required Output

Produce:

1. A prioritized findings list with file references.
2. A "single authoritative architecture" rewrite plan.
3. A deletion plan: files, branches, helpers, tests, comments, and
   compatibility shims that should be removed.
4. A doc rewrite plan that reduces the number of truth-shaped files.
5. A code rewrite plan that makes the renderer consume one resolved
   style snapshot end-to-end.
6. A migration-end checklist that is short, hard, and enforceable.

If you make changes, prefer rewriting existing docs and code over adding
more explanation files.

## Rewrite Standard

Do not patch around contradictions. Resolve them structurally.

Prefer:

- deleting a branch over documenting it
- collapsing duplicate contracts into one shared contract
- encoding invariants in tests and code assertions
- reducing the number of files that can drift
- semantic YAML fixtures or inline test vectors over large JSON blobs

Avoid:

- adding more layered "summary" docs
- preserving compatibility just because it exists
- expanding Python surface area unless absolutely required for a
  temporary oracle role
- introducing test fixtures that look like serialized runtime snapshots

## Strong Guidance

Assume this is a sandbox project where speed and architectural clarity
matter more than backward compatibility.

Git is the rollback mechanism. Do not preserve broken branches for
comfort.

When you find a fork in logic that exists only for compatibility,
temporary fallback, legacy sidecars, or historical migration drift,
default to removing it unless a governing spec explicitly requires it to
remain.

## Success Condition

The repo should emerge from the rewrite with:

- one coherent migration story
- one style contract
- one authored source of truth
- one interactive execution path
- fewer documents acting as partial specs
- fewer legacy branches teaching the wrong pattern
- a codebase that future agents are much less likely to cargo-cult
  incorrectly

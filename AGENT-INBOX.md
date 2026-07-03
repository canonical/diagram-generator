# Agent inbox

Focused last-session -> next-session handoff only. Keep this short.

- **Human notes:** [`INBOX.md`](INBOX.md) — author -> agent.
- **Execution order & backlog:** [`TODO.md`](TODO.md) (read at session start).
- **Active-spec index:** [`docs/specs.md`](docs/specs.md).
- **Durable per-spec detail:** `specs/<id>-<slug>/`.

Do not park full session logs, spec inventories, or validation transcripts
here — those belong in the relevant `specs/<id>-<slug>/` package.

---

## Handoff — 2026-07-03

- **Branch / tree:** `feat/063-auto-style-by-nesting-depth`.
- **Queue status:** `TODO.md` now follows the Opus order faithfully after
  completed work was pruned: 063, then 061, then 064. Specs 071 and 062 are
  both `Closeout Ready` in `docs/specs.md`.
- **Completed prior slice:** spec 062 remains `Closeout Ready`. Opus's final
  review verdict was "no reopen"; the only actionable item was removing 062
  from the top of `TODO.md`, which is now done.
- **Current slice:** spec 063 is now an active package under
  `specs/063-auto-style-by-nesting-depth/`. It owns the sibling-promotion
  auto-style contract, the requirement that appearance-only style changes repaint
  on the spec 071 substrate, and the alignment of runtime code,
  `docs/frame-classes.md`, `DIAGRAM.md`, and
  `.github/skills/level-assignment/SKILL.md`.
- **Carry notes from 062 review:** non-blocking only. The nested-container hug
  fix has unit + persist coverage but no nested browser proof; the closeout
  prose slightly overstates a dedicated top-level branch; the nested fix is
  width-focused while height still relies on bottom-up remeasure semantics.

---

## Adversarial review request — spec 063 setup and subsequent work

Use this for the next adversarial review once spec 063 has implementation
commits beyond the package-draft/setup state.

```text
Adversarial review request.

Scope: review everything landed after the spec 063 setup baseline, with the
main goal of verifying that spec 063 faithfully implements the Opus-ordered
auto-style-by-nesting-depth contract and does not regress spec 062 or spec 071.

Repository: diagram-generator
Primary branch: feat/063-auto-style-by-nesting-depth

Baseline:
- Trust the final spec 062 review recorded before the current branch move.
- Start commit audit after: 10dd2f8 (`docs: advance queue to spec 063`)
- Include the 063 setup commits:
  - package draft / docs alignment on this branch
  - any later implementation commits on top of them

Required sources:
- TODO.md
- docs/specs.md
- AGENTS.md
- AGENT-INBOX.md
- specs/063-auto-style-by-nesting-depth/
- docs/frame-classes.md
- DIAGRAM.md
- .github/skills/level-assignment/SKILL.md
- any runtime/tests/evidence files touched by spec 063 work

Review goals:
1. Verify the spec 063 contract really matches the user's requested rule:
   0=child, 1=parent, 2=section, and siblings at the same depth are promoted to
   the highest level present.
2. Verify code, `docs/frame-classes.md`, `DIAGRAM.md`, and
   `.github/skills/level-assignment/SKILL.md` say the same thing. Any drift is
   a finding.
3. Verify appearance-only style changes repaint immediately without requiring a
   larger mutation and without switching engines.
4. Check that spec 063 does not silently grow into 061/064 or reopen 058's
   already-closed display-only boundary.
5. Check that no later change regresses spec 062's hug-resize closeout or spec
   071's repaint/determinism substrate.

Output format:
- Findings first, ordered by severity, with file/line references.
- Then open questions / assumptions.
- Then a short change summary only if needed.

Important:
- Do not re-review pre-`10dd2f8` history unless a later commit appears to
  regress it.
- Assume tests can be wrong. If the visible contract is not truly proven, mark
  that as a finding.
```

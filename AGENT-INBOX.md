# Agent Inbox

Machine-generated handoffs, long diagnostics, and cross-repo follow-up notes go here.

Do not use this file for user notes. User-authored async notes belong in `INBOX.md`.

The agent should triage anything durable from this file into `TODO.md`, `ROADMAP.md`, `STATUS.md`, `HISTORY.md`, or `docs/specs.md`, then empty this file back to this header template.

---

## 2026-05-23 — DESIGN-FOUNDRY PIVOT (single structural decision)

One structural decision affects this repo:

- **`brand-layout-ops` → `design-foundry`.** The workspace's operator-graph kernel has been renamed and reframed as the Houdini-in-spirit kernel monorepo for procedural graphic design. Architecture and tech-stack decisions live in `../design-foundry/PIVOT.md`. Read it before making structural decisions here.

**Correction (same day):** an earlier draft of this entry said `diagram-generator` would be absorbed into `canonical-spacing-spec`. That is NOT happening. `diagram-generator` stays a sibling repo. `canonical-spacing-spec` stays a sibling spec repo feeding multiple consumers. No merger.

What changes for `diagram-generator`:

- Continue iterating the TypeScript port in `packages/layout-engine/` (Figma-grade autolayout: HUG/FILL/FIXED, 9-point align, two-pass measure/place, parity-tested vs Python). It is the most advanced layout engine in the workspace and IS the single source of autolayout code.
- **Do NOT migrate it to design-foundry yet.** The design-foundry kernel (operator-kernel contract, render-IR) does not exist there yet. Migrating now means designing against a phantom.
- When (a) this refactor stabilizes AND (b) design-foundry's operator-kernel contract is ready, the layout-engine code physically relocates into `design-foundry/packages/operator-autolayout/` with a thin adapter. **No double work** — design-foundry will not build a parallel autolayout. There will only ever be one codebase.
- Keep public function signatures of `layout-engine` stable when convenient. They are the de-facto interface for the eventual port. If they shift, record it in `HISTORY.md`.
- The cross-workspace `.code-workspace` file's reference was updated from `../brand-layout-ops` to `../design-foundry`.
- Do NOT introduce new persisted format identifiers that embed the package or repo name. Use a short stable acronym (e.g. `dg`) for any new extension or `kind` discriminator, decoupled from package naming so future renames are cheap.


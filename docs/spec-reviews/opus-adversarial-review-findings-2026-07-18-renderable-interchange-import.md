# Opus adversarial review findings — renderable interchange import

**Date**: 2026-07-18
**Reviewer role**: Opus adversarial product/architecture review (no product code changed)
**Review request**: [`opus-adversarial-review-request-2026-07-18-renderable-interchange-import.md`](opus-adversarial-review-request-2026-07-18-renderable-interchange-import.md)
**Reviewed branch**: `feat/075-preview-folder-workspaces`
**Worktree**: `H:\WSL_dev_projects\diagram-generator-worktrees\075-preview-folder-workspaces`

## Branch verification

Confirmed as requested:

- current branch = `feat/075-preview-folder-workspaces` ✔
- HEAD = `70086eb` ("feat(075): complete folder workspace workflows") ✔
- merge-base with `main` = `1299bbb` ("docs: mark spec 028 worktree deletion ready"), which is current `main` HEAD ✔

No stale merge base or wrong branch. The importer code reviewed is the spec 028
implementation merged to `main` (`import-mermaid.ts`, `import-d2.ts`) as it exists
on this branch.

## Verdict

**IMPORT-BLOCKING — changes requested.**

The current interchange import is **unsafe** as a success state. It writes
structurally falsified diagrams to disk and reports them as "Imported with N
warning(s)". The screenshot is not cosmetic: it shows dropped edges (with both
endpoint nodes) and a dropped direction statement, persisted anyway. Two defects
are Critical. The remediation is a capability-based import contract with a shared
blocking structural-loss gate, authored as new spec **080**
(`specs/080-renderable-interchange-import/`).

Two of the review's hypotheses are **partially disproved and refined** (see F-M1
on RL/BT and the strict-mode nuance in F-C1) — the rest are confirmed with code
evidence.

---

## Findings (Critical → High → Medium → Low)

### Critical

#### F-C1 — Structural loss is surfaced as a non-blocking warning; lossy diagrams are written and reported as success

**Evidence.**
- [apps/preview/src/preview-host/frame-documents.ts](../../apps/preview/src/preview-host/frame-documents.ts#L419-L446) `importInterchangeForSlug` blocks a write **only** when `imported.errors.length > 0`, then writes the YAML and returns `warnings`. Dropped edges/nodes/directions are warnings, so they pass.
- [packages/layout-engine/src/preview-shell/app-save-client.ts](../../packages/layout-engine/src/preview-shell/app-save-client.ts#L479-L490) renders `Imported with ${warnings.length} warning(s)` and then `setStatus('Imported', 'ok')` and navigates to the imported slug — a success path even when topology was dropped.
- The preview route calls `importMermaid(source)` with **no** `{ strict: true }` (same file, import handler). So even the strict allowlist never runs on the preview path.

**Reproduction.** Open a folder workspace, import the boot/SPL Mermaid flowchart
in `import-errors.png`. Result: "Imported with 41 warning(s)", navigates to the
new diagram, and the persisted YAML is missing every inline-declared edge and the
`direction LR` statements.

**User impact.** The persisted diagram is *false* — edges and both of their
endpoint nodes are gone, and subgraph direction is lost — yet the tool says it
succeeded and navigates away. A field engineer trusts a wrong diagram. This is
the core defect the review flagged; warning count is not a fidelity measure.

**Remediation.** Spec 080 FR-002/FR-003: a shared gate classifies each diagnostic
`structural` / `visual` / `type` / `invalid`; `structural`/`invalid`/`type` block
the write in **all** modes (not just strict). The UI reports preserved /
downgraded / blocked and never shows success for a structurally lossy import.
(Refinement to the review's "strict allowlist permits structural loss"
hypothesis: strict mode *would* upgrade `IMPORT_MERMAID_UNSUPPORTED_EDGE` /
`_SYNTAX` / `_DIRECTION` to errors because they are **not** in
`STRICT_ACCEPTED_WARNING_CODES` — but the preview path never uses strict, so the
allowlist is moot on the path that matters. The fix must be strict-independent.)

#### F-C2 — Ordinary inline-declared edges are dropped wholesale (screenshot line 2)

**Evidence.** [packages/layout-engine/src/diagram-author/import-mermaid.ts](../../packages/layout-engine/src/diagram-author/import-mermaid.ts#L214-L245) `parseEdgeChain` begins with a bare id (`/^([A-Za-z_][\w-]*)/`) and then only accepts connectors at the start of the remainder. For `power_on["Power On"]:::highlight --> load_spl["Load SPL"]:::leaf`, the remainder after `power_on` starts with `[`, no connector matches, `parseEdgeChain` returns `false`, and the main loop falls to [import-mermaid.ts](../../packages/layout-engine/src/diagram-author/import-mermaid.ts#L343-L351) `IMPORT_MERMAID_UNSUPPORTED_EDGE` — dropping the edge **and** both nodes.

**Reproduction.** Import any flowchart that declares nodes inline on the edge — the dominant hand-authored style. Every such line is dropped.

**User impact.** Real hand-authored Mermaid (the exact style GitHub renders)
imports to a broken or empty topology. Both endpoints vanish because they were
never declared separately.

**Remediation.** Spec 080 FR-004 + FR-012: parse node declarations on either side
of an edge; a tokenizer/parser/IR replaces the per-line regex. Matrix rows
MF-16/17/18/19.

#### F-C3 — Subgraph-local `direction` is dropped (screenshot line 1)

**Evidence.** `direction LR` matches none of the header/subgraph/edge branches and
falls to [import-mermaid.ts](../../packages/layout-engine/src/diagram-author/import-mermaid.ts#L145-L172) `parseNode` → `parseNodeDeclaration` (id `direction`, body `LR`, no bracket pattern) → `IMPORT_MERMAID_UNSUPPORTED_SYNTAX` ("Mermaid statement is outside the supported flowchart subset: direction LR"), exactly the screenshot text. The direction is dropped.

**Reproduction.** Import a flowchart whose subgraph contains `direction LR`.

**User impact.** Nested layout orientation the author specified is silently lost;
the rendered diagram flows the wrong way inside the subgraph.

**Remediation.** Spec 080 FR-005: subgraph-local `direction LR/TB/TD` sets the
container frame `direction` (matrix MF-20). This is representable **today**
(`AuthorFrameNode.direction` exists and ELK layered supports nested compound
directions) — no model work needed for LR/TB.

### High

#### F-H1 — `RL` / `BT` are silently collapsed, losing reverse orientation

**Evidence.** [import-mermaid.ts](../../packages/layout-engine/src/diagram-author/import-mermaid.ts#L293-L299): `direction = token === 'LR' || token === 'RL' ? 'horizontal' : 'vertical'`. `RL`→horizontal, `BT`→vertical — reverse orientation dropped with no diagnostic at all.

**Root cause (refines the review hypothesis).** The canonical model genuinely
cannot express reverse today: [types.ts](../../packages/layout-engine/src/diagram-author/types.ts#L52-L60) `AuthorFrameNode.direction` and `FrameTemplate.direction` are `'vertical' | 'horizontal'` only. ELK layered *does* advertise `['TB','LR','BT','RL']` in [engine-capabilities.ts](../../packages/graph-layout-elk/src/engine-capabilities.ts#L6-L34), so the engine can render `LEFT`/`UP`, but there is no canonical field to carry it and no lowering path. So RL/BT is **M** (requires model work), not immediately fixable — the review's "determine what typed model work is required" is answered: a canonical reverse/orientation field plus lowering and ELK direction mapping.

**User impact.** Reverse-flow diagrams import upside-down/backwards with no warning.

**Remediation.** Spec 080 FR-009 + T030/T031/T032: add a canonical reverse
representation; **block** RL/BT (naming the dropped orientation) until it lands,
instead of silently collapsing.

#### F-H2 — CLI and preview import apply different loss gates

**Evidence.** CLI [scripts/import-mermaid.mjs](../../packages/layout-engine/scripts/import-mermaid.mjs#L26) passes `{ strict }` and exits non-zero on `result.errors`; the preview route passes no options ([app-save-client.ts](../../packages/layout-engine/src/preview-shell/app-save-client.ts#L440-L456) posts raw source; [frame-documents.ts](../../apps/preview/src/preview-host/frame-documents.ts#L426) calls `importMermaid(source)`). A `--strict` CLI run would block the screenshot file; the preview import silently writes it.

**User impact.** The safest gate is on the least-used path (CLI); the interactive
path users actually hit is the most permissive.

**Remediation.** Spec 080 FR-002: one shared, mode-independent structural gate for
all entry points (server route, local-folder, both CLIs).

#### F-H3 — `:::class` / `classDef` / `style` are always discarded even where a faithful frame field exists

**Evidence.** [import-mermaid.ts](../../packages/layout-engine/src/diagram-author/import-mermaid.ts#L48-L61) `stripMermaidClassSuffix` and [import-mermaid.ts](../../packages/layout-engine/src/diagram-author/import-mermaid.ts#L326-L334) always emit `IMPORT_MERMAID_UNSUPPORTED_STYLE` and drop. `AuthorFrameNode` has `fill` and `border` ([types.ts](../../packages/layout-engine/src/diagram-author/types.ts#L74-L75)) that could carry `classDef fill:#...`/`stroke:#...`.

**User impact.** Styling that *is* representable (fill/border colour) is thrown
away, degrading conversion quality unnecessarily.

**Remediation.** Spec 080 FR-006 + T053: map `fill`/`border` where faithful;
downgrade only the genuinely unmappable, with a named warning. (Note: `level` /
`variant` / `role` are structural encodings, **not** colour hints — do not
auto-map class names to them.)

### Medium

#### F-M1 — Multi-target and chained-inline links are deferred though they have a faithful path

**Evidence.** `a --> b & c` and `a[A] --> b[B] --> c[C]` are rejected by
`parseEdgeChain` (no `&` handling; inline decl breaks the connector match). Both
lower deterministically to ordinary directed arrows with no renderer work.

**User impact.** Common fan-out/chained authoring imports as dropped edges.

**Remediation.** Spec 080 FR-007 + MF-18/MF-26 (class **P**).

#### F-M2 — D2 import is exporter-round-trip-only with a different, non-blocking loss surface

**Evidence.** [import-d2.ts](../../packages/layout-engine/src/diagram-author/import-d2.ts#L138-L147) diagnoses `direction:` as an unsupported style/layout drop; chained `a -> b -> c` is deferred to `IMPORT_D2_MISSING_FRAME_REF` (a warning). D2 never runs the structural gate. The review's concern (a second arbitrary exporter-only importer) is confirmed.

**Remediation.** Spec 080 FR-014 + Phase 5: same capability matrix, same shared
gate, phased grammar (D2-06 chained, D2-07 direction, D2-08/09 fill/border).

#### F-M3 — Regex-per-line dispatch is the wrong scalability boundary

**Evidence.** `import-mermaid.ts` is a sequence of `raw.match(...)` branches. Inline
declarations, `&` fan-out, `;` separation, and chained-inline all require ad hoc
special cases that compose badly (F-C2 is a direct symptom). A tokenizer + small
statement parser producing a typed IR is the correct boundary.

**Remediation.** Spec 080 FR-012 + Phase 1 (tokenizer/parser/IR), with Phase gate
A before persistence integration.

#### F-M4 — No structured import summary; UI reports only a warning count

**Evidence.** [app-save-client.ts](../../packages/layout-engine/src/preview-shell/app-save-client.ts#L479-L490) surfaces a raw count and the first three messages. There is no notion of preserved vs downgraded vs blocked.

**Remediation.** Spec 080 FR-003 + T003/T040: structured summary; UI names what was
preserved, downgraded, and blocked.

### Low

#### F-L1 — Engine selection is implicit (always v3)

**Evidence.** [import-result.ts](../../packages/layout-engine/src/diagram-author/import-result.ts#L55-L63) hard-codes `source: { engine: 'v3' }`. A nested cross-container flowchart that needs ELK compounds is still lowered as v3.

**Remediation.** Spec 080 FR-010 + T033/T034: deterministic, capability-driven
selection, persisted in `meta.layout_engine`.

#### F-L2 — Bounded-input / malformed-input coverage is thin

**Evidence.** No explicit input-size/nesting bound; regex on arbitrary user input.
No adversarial-label (HTML) import test found.

**Remediation.** Spec 080 FR-013 + T060.

---

## Source-construct capability matrix

The completed matrix (all Mermaid flowchart constructs + audited D2 constructs,
each classified S / P / M / V / B / X with the renderable chain or prerequisite)
is authored at:

`specs/080-renderable-interchange-import/contracts/import-capability-matrix.md`

(in the `feat/080-renderable-interchange-import` worktree). It also contains the
engine-selection decision table and the diagnostic-category contract.

## Spec 028 requirement / task mismatches and hidden scope assumptions

- **All spec 028 tasks are checked `[x]`** ([specs/028-diagram-interchange-mermaid-d2/tasks.md](../../specs/028-diagram-interchange-mermaid-d2/tasks.md)), including T600 "surface structural validation as errors". But structural *loss* (dropped edges/directions) was never in the blocking set — only structural *invalidity* (duplicate id, missing id) was. The checked boxes are truthful for what they claim; the gap is that spec 028 never treated dropped topology as blocking. This is a scope gap, not a false checkbox.
- **Corpus selection hid ordinary usage.** Spec 028's own scope-revision note admits the first pass validated only exporter output; the FR-010 corpus (`mermaid-on-brand`) was chosen for lightly-styled files. The screenshot's inline-declaration style — the most common hand-authored form — is explicitly listed as a "Known import limitation" in [contracts/interchange-fidelity.md](../../specs/028-diagram-interchange-mermaid-d2/contracts/interchange-fidelity.md) rather than treated as a defect. That "reasonable limitation" framing is what this review overturns: a dropped edge is structural loss, not an acceptable limitation.
- **"Imported with warnings" as success** was baked into spec 028 FR-007's UX without a structural-loss concept. Spec 080 introduces that concept normatively.

## Spec 075 integration implications (no parser ownership assigned to 075)

- The folder-workspace paths (server-root and local-folder) both route through the **same** `/api/import/*` route and the same `importInterchangeForSlug` gate ([local-folder-workspace.ts](../../packages/layout-engine/src/preview-shell/local-folder-workspace.ts#L525-L560) intercepts `/api/import/mermaid|d2`, calls the server, then mirrors the written YAML). So the loss defect is uniform across both spec-075 sources — good, one fix covers both.
- Spec 075 is **not** widened. Parser breadth and the structural gate belong to spec 080. Spec 075's only relationship is that it is the surface where the defect became visible and it provides the persist→reload harness spec 080 must reuse for its regressions (FR-015).

## Validation performed / missing evidence

**Performed (read-only review):**
- Verified branch/HEAD/merge-base via git.
- Traced the full import→write flow: `app-save-client.ts` → `/api/import/*` → `importInterchangeForSlug` → `importMermaid`/`importD2` → `serializeDiagramYaml` → compile check → write, and the local-folder mirror.
- Confirmed the two screenshot failures by static trace to exact code branches (F-C2, F-C3).
- Confirmed the canonical model cannot express reverse direction (F-H1) and that ELK layered advertises all four directions.
- Confirmed id 080 is unused (no `specs/080`, no worktree dir, no branch).

**Not performed / missing (to be produced during implementation):**
- No runtime import of the exact screenshot file was executed (static trace only); the implementer should capture the actual persisted YAML diff as the T004 regression baseline.
- No performance measurement of large-corpus import (NFR-003 budget is TBD).
- No adversarial-label injection test exists yet (F-L2).

## New spec id / branch / worktree / paths

- **id**: 080 (verified unused; no substitution needed)
- **branch**: `feat/080-renderable-interchange-import` (created from `main` @ `1299bbb`)
- **worktree**: `H:\WSL_dev_projects\diagram-generator-worktrees\080-renderable-interchange-import`
- **package**: `specs/080-renderable-interchange-import/`
  - `spec.md`, `plan.md`, `tasks.md`, `validation.md`, `contracts/import-capability-matrix.md`
- **catalog/queue updates** (in the 080 branch): `docs/specs.md`, `TODO.md`, `AGENT-INBOX.md`

## Summary of the new spec / tasks

Spec 080 replaces the exporter-shaped import boundary with a capability contract:

- **Normative "renderable" and "structural loss"** definitions; structural loss
  **blocks before write** in all modes via a shared, data-driven diagnostic
  `category` (FR-002); visual downgrades stay non-blocking but named (FR-003).
- **Screenshot priorities first**: inline node declarations on edges (FR-004,
  MF-16–19) and subgraph-local direction (FR-005, MF-20) — both representable
  today.
- **Reverse direction (RL/BT)** identified as requiring a canonical-model task
  (FR-009); blocked, not silently collapsed, until it lands.
- **Deterministic engine selection** reading declared ELK capabilities, persisted
  as `meta.layout_engine` (FR-010).
- **Parser rewrite** to tokenizer + statement parser + typed IR (FR-012), with a
  **phase gate after parser/IR and before preview persistence integration**.
- **D2 parity phased** through the same matrix and gate (FR-014).
- **Persist → reload regressions** for server-root and local-folder (FR-015),
  bounded/malformed-input and security tests (FR-013), TypeScript-only ownership
  respecting the spec-046 ratchet.

Tasks are dependency-ordered and test-first (T000–T063) across 7 phases with two
explicit gates (A: parser/IR proven; B: persistence proven). No implementation
task is marked complete — this pass authored the plan only.

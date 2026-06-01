# Feature Specification: Repository coherence rewrite

**Feature Branch**: `feat/spec-kit-retrofit-core-engine-specs`

**Spec Package**: `008-repo-coherence-rewrite`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User request to turn `docs/gpt-5.5-audit-context.md` into a cold-start-friendly execution plan that GPT 5.4 can follow without drifting.

## Mission

Audit the repository as a whole, then rewrite code, docs, tests, and governance so the system has one coherent architecture:

- one authored source of truth: Frame YAML
- one interactive execution path: TypeScript local relayout
- one style contract: frame classes and resolved style semantics
- one render contract: renderers consume resolved semantics, they do not infer style
- one migration story: Python is batch/export oracle and parity reference while the TS migration closes
- fewer truth-shaped docs, fewer compatibility branches, fewer legacy migration leftovers

This spec is not a replacement for `docs/gpt-5.5-audit-context.md`; it is the executable Spec Kit plan for that brief.

## Operating Contract For GPT 5.4

The next agent MUST follow this contract before making broad changes:

1. Work from `tasks.md` in order. Do not skip phases.
2. Do not edit code before the Phase 1 evidence inventory is written into `plan.md`.
3. Do not add new status-like documents. Use this spec package for planning and update existing canonical docs for durable state.
4. Prefer deleting or collapsing drift over documenting it.
5. If two sources disagree, choose the authority defined in this spec and rewrite the weaker source.
6. Do not introduce or bless any new hand-authored sidecar authority in JSON or YAML. Generated artifacts are allowed only when their authored source is explicit elsewhere.
7. Stop and update this spec if a task would require a new persisted authority, a new interactive path, or a new renderer-side style interpretation.
8. Mark tasks complete only after the listed validation command or manual check passes.

## User Scenarios & Testing

### User Story 1 - Cold-start architecture is unambiguous (Priority: P1)

As a cold-start agent, I need the repo docs to identify one authority for each architectural concept so I do not copy nearby legacy patterns that contradict the intended design.

**Why this priority**: Governance drift is the root problem. Code cleanup will regress if docs keep teaching multiple truths.

**Independent Test**: Read `.github/copilot-instructions.md`, `DIAGRAM.md`, `docs/frame-classes.md`, `STATUS.md`, `TODO.md`, `ROADMAP.md`, and specs 005-008. For each concept in the authority map, exactly one source is normative and all other mentions point to it or summarize it without changing meaning. No JSON artifact is needed to discover the current frame-class contract.

**Acceptance Scenarios**:

1. **Given** a cold-start agent asks "where are visual rules defined", **When** it reads the docs, **Then** `DIAGRAM.md` is clearly the prose authority and frame-class contract files are clearly generated or machine-facing derivatives.
2. **Given** a cold-start agent asks "does the editor use Python fallback", **When** it reads current state docs and spec tasks, **Then** the answer is consistently no for interactive editing.
3. **Given** a cold-start agent asks "where is active migration work tracked", **When** it reads the repo, **Then** it lands on Spec Kit tasks and `TODO.md`, not loose audit files.

---

### User Story 2 - Renderers consume resolved style only (Priority: P1)

As an engine maintainer, I need every renderer and preview patching path to consume one resolved style snapshot so text, icon, fill, border, and typography behavior cannot fork by path.

**Why this priority**: Renderer-side interpretation is the main way style drift returns after cleanup.

**Independent Test**: Search for raw style heuristics in renderers and preview patchers. There are no branches that derive contrast, fill, border, or heading typography from raw `fill`, `border`, container shape, or legacy aliases when resolved style fields exist.

**Acceptance Scenarios**:

1. **Given** a highlighted frame, **When** SVG export and local preview render it, **Then** text and icon contrast come from resolved semantics, not `frame.fill == black` checks in the renderer.
2. **Given** a section frame, **When** layout measures and renderers emit heading text, **Then** both use the same fallback typography token without faux small caps.
3. **Given** a leaf inside a panel, **When** it renders, **Then** the leaf fill is transparent and never a white patch introduced by renderer defaults.

---

### User Story 3 - Interactive state has one source and one executor (Priority: P1)

As an editor maintainer, I need v3 interactive editing to use YAML-backed state and TypeScript local relayout only, with no server fallback, no JSON sidecar authority, and no `localStorage` shadow state.

**Why this priority**: Dual execution and hidden persistence make bugs nondeterministic and teach future agents the wrong architecture.

**Independent Test**: Inspect preview server, editor, layout bridge, persistence modules, and tests. No v3 edit action routes to server relayout, no v3 edit state is read from `localStorage`, and save/load writes canonical YAML fields in place.

**Acceptance Scenarios**:

1. **Given** the TS layout bridge is unavailable, **When** a v3 edit action runs, **Then** the editor reports a visible local error instead of falling back to Python.
2. **Given** a style or layout edit is saved, **When** the YAML file is inspected, **Then** canonical fields are replaced in place and no override-entry metadata is introduced.
3. **Given** a stale JSON override sidecar exists, **When** v3 editing loads, **Then** the sidecar is not treated as authoritative diagram state.

---

### User Story 4 - Legacy Python surface is intentionally bounded (Priority: P2)

As a maintainer, I need Python modules to remain only where they serve batch/export or parity-oracle roles, so migration leftovers stop attracting new work.

**Why this priority**: Python can remain useful, but only as a deliberate oracle surface. Unlabeled compatibility helpers create wrong local precedent.

**Independent Test**: Every retained Python module in the frame/layout/style path has one documented role: parser/defaults, batch/export renderer, parity reference, or test support. Unused compatibility helpers are deleted.

**Acceptance Scenarios**:

1. **Given** a Python helper exists only to mimic a removed interactive path, **When** the audit reaches it, **Then** it is deleted with tests updated.
2. **Given** a Python helper remains as oracle support, **When** a cold-start agent reads its surrounding docs/tests, **Then** it is not presented as an interactive implementation.

---

### User Story 5 - Docs are consolidated instead of multiplied (Priority: P2)

As a repo maintainer, I need fewer truth-shaped documents so architectural decisions do not diverge across `STATUS.md`, `TODO.md`, `ROADMAP.md`, historical architecture docs, and spec packages.

**Why this priority**: Documentation bloat is part of the failure mode. More summaries make future drift more likely.

**Independent Test**: The final documentation set has one role per file. Stale architecture reports are archived or deleted, and durable facts are moved into the correct canonical files.

**Acceptance Scenarios**:

1. **Given** a stale audit doc mentions a removed endpoint, **When** the doc rewrite phase runs, **Then** it is deleted or rewritten as historical context that cannot be mistaken for current guidance.
2. **Given** `STATUS.md` contains long completed-work history, **When** doc consolidation runs, **Then** current state remains concise and completed details move to `HISTORY.md` or are removed if already captured.

## Edge Cases

- Existing uncommitted user changes overlap with files in this plan.
- Generated `packages/layout-engine/dist/` files differ from `src/` after TS edits.
- `packages/layout-engine/src/frame-classes.contract.json` exists as an in-flight artifact and can be mistaken for authored truth unless explicitly removed or downgraded to generated output.
- Old force-editor style names still use `accent` for force mode while v3 forbids it.
- Historical docs intentionally describe past behavior but look like current guidance.
- Tests certify legacy behavior that should now be deleted.
- Browser verification fails because the dev server or HarfBuzz bundle is not built.

## Requirements

### Functional Requirements

- **FR-001**: The audit MUST produce a prioritized findings list with file references before code rewrites begin.
- **FR-002**: The rewrite MUST define a single authoritative architecture and encode it in `DIAGRAM.md`, `docs/frame-classes.md`, Spec Kit docs, and current-state docs without contradiction.
- **FR-002A**: The rewrite MUST NOT leave any hand-authored JSON file as the authoritative source for frame-class or editor semantics.
- **FR-003**: Renderers and preview patchers MUST consume resolved style semantics; they MUST NOT derive visual style from raw fill, border, container shape, or legacy aliases.
- **FR-004**: Leaf boxes MUST resolve to transparent fill in the semantic frame-class contract.
- **FR-005**: Panels MUST be grey by class resolution, not scattered manual overrides.
- **FR-006**: Section heading fallback MUST be bold sentence case at authored size; faux small caps are forbidden.
- **FR-007**: v3 interactive editing MUST use TypeScript local relayout only.
- **FR-008**: v3 interactive editing MUST NOT use JSON sidecars, sidecar YAML, or `localStorage` as authoritative state.
- **FR-009**: YAML persistence MUST replace canonical authored fields in place and MUST NOT introduce additive override metadata such as `overrideRole`.
- **FR-010**: Python retained after this work MUST be explicitly limited to batch/export, parsing/defaults, and parity-oracle roles.
- **FR-011**: The rewrite MUST remove or quarantine stale tests and fixtures that restate serialized runtime defaults instead of semantic contracts.
- **FR-012**: The final migration-end checklist MUST be short, hard, and enforceable.

### Key Entities

- **Frame YAML**: The canonical authored model for diagrams.
- **Frame class contract**: The semantic mapping for section, panel, leaf, annotation, highlight, and separator.
- **Resolved style snapshot**: The style state consumed by renderers after semantic resolution.
- **Interactive executor**: The TypeScript layout engine and browser layout bridge used by v3 editing.
- **Python oracle**: Python parser/layout/export surface retained only for batch and parity validation.
- **Canonical docs**: `.github/copilot-instructions.md`, `DIAGRAM.md`, `docs/frame-classes.md`, `STATUS.md`, `TODO.md`, `ROADMAP.md`, `HISTORY.md`, and Spec Kit packages.

## Success Criteria

- **SC-001**: A cold-start agent can identify one authority for visual rules, frame classes, interactive execution, persistence, and migration closure within 10 minutes.
- **SC-002**: Repo-wide search finds no renderer or preview-patcher raw fill/border heuristics for frame style where resolved style is available.
- **SC-003**: v3 edit actions have no server relayout fallback path.
- **SC-004**: v3 edit state has no JSON sidecar or `localStorage` authority.
- **SC-005**: Style parity tests pass across Python and TypeScript for representative semantic fixtures.
- **SC-006**: Current-state docs no longer contradict specs 007 and 008.
- **SC-007**: At least one representative v3 diagram is browser-verified after the final rewrite.
- **SC-008**: The final diff deletes more drift surface than it adds, excluding generated build output.

## Assumptions

- The current branch is intentionally dirty and may contain user or prior-agent changes; do not revert unrelated work.
- Spec 007 is mostly implemented but still needs final adversarial review closure.
- This spec should not absorb spec 006 arrow-routing implementation; only remove contradictions that affect the architecture story.
- Force-editor behavior may keep distinct force-mode terminology if it is clearly separated from v3 interactive architecture.

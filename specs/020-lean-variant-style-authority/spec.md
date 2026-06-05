# Feature Specification: Lean variant-only style authority and fixture pruning

**Feature Branch**: `feat/020-lean-variant-style-authority`

**Spec Package**: `020-lean-variant-style-authority`

**Created**: 2026-06-05

**Status**: Draft

**Input**: User request to simplify the engine aggressively around one clean rule: styles come from variants and resolved semantics only, while legacy diagrams are disposable test fixtures that may be deleted if they slow down the architecture.

## Mission

Rewrite the frame styling and fixture strategy so the repo becomes simpler, smaller, and more rigorous:

- one styling authority: variant plus resolved context
- one render contract: renderers consume resolved style only
- one measurement contract: text measurement consumes resolved typography only
- one authored model: semantic YAML, not style-rich text lines
- one fixture philosophy: diagrams are disposable tests, not preserved artifacts
- fewer diagrams, fewer exceptions, fewer compatibility branches

This spec is intentionally aggressive. It prioritizes architectural clarity over preserving historical diagram behavior.

## Operating Contract

The next agent implementing this spec MUST follow these rules:

1. Prefer deletion over compatibility shims.
2. Treat every existing diagram as expendable unless it covers a distinct invariant.
3. Do not preserve line-level style authority for frame-owned text.
4. Do not add a translation layer that keeps legacy style fields alive "for now".
5. If a diagram depends on legacy styling escape hatches, rewrite it semantically or delete it.
6. Keep the TypeScript path authoritative. Python may lag or be retired for this slice if it slows down the clean model.
7. Do not widen the canonical fixture corpus while implementing this spec.
8. Mark tasks complete only after deletion, simplification, and validation have all landed together.

## User Scenarios & Testing

### User Story 1 - Variant-derived resolved style is the only styling authority (Priority: P1)

As an engine maintainer, I need every frame-owned visual style to come from variant-derived resolved semantics so the renderer never has to reconcile two styling systems.

**Why this priority**: This is the root simplification. If line-level styling remains authoritative anywhere, the architecture stays hybrid and drift-prone.

**Independent Test**: Search the TS-owned layout and render path. Frame-owned text rendering and measurement do not consult `Line.fill`, `Line.weight`, `Line.smallCaps`, `Line.letterSpacing`, or `Line.fontFamily` as authoritative style sources.

**Acceptance Scenarios**:

1. **Given** a frame with effective variant `highlight`, **When** it renders, **Then** box fill is black and frame-owned text/icons are white because resolved style says so, not because a line object happens to carry `fill: white`.
2. **Given** a frame with effective variant `section`, **When** heading text renders and measures, **Then** heading weight and small-caps come from resolved heading typography, not raw line metadata.
3. **Given** a body label line still carries stale visual fields in memory, **When** the renderer runs, **Then** those stale fields do not change the output.

---

### User Story 2 - YAML is semantic, not style-rich (Priority: P1)

As a diagram author, I need YAML to describe structure and semantic intent, not ad hoc visual overrides, so the model stays small and teachable.

**Why this priority**: A clean architecture starts at the authored layer. If YAML keeps line-level color and typography escape hatches, the simplification will collapse under migration pressure.

**Independent Test**: Search the kept frame YAML corpus. Frame-owned text no longer uses legacy style fields such as per-frame or per-line text fill, weight, small-caps, letter spacing, or font-family overrides to express normal frame semantics.

**Acceptance Scenarios**:

1. **Given** a note inside a highlighted section, **When** its text needs white contrast, **Then** the YAML expresses that through semantic frame inputs and resolved contrast rules, not `fill: white` on the note.
2. **Given** a section heading, **When** it needs strong/small-caps styling, **Then** YAML does not carry heading typography overrides.
3. **Given** a new diagram author reads a frame YAML, **When** they inspect styling inputs, **Then** they see semantic choices like level, variant, role, and layout fields rather than styling trivia.

---

### User Story 3 - The diagram corpus is a minimal invariant pack (Priority: P1)

As a maintainer, I need a very small corpus of canonical diagrams so fixture maintenance does not dominate engine design.

**Why this priority**: The existing 31-diagram corpus creates false preservation pressure. Most diagrams are redundant once the engine has proper semantic tests.

**Independent Test**: The kept diagram corpus is reduced to a deliberately small set where each remaining slug covers a distinct invariant class and redundant diagrams are gone.

**Acceptance Scenarios**:

1. **Given** two diagrams cover the same heading/body synthesis invariant, **When** pruning runs, **Then** only one survives.
2. **Given** a diagram exists only as legacy visual baggage, **When** pruning runs, **Then** it is deleted rather than carried forward.
3. **Given** a regression needs coverage, **When** a test is added, **Then** the default choice is an inline semantic fixture, not another corpus diagram.

---

### User Story 4 - Tests prove semantics, not historical noise (Priority: P2)

As an engine maintainer, I need tests to certify the simplified model directly so they stop locking in stale implementation details.

**Why this priority**: A lean architecture needs lean tests. Large golden corpora and drift-heavy fixtures make simplification slower and noisier.

**Independent Test**: Most style, layout, and render invariants are covered by compact inline fixtures or tiny canonical fixture files. Golden SVG coverage is intentionally narrow.

**Acceptance Scenarios**:

1. **Given** a style regression in heading contrast, **When** the test suite runs, **Then** a focused semantic test catches it without depending on a broad corpus.
2. **Given** a golden SVG changes, **When** the diff is reviewed, **Then** it is one of a small canonical set with clear invariant coverage.

## Non-goals

- Preserving historical diagram outputs that depend on legacy style escape hatches
- Maintaining backward compatibility for line-level text styling on frame-owned content
- Supporting arbitrary rich text styling inside normal frame labels during this simplification slice
- Keeping the existing corpus size for comfort or nostalgia
- Building a migration layer whose main purpose is to avoid deleting old diagrams

## Edge Cases

- Highlight contrast currently depends on parent context, not a flat variant token alone.
- Section headings and body labels need distinct resolved typography even when they belong to one frame.
- Icon contrast must simplify with text contrast rather than becoming a separate heuristic path.
- Arrow labels and free annotations may need an explicit semantic role if they remain outside the main frame-owned text model.
- Some kept fixture diagrams may still be useful for manual preview QA even after they leave the automated corpus.
- Python parity tests may fail during the rewrite and should not block the TS-owned architecture cleanup.

## Requirements

### Functional Requirements

- **FR-001**: Variant plus resolved context MUST be the only styling authority for frame-owned visual output.
- **FR-002**: Frame-owned text measurement MUST consume resolved typography, not raw line typography fields.
- **FR-003**: Renderers and preview patchers MUST consume resolved style snapshots only for frame-owned text, icons, fills, and borders.
- **FR-004**: `Line` / `LineSpec` visual fields for frame-owned text MUST be removed as authoritative inputs or reduced to non-authoritative transport fields during migration.
- **FR-005**: YAML kept after this rewrite MUST express styling semantically; legacy text styling escape hatches for frame-owned content MUST be removed, rejected, or ignored with explicit validation.
- **FR-006**: The fixture corpus under `scripts/diagrams/frames/` MUST be pruned to a minimal invariant-covering set. The target size is **no more than 12 canonical slugs** unless a missing invariant justifies another fixture.
- **FR-007**: Golden SVG coverage MUST be reduced to a narrow canonical subset. The target size is **no more than 6 golden slugs**.
- **FR-008**: Redundant or legacy diagrams MAY be deleted without migration if they do not cover a distinct invariant.
- **FR-009**: No new compatibility branches, aliases, or fallback heuristics may be added to preserve legacy diagram styling.
- **FR-010**: The TypeScript path MUST remain the only authoritative interactive implementation during this rewrite.
- **FR-011**: Tests for style and heading behavior MUST prefer inline semantic fixtures over corpus files whenever practical.
- **FR-012**: The final docs MUST state clearly that diagrams are treated as disposable test fixtures unless explicitly promoted for another purpose.

### Key Entities

- **Semantic YAML**: Authored frame input containing structure, layout, and semantic styling inputs only.
- **Variant**: The authored styling class or state input (for example: section, panel, leaf, annotation, highlight) before contextual resolution.
- **Resolved style snapshot**: The fully computed box, text, icon, and typography state consumed by layout and rendering.
- **Frame-owned text**: Heading and body text that belongs to a frame as part of its core component rendering.
- **Canonical fixture pack**: The deliberately small set of diagrams retained to cover engine invariants.
- **Inline semantic fixture**: A test-local frame tree or YAML snippet used to cover one invariant without adding corpus debt.

## Success Criteria

- **SC-001**: Repo-wide search shows no frame-owned render path where raw line visual fields override resolved style.
- **SC-002**: Repo-wide search of the kept YAML corpus shows no legacy frame-owned text color or typography escape hatches.
- **SC-003**: The automated diagram corpus is reduced from 31 diagrams to a minimal canonical pack of 12 or fewer slugs.
- **SC-004**: Golden SVG coverage is reduced to 6 or fewer canonical slugs.
- **SC-005**: Focused semantic tests replace deleted corpus coverage for heading/body synthesis, variant contrast, section/panel/leaf styling, icon contrast, wrap behavior, and arrow basics.
- **SC-006**: A cold-start agent can explain the styling model in one sentence: "variant and context resolve style; layout and render consume resolved style only." 
- **SC-007**: The final diff deletes more fixture and compatibility surface than it adds, excluding generated build output.

## Assumptions

- Existing diagrams are disposable test assets, not preservation-grade deliverables.
- Breaking old diagrams is acceptable if it enables a cleaner long-term architecture.
- A small surviving fixture pack is enough to protect the engine if semantic tests are strong.
- The current repo direction remains TS-first; Python should not dictate the model shape.
- If a future user needs rich text styling, it should return as an explicit, separately designed feature rather than surviving accidentally through legacy fields.
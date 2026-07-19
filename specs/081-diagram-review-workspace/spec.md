# Feature Specification: Diagram Review Workspace and Feedback Loop

**Feature Branch**: `feat/081-diagram-review-workspace`  
**Created**: 2026-07-19  
**Status**: Draft  
**Input**: Promote the existing FigJam corpus-import, comment collection, and
comment-to-spec tools into an official, reusable rung of the canonical diagram
workflow.

## Scope and ownership

This package freezes the product contract in `diagram-generator` because this
repo already owns the canonical YAML, preview, export, and Figma handoff
surfaces. It does **not** make the generator the permanent home of the whole
review product. The intended distributable is a neutral package/repository,
working title `canonical-diagram-review`, with adapters for the generator,
brand-aligned Mermaid, Spec Kit, registries, and issue trackers.

The mature Mermaid/FigJam implementation is the reference implementation. The
planning-repo plugin is a corpus adapter. Extraction must preserve their proven
behaviour before adding features.

## User Scenarios & Testing

### User Story 1 - Prepare and refresh a review set (Priority: P1)

A visual-system maintainer selects a folder, manifest, or registry query
containing many generated diagrams and creates one navigable FigJam review
workspace. Re-running the import updates managed diagram instances in place so
existing comments and stable diagram identities survive.

**Why this priority**: A scalable review surface is the foundation for both
maintainer audits and low-effort user feedback.

**Independent Test**: Prepare at least 100 variants, import them, comment on
three, change one source asset, refresh, and prove the three comments remain
attached while only the changed managed node is replaced.

**Acceptance Scenarios**:

1. **Given** a valid review-set manifest, **When** a maintainer imports it,
   **Then** every entry appears once with a stable identity, readable source
   context, and a visible import summary.
2. **Given** a previously imported review set with comments, **When** source
   hashes change and the set is refreshed, **Then** managed assets update in
   place and existing comments remain available.
3. **Given** duplicate or invalid identities, **When** preparation runs,
   **Then** import is blocked with actionable diagnostics before the board is
   mutated.

---

### User Story 2 - Leave effortless diagram feedback (Priority: P1)

An ordinary diagram user or visual designer surveys the board and leaves normal
FigJam comments on the affected diagram or managed annotation node without
learning a custom bug-report format.

**Why this priority**: The review rung succeeds only if reporting a problem is
easier than opening and formatting an issue manually.

**Independent Test**: A reviewer with no repository access can identify a
diagram, leave a comment, and have that comment collected with enough context
to route it.

**Acceptance Scenarios**:

1. **Given** an imported diagram, **When** a reviewer comments on it, **Then**
   collection resolves the comment to the stable diagram and variant identity.
2. **Given** a board-level or ambiguous comment, **When** collection runs,
   **Then** it is retained as unresolved rather than silently assigned.
3. **Given** repeated collection with no board changes, **When** collection
   runs again, **Then** no duplicate finding is emitted.

---

### User Story 3 - Turn comments into portable findings and specs (Priority: P1)

An operator collects comments into a neutral findings file, triages or closes
them, and routes selected findings through adapters to Spec Kit task drafts,
Jira issue drafts, or repository-local bug reports.

**Why this priority**: Portable, auditable findings keep FigJam from becoming a
second untracked backlog.

**Independent Test**: Collect a mixed set of resolved, unresolved, duplicate,
and already-ingested comments twice; produce identical findings on the second
run and generate a deterministic Spec Kit draft from selected findings.

**Acceptance Scenarios**:

1. **Given** new comments, **When** collection runs, **Then** it writes a
   versioned neutral findings document with source, target, timestamps, author,
   status, and ingestion identity.
2. **Given** a selected finding, **When** the Spec Kit adapter runs, **Then** it
   generates or updates a deterministic draft without overwriting authored
   specification text.
3. **Given** a finding already routed to an issue or spec, **When** collection
   is repeated, **Then** the prior external reference is preserved and no
   duplicate target is created.

---

### User Story 4 - Connect review outcomes to the diagram registry (Priority: P2)

A maintainer can see the latest review state from the diagram registry,
including the review set, FigJam URL, source hash reviewed, finding counts,
deliverable links, and whether the review has become stale.

**Why this priority**: The registry is the cross-tool index joining canonical
YAML, Figma finishing, SVG/PNG deliverables, and review evidence.

**Independent Test**: Publish a review outcome, change the canonical source
hash, and prove the registry marks the prior review stale without losing its
history.

**Acceptance Scenarios**:

1. **Given** a completed collection, **When** the registry adapter publishes its
   summary, **Then** the pattern/artifact record links to the review set and
   counts findings by status and severity.
2. **Given** a reviewed source hash that no longer matches the current
   artifact, **When** the registry is queried, **Then** the review state is
   visibly stale.
3. **Given** a designer-finished Figma artifact and SVG/PNG deliverables,
   **When** review evidence is published, **Then** all artifacts remain linked
   to one lineage rather than being registered as unrelated diagrams.

---

### User Story 5 - Intake an unknown screenshot (Priority: P3)

A maintainer can place an unregistered diagram image into an intake lane and
create a provisional finding without pretending its source identity is known.

**Why this priority**: Screenshot intake is useful, but it must not delay the
proven manifest-driven review loop.

**Independent Test**: Import an image with no source metadata, collect a
comment, and retain it as a provisional record until a maintainer links or
creates a registry identity.

### Edge Cases

- The same diagram identity appears twice with different source paths.
- A source changes while a long-running import or collection is in progress.
- A comment targets an unmanaged frame, section heading, deleted node, or
  private content unavailable to the collector.
- A reviewer edits, resolves, reopens, or deletes a comment after it was routed.
- A managed node was manually moved or annotated before refresh.
- A board contains records created by an older plugin/schema version.
- One finding applies to multiple variants or multiple repositories.
- Network, Figma authentication, Jira, or registry publication is unavailable.
- A source artifact is sensitive and must not be copied into a hosted service.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST accept a versioned `ReviewSet` manifest produced
  from a folder, corpus manifest, or registry query.
- **FR-002**: Every review entry and variant MUST have a stable, opaque identity
  independent of display labels, paths, and board node IDs.
- **FR-003**: Preparation MUST reject duplicate identities, missing required
  artifacts, unsupported schema versions, and unsafe paths before import.
- **FR-004**: Import MUST create or update only managed board nodes and MUST
  preserve reviewer comments and unmanaged annotations during refresh.
- **FR-005**: Managed nodes MUST store sufficient plugin data to recover review
  set, entry, variant, source hash, and adapter identity.
- **FR-006**: Collection MUST produce a versioned, tool-neutral
  `ReviewFindings` document rather than writing directly to a single issue
  tracker or repository.
- **FR-007**: Collection MUST be idempotent across unchanged comments and MUST
  preserve the identity of previously ingested or routed findings.
- **FR-008**: Ambiguous and board-level comments MUST be retained with an
  explicit unresolved target state.
- **FR-009**: Adapters MUST support deterministic Spec Kit draft generation;
  Jira, registry, and repository issue adapters MUST remain optional.
- **FR-010**: Adapters MUST use guarded create/update behaviour and MUST NOT
  silently overwrite human-authored specification or issue content.
- **FR-011**: Review publication MUST record the reviewed source hash, FigJam
  URL, output deliverables, counts by disposition, and collection timestamp.
- **FR-012**: Registry integration MUST mark a review stale when the current
  source hash differs from the reviewed hash.
- **FR-013**: The contract MUST represent canonical YAML, Figma component
  instances, SVG, and PNG as related artifacts in one lineage.
- **FR-014**: The plugin MUST show a dry-run or change summary before a bulk
  mutation and a result summary afterwards.
- **FR-015**: Tokens and credentials MUST NOT appear in manifests, findings,
  generated specs, logs, fixtures, or committed plugin bundles.
- **FR-016**: The first extraction MUST match the reference implementation's
  validated corpus scale and comment-ingestion behaviour before feature
  expansion.
- **FR-017**: Product implementation MUST be TypeScript/Node; no new product
  logic may be added to `scripts/preview/`.
- **FR-018**: The distributable MUST document install, prepare, import, refresh,
  collect, triage, and adapter workflows for both maintainers and reviewers.

### Key Entities

- **ReviewSet**: Versioned declaration of one review campaign and its entries.
- **ReviewEntry**: Stable logical diagram/pattern identity and source context.
- **ReviewVariant**: A render or route-specific artifact belonging to an entry.
- **ReviewFinding**: Portable normalized record derived from a review comment.
- **ReviewDisposition**: Triage state, severity, resolution, and external links.
- **ReviewAdapter**: Guarded transformation or publication boundary.
- **RegistryReviewSummary**: Latest review evidence and staleness projection.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A maintainer can prepare and import at least 100 diagram variants
  with zero duplicate managed identities.
- **SC-002**: Refreshing a changed review set preserves all comments on managed
  diagrams and does not alter unmanaged board content.
- **SC-003**: Two collections of an unchanged board produce zero duplicate
  findings and byte-equivalent normalized output apart from an explicitly
  excluded run timestamp.
- **SC-004**: At least 95% of comments attached to managed diagram nodes resolve
  automatically to an entry and variant; the remainder are retained for manual
  targeting.
- **SC-005**: A selected finding can become a deterministic Spec Kit draft in
  one command without overwriting authored content.
- **SC-006**: Registry consumers can trace one reviewed diagram from canonical
  YAML through Figma finishing to SVG/PNG deliverables and see when the review
  evidence is stale.
- **SC-007**: The reusable package can be adopted by both the generator and
  Mermaid routes without copying route-specific plugin logic.
- **SC-008**: A first-time reviewer can leave actionable feedback using normal
  FigJam comments without repository access or special syntax.

## Assumptions

- FigJam remains the initial collaborative review surface because working
  plugins and reviewer behaviour already exist.
- Figma REST/API limitations may require plugin-mediated comment association;
  the neutral findings contract must not depend on Figma node IDs alone.
- The initial extraction may live on this feature branch while neutral-repo
  ownership, publishing, and package names are agreed.
- Unknown-screenshot intake follows the manifest-driven P1 loop and cannot
  weaken identity or idempotency rules.

## Out of Scope

- Replacing Jira, Coda, Spec Kit, or the diagram registry.
- Building a general-purpose Figma design editor.
- Automatic visual-quality scoring or AI-generated fixes.
- Shipping ELK-to-Figma component import changes; spec 079 and the visual
  designer handoff own that separate product surface.
- Treating every FigJam comment as an issue without human triage.

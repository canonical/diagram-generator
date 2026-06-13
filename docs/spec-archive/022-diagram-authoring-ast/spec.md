# Feature Specification: Diagram authoring compiler, additive YAML sugar, and export adapters

**Feature Branch**: `feat/022-diagram-authoring-ast`

**Spec Package**: `022-diagram-authoring-ast`

**Created**: 2026-06-05

**Status**: In progress

**Input**: Improve the existing frame YAML authoring format with concise arrow syntax, reusable frame templates, and strict validation while preserving the current `root` frame tree and `arrows` list as the canonical source of truth; compile to a strict internal AST; render via the existing TS engine; add Mermaid/D2 as export adapters only.

## Mission

Refactor diagram authoring into a **parser → normalizer → validator → AST → renderer/exporters** pipeline without introducing a competing schema. Mermaid and D2 are **export targets**, never canonical syntax.

```text
frame YAML (current canonical shape)
  + additive authoring sugar
    - arrow shorthand inside `arrows`
    - `defaults` + `use` for repeated frame props
  → parse + normalize sugar
  → expand templates/defaults
  → validate references + invariants
  → strict DiagramDocument AST (frame-tree-native)
  → lower → FrameDiagram (existing layout runtime)
  → custom SVG renderer (existing)
  → optional Mermaid exporter (new)
  → optional D2 exporter (new)
```

**Non-goals for this spec**

- Replacing YAML with Mermaid or D2 as source of truth
- Replacing canonical `root` / `arrows` with a new top-level `layout` / `edges` schema
- Introducing a separate `node:` / `group:` grammar that duplicates the frame tree
- Rewriting the preview shell (`scripts/preview/*.js`) — see Preview shell policy in `.github/copilot-instructions.md`
- Big-bang migration of all corpus diagrams in one PR
- Changing `docs/diagram-schema.json` ontology schema (separate legacy/agent schema; document relationship only)

## Operating contract for implementers

1. **TypeScript owns the compiler** — new code lands in `packages/layout-engine/` first.
2. **Canonical authoring stays frame-tree-native** — the repo's authored shape remains top-level `root` + `arrows`.
3. **Exporters consume AST only** — never parse raw YAML.
4. **Renderer stays on FrameDiagram** — AST lowers to existing `Frame` / `FrameDiagram`; do not fork layout/measure in exporters.
5. **Additive sugar only** — authoring conveniences must round-trip back to the existing semantic model; do not create a second source of truth beside the preview/editor save path.
6. **Do not block on Python parity** — `frame_loader.py` may lag; TS compiler is authoritative.
7. Another agent may be active in the repo — touch only files listed in `tasks.md` for each task.

## User scenarios and testing

### User Story 1 — Concise arrow authoring (Priority: P1)

As a diagram author, I want to write `public_repo -> global_server` inside `arrows:` instead of verbose `source` / `target` mappings so connector lists stay readable.

**Independent test**: Parse mixed shorthand + object arrows; normalized AST contains structured `Arrow` records with `source`, `target`, `kind: directed`.

**Acceptance scenarios**

1. **Given** `arrows: [public_repo -> global_server]`, **When** compiled, **Then** AST has one arrow `{ source: public_repo, target: global_server, kind: directed }`.
2. **Given** invalid shorthand `public_repo ->`, **When** compiled, **Then** a clear parse error names the line and expected `source -> target` form.
3. **Given** a container endpoint such as `tier2_row -> global_server`, **When** compiled, **Then** validation accepts it if both frame ids exist.
4. **Given** side-qualified refs such as `global_server.right -> tier2_left.left`, **When** compiled, **Then** the compiler preserves the authored refs and validates their base frame ids.

---

### User Story 2 — Frame-tree-native AST (Priority: P1)

As a diagram author, I want the compiler to understand the existing recursive `root` tree directly so the authoring AST matches the project's real source of truth.

**Independent test**: Parse a nested `root` tree; AST preserves the recursive frame structure and a frame index; arrows resolve against frame ids rather than a separate node/group registry.

**Acceptance scenarios**

1. **Given** a nested frame tree under `root.children`, **When** compiled, **Then** AST preserves the same containment structure.
2. **Given** duplicate frame ids anywhere in the tree, **When** compiled, **Then** validation fails with a collision error.
3. **Given** an arrow targeting a headed container, **When** compiled, **Then** validation succeeds if that container id exists.

---

### User Story 3 — Defaults and `use` templates (Priority: P1)

As a diagram author, I want reusable `defaults` and `use: template` on frame entries so repeated icon/label patterns are not copy-pasted.

**Independent test**: Template expansion merges defaults; frame-local overrides win.

**Acceptance scenarios**

1. **Given** `defaults.client.label: Client` and a frame entry `id: client_l1` with `use: client`, **When** compiled, **Then** frame `client_l1` has label `Client`.
2. **Given** the same with `label: Special client` on the frame, **When** compiled, **Then** label is `Special client`.
3. **Given** `use: missing_template`, **When** compiled, **Then** validation fails with unknown template error.

---

### User Story 4 — Validation and warnings (Priority: P2)

As a maintainer, I want strict validation errors and non-fatal warnings so broken diagrams fail early with actionable messages.

**Independent test**: Fixture suite covers errors and warnings listed in `data-model.md`.

**Acceptance scenarios**

1. **Given** an arrow source ref whose base id does not exist, **When** compiled, **Then** the error cites the ref and arrow index.
2. **Given** an unused default template, **When** compiled, **Then** a warning lists the unused template key.
3. **Given** duplicate arrows, **When** compiled, **Then** validation emits a warning (not error unless configured strict).

---

### User Story 5 — Mermaid export adapter (Priority: P2)

As an integrator, I want Mermaid flowchart output from the normalized AST for docs and tooling, accepting that layout hints may be lossy.

**Independent test**: Golden tests: AST → Mermaid string; no YAML parsing in exporter.

**Acceptance scenarios**

1. **Given** multi-line labels `[{ text: "Tier 1" }, { text: "Global server" }]`, **When** exported, **Then** Mermaid node uses `<br/>` line breaks.
2. **Given** nested containers, **When** exported, **Then** Mermaid uses `subgraph` blocks where feasible.
3. **Given** anchor-qualified arrow refs or exact layout hints, **When** exported, **Then** warnings note unsupported or lossy translation.

---

### User Story 6 — D2 export adapter (Priority: P3)

As an integrator, I want D2 output for nested container diagrams where Mermaid is too lossy.

**Independent test**: AST → D2 string golden test on a tiered-network-shaped fixture.

**Acceptance scenarios**

1. **Given** nested containers, **When** exported, **Then** D2 containers mirror the frame hierarchy.
2. **Given** icon metadata on frames, **When** exported, **Then** icon metadata is included where D2 supports it and warnings are recorded otherwise.

---

### User Story 7 — Documentation and migration (Priority: P2)

As a cold-start agent, I need schema docs, migration notes, and export limitation tables that reflect the real project contract.

**Independent test**: `quickstart.md` examples parse and match the documented AST shape.

**Acceptance scenarios**

1. **Given** an existing `arrows` + `root` document, **When** the compat path runs, **Then** it loads without deprecation and produces equivalent AST/runtime output.
2. **Given** a migration utility, **When** it rewrites a legacy file, **Then** it only applies additive sugar such as shorthand arrows or extracted defaults; it does not rename canonical top-level keys.

## Functional requirements

### FR-001 — Arrow syntax

- Canonical authoring key remains **`arrows`**.
- Each `arrows` entry may be either:
  - shorthand scalar `source -> target`
  - object form with `source`, `target`, optional `label`, `style`, `id`, `waypoints`, `label_gap`, etc.
- Arrow endpoint grammar preserves the current repo contract: endpoints are string refs, not just bare ids. That includes:
  - plain frame ids such as `tier2_row`
  - side-qualified refs such as `global_server.right`
  - cell-like refs already supported by runtime routing, such as `panel_id.col.row.right`
- Normalized AST arrow shape is `{ source, target, kind: "directed", ...optional }`.

### FR-002 — Root grammar

- Canonical top-level layout key remains **`root`**.
- `root` is a recursive frame tree using the existing frame fields (`id`, `children`, `direction`, `padding`, `align`, `justify`, `gap`, `sizing_w`, `sizing_h`, `width`, `height`, `min_*`, `max_*`, `wrap`, `level`, `variant`, `role`, `heading`, `label`, `icon`, `position`, `x`, `y`, `col_span`, etc.).
- The compiler may normalize additive sugar within frame entries, but it must not replace the frame tree with a separate `layout` / `node` / `group` schema in v1.
- Container vs leaf status derives from the existing rule: presence of `children`, not a separate authoring keyword.

### FR-003 — Defaults / templates

- `defaults:` is a map of template name → partial frame properties.
- `use: <template>` may appear on any frame entry in the `root` tree.
- Override precedence: frame properties > template > implicit defaults.

### FR-004 — Internal AST

See `data-model.md`. Minimum shape: `root`, `arrows`, `defaults`, `frameIndex`, `metadata`, plus passthrough `grid`, `overlays`, and `meta`.

### FR-005 — Validation (errors)

- Unique frame ids across the full recursive tree.
- Every arrow `source` / `target` resolves to an existing frame id after stripping any supported anchor suffix.
- Every `use` references an existing default.
- Labels normalize from string | string[] | line-object forms to a consistent line-array representation.
- `root` and `children` entries must be valid frame objects.
- Invalid arrow shorthand yields a parse error with line context.

### FR-006 — Warnings (non-fatal)

- Unused defaults; orphan leaf frames; duplicate arrows; self-loop arrows; Mermaid/D2 unsupported property lists.

### FR-007 — Pipeline

Implement as explicit stages (no schema-replacement migration):

1. `parseYamlDocument(raw)`
2. `normalizeArrowSyntax(doc)` — object + shorthand `arrows` → normalized arrow records
3. `expandDefaults(doc)`
4. `buildFrameIndex(doc.root)` — ids, parentage, lookup
5. `validate(doc, index)` — errors + warnings
6. `buildDiagramAst(...)` — strict frame-tree-native AST
7. `lowerToFrameDiagram(ast)` — existing runtime
8. `exportMermaid(ast)` / `exportD2(ast)` — adapters only

### FR-008 — Backward compatibility

- Existing YAML with `arrows` and recursive `root.children[].id` continues to load with no deprecation.
- Additive sugar must compile back to equivalent runtime semantics.
- Optional CLI `migrate-diagram-yaml.mjs` may rewrite verbose arrow objects to shorthand and extract defaults, but must not rename `arrows` or `root` in v1.

### FR-009 — Tests

Cover all cases listed in user requirements §9: concise/object/mixed arrows, templates, validation errors, nested frame tree, container arrow endpoints, side-qualified refs, exporters.

### FR-010 — Documentation

Update or add under this spec package and canonical docs when implementing: authoring schema, arrow syntax, defaults, validation, Mermaid/D2 limitations, migration examples, and the rule that containers remain valid arrow endpoints.

## Edge cases

- Empty `arrows: []` — valid.
- Self-loop `a -> a` — allowed with warning by default.
- Arrow shorthand with extra `:` confusion vs YAML mapping — parser must not treat `->` lines as mappings.
- Container-to-container arrows are valid.
- Side-qualified refs are valid when the base frame id exists; exporters may degrade them with warnings.
- `engine: v3` retained; compiler version field `schema: author-v1` is optional and marks additive sugar, not a new top-level schema.

## Success criteria

- **SC-001**: New authoring YAML for `tiered-network-architecture` is materially shorter than the current version through shorthand arrows and `defaults` / `use`, without replacing the canonical frame-tree shape.
- **SC-002**: 100% of kept corpus loads through the compiler path with zero behavior change in SVG golden tests (post-lower).
- **SC-003**: All validation error fixtures produce stable error codes/messages.
- **SC-004**: Mermaid exporter produces a parseable flowchart for the tiered-network AST fixture.
- **SC-005**: No exporter reads raw YAML.

## References

- Current loader: `packages/layout-engine/src/frame-yaml-loader.ts`, `scripts/frame_loader.py`
- Runtime model: `packages/layout-engine/src/frame-model.ts` (`Frame`, `FrameDiagram`, `Arrow`)
- Example corpus: `scripts/diagrams/frames/tiered-network-architecture.yaml`
- Separate ontology schema: `docs/diagram-schema.json` (not replaced by this spec)

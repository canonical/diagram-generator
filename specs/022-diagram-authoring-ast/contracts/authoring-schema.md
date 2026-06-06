# Contract: Authoring YAML schema (author-v1)

**Normative for**: spec 022 compiler input after normalization.

## Top-level keys

| Key | Required | Description |
|-----|----------|-------------|
| `engine` | yes | `v3` — layout runtime family |
| `schema` | no | `author-v1` when using additive sugar |
| `title` | yes | Diagram title |
| `arrows` | no | Connection list; canonical key |
| `defaults` | no | Map of template name → partial frame props |
| `root` | yes | Canonical recursive frame tree |
| `grid` | no | Grid overlay — maps to existing grid fields |
| `overlays` | no | Diagram overlays |
| `meta` | no | Ontology / engine metadata passthrough |

## `arrows` entry forms

### Form A — shorthand scalar

```yaml
- public_repo -> global_server
```

- Must match `source -> target` with optional surrounding whitespace
- Preserves the existing ref grammar, not just bare ids

### Form B — mapping

```yaml
- source: public_repo.right
  target: global_server.left
  label: sync
  style: dashed
  color: "#E95420"
  id: edge-1
```

### Normalized AST

Both forms become:

```json
{
  "source": "public_repo",
  "target": "global_server",
  "kind": "directed"
}
```

When authored refs contain anchor suffixes, the AST preserves the original strings.

## Arrow endpoint rules

- Non-root container ids are valid arrow endpoints.
- The top-level `root` frame is the canvas wrapper and must not be used as an arrow endpoint.
- Side-qualified refs such as `foo.right` are valid.
- Exporters may degrade anchor-qualified refs with warnings, but the compiler must preserve them.

## `root` tree

`root` is the canonical recursive frame tree. Frame properties follow the existing frame YAML contract: `id`, `children`, `direction`, `padding`, `padding_*`, `gap`, `align`, `justify`, `sizing_w`, `sizing_h`, `width`, `height`, `min_*`, `max_*`, `wrap`, `fill`, `border`, `level`, `variant`, `role`, `heading`, `label`, `icon`, `position`, `x`, `y`, `col_span`, and related runtime-backed fields.

### Child entry — frame

```yaml
- id: client_l1
  use: client
  label: Special client
  icon: Laptop.svg
  sizing_w: fill
```

- `id` is required
- additional keys are canonical frame properties
- a frame is a container when it has `children`

### Child entry — container frame

```yaml
- id: tier2_row
  direction: horizontal
  padding: 16
  children:
    - id: tier2_left
      use: network_server
```

No separate `group:` syntax exists in v1.

## `defaults`

```yaml
defaults:
  client:
    label: Client
    icon: Laptop.svg
  network_server:
    label: [Tier 2, Network server]
    icon: Network.svg
```

Template names are referenced by `use:` on frame entries.

## Labels

| Author form | Normalized |
|-------------|------------|
| `label: Client` | `[{ text: "Client" }]` |
| `label: [Public, repository]` | `[{ text: "Public" }, { text: "repository" }]` |
| YAML object form | preserved as line object |

## Validation summary

**Errors**: duplicate frame ids, missing frame ids, malformed defaults entries, unknown arrow endpoints, malformed refs, unknown `use`, invalid shorthand, invalid child entry, missing/invalid `root`.

**Warnings**: unused defaults, orphan leaves (excluding the layout root wrapper), duplicate arrows, self-loops, exporter limitations.

## Export limitations (informative)

### Mermaid

| Feature | Supported | Notes |
|---------|-----------|-------|
| Frames + labels | yes | `<br/>` for multi-line |
| Directed arrows | yes | `-->` |
| Nested containers | partial | `subgraph` |
| Container labels/headings | no | warn |
| Icons | no | warn |
| Padding / align / sizing | no | warn |
| Anchor-qualified refs | lossy | warn and degrade to base ids |
| Waypoints | no | warn |

### D2

| Feature | Supported | Notes |
|---------|-----------|-------|
| Frames + labels | yes | quoted `\n` for multi-line |
| Directed arrows | yes | `source -> target` |
| Nested containers | yes | nested blocks |
| Container labels/headings | yes | block header, with ambiguity warning when both are set |
| Icons | no | warn |
| Padding / align / sizing | no | warn |
| Anchor-qualified refs | lossy | warn and degrade to base ids |
| Waypoints | no | warn |
| Missing frame refs | skipped | warn |
| Root canvas endpoints | skipped | warn |

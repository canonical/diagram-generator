# Contract: Authoring YAML schema (author-v1)

**Normative for**: spec 022 compiler input after normalization.

## Top-level keys

| Key | Required | Description |
|-----|----------|-------------|
| `engine` | yes | `v3` — layout runtime family |
| `schema` | no | `author-v1` when using new grammar |
| `title` | yes | Diagram title |
| `edges` | no | Connection list (preferred) |
| `arrows` | no | **Deprecated** — alias for `edges` |
| `defaults` | no | Map of template name → partial node props |
| `layout` | yes* | Root layout tree (*or legacy `root`) |
| `grid` | no | Grid overlay — maps to existing grid fields |
| `overlays` | no | Diagram overlays |

## `edges` entry forms

### Form A — shorthand scalar

```yaml
- public_repo -> global_server
```

- Must match `source -> target` with optional surrounding whitespace
- Parsed before YAML mapping interpretation

### Form B — mapping

```yaml
- source: public_repo
  target: global_server
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

## `layout` tree

Root container properties mirror group properties: `direction`, `padding`, `align`, `justify`, `gap`, `level`, `heading`, etc.

### Child entry — node

```yaml
- node: client_l1
  use: client
  label: Special client
  icon: Laptop.svg
  sizing_w: fill
  sizing_h: hug
  level: 2
```

- `node:` value is the **id** (required)
- Additional keys are node properties

### Child entry — group

```yaml
- group: tier2_row
  direction: horizontal
  padding: 16
  children:
    - node: tier2_left
      use: network_server
```

- `group:` value is the **id** (required)
- Must include `children` unless `allow_empty: true`

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

Template names referenced by `use:` on node entries.

## Labels

| Author form | Normalized |
|-------------|------------|
| `label: Client` | `["Client"]` |
| `label: [Public, repository]` | `["Public", "repository"]` |
| YAML list (legacy) | same as array |

## Validation summary

**Errors**: duplicate ids, unknown edge endpoints, unknown `use`, empty group, invalid shorthand, invalid layout child.

**Warnings**: unused defaults, orphan nodes, duplicate edges, exporter limitations.

## Export limitations (informative)

### Mermaid

| Feature | Supported | Notes |
|---------|-----------|-------|
| Nodes + labels | yes | `<br/>` for multi-line |
| Directed edges | yes | `-->` |
| Nested groups | partial | `subgraph` + `direction` |
| Icons | no | warn |
| Padding / align / fill sizing | no | warn |
| Waypoints | no | warn |

### D2

| Feature | Supported | Notes |
|---------|-----------|-------|
| Containers | yes | better than Mermaid |
| Nodes + labels | yes | |
| Edges | yes | |
| Icons | partial | warn when dropped |
| Exact padding/align | no | warn |

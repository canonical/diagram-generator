# Diagram authoring (spec 022)

Frame YAML remains the **only authored source of truth**. Spec 022 adds an optional **author-v1** sugar layer and a TypeScript **diagram compiler** in `packages/layout-engine/src/diagram-author/` that validates, lowers to the existing runtime, and exports adapter formats.

Canonical top-level keys are unchanged:

| Key | Required | Role |
|-----|----------|------|
| `engine` | yes | Must be `v3` |
| `title` | yes | Diagram title |
| `root` | yes | Recursive frame tree (`id`, `children`, layout/label fields) |
| `arrows` | no | Connection list |
| `schema` | no | Set to `author-v1` when using additive sugar |
| `defaults` | no | Template name → partial frame props |
| `grid`, `overlays`, `meta` | no | Passthrough to runtime |

Spec 022 does **not** introduce top-level `layout`, `edges`, or `node:` / `group:` grammar.

## Additive sugar

### Shorthand arrows

```yaml
arrows:
  - public_repo -> global_server
  - source: global_server.right
    target: tier2_left.left
    label: sync
```

Object arrows with only `source` and `target` normalize to the same AST as shorthand. Side-qualified refs and container endpoints stay valid.

### Defaults and `use:`

```yaml
defaults:
  client:
    label: Client
    icon: Laptop.svg

root:
  id: page
  children:
    - id: client_l1
      use: client
      label: Special client   # local override wins
```

Templates expand before validation and lowering. Preview save format stays canonical `root` + `arrows` on disk unless you choose to adopt author-v1 in new files.

## Compiler pipeline

```text
YAML string
  → parseYamlDocument
  → build frame AST + expand defaults
  → normalize arrows + validate refs
  → collect warnings (orphan leaves, unused defaults, duplicate/self-loop arrows)
  → lowerToFrameDiagram (when compile has no errors)
```

Public API:

```typescript
import { compileDiagramYaml, exportMermaid } from '@layout-engine';

const result = compileDiagramYaml(rawYaml, { sourcePath, strict });
// result.ast, result.frameDiagram?, result.errors, result.warnings
```

`loadFrameYaml()` now routes through `compileDiagramYaml` + lowering. Existing corpus YAML continues to load without rewrite.

## Validation

### Errors (compile blocked; no `frameDiagram`)

| Code | Meaning |
|------|---------|
| `ROOT_MISSING` | Missing/invalid top-level `root` |
| `FRAME_MISSING_ID` | Frame entry without non-empty `id` |
| `DUPLICATE_FRAME_ID` | Duplicate frame id in tree |
| `INVALID_FRAME_CHILD` | Child entry is not a frame mapping |
| `INVALID_DEFAULT` | Malformed `defaults` entry |
| `UNKNOWN_TEMPLATE` | `use:` references missing template |
| `ARROW_SHORTHAND_PARSE` | Malformed `source -> target` string |
| `ARROW_INVALID_REF` | Arrow entry shape invalid |
| `ARROW_UNKNOWN_SOURCE` / `ARROW_UNKNOWN_TARGET` | Base frame id missing |

### Warnings (non-fatal unless `strict: true` for arrow duplicates/self-loops)

| Code | Meaning |
|------|---------|
| `UNUSED_DEFAULT` | Template never referenced |
| `ORPHAN_LEAF` | Leaf with no incident arrows |
| `DUPLICATE_ARROW` | Same source/target/label repeated |
| `SELF_LOOP_ARROW` | `source === target` |

With `strict: true`, `DUPLICATE_ARROW` and `SELF_LOOP_ARROW` promote to errors.

## CLI tools

From repo root after `npm --prefix packages/layout-engine run build`:

```bash
# Mermaid flowchart export (stderr = warnings)
node packages/layout-engine/scripts/export-mermaid.mjs --slug tiered-network-architecture

# Optional migration to author-v1 sugar (stdout or --out)
node packages/layout-engine/scripts/migrate-diagram-yaml.mjs \
  --in scripts/diagrams/frames/tiered-network-architecture.yaml \
  --out scripts/diagrams/frames/tiered-network-architecture.author-v1.yaml \
  --shorthand-arrows --extract-defaults
```

## Export limitations

### Mermaid (`exportMermaid`)

- Containers → `subgraph`; leaves → labeled nodes; multiline labels → `<br/>`
- Root layout wrapper (`page`) is omitted when it only groups children
- Lossy: padding, sizing, alignment, icons, anchor-qualified arrow refs, waypoints, arrow labels
- Emits `MERMAID_UNSUPPORTED_*` warnings for ignored metadata

### D2

Deferred (spec 022 phase 8). No `export-d2.mjs` in v1.

## Reference material

| Doc | Purpose |
|-----|---------|
| [`specs/022-diagram-authoring-ast/quickstart.md`](../specs/022-diagram-authoring-ast/quickstart.md) | Examples |
| [`specs/022-diagram-authoring-ast/data-model.md`](../specs/022-diagram-authoring-ast/data-model.md) | AST types |
| [`specs/022-diagram-authoring-ast/contracts/authoring-schema.md`](../specs/022-diagram-authoring-ast/contracts/authoring-schema.md) | Normative schema |
| [`scripts/diagrams/frames/tiered-network-architecture.author-v1.yaml`](../scripts/diagrams/frames/tiered-network-architecture.author-v1.yaml) | Reference author-v1 fixture |

Full visual contract for boxes, tokens, and preview editing: [`DIAGRAM.md`](../DIAGRAM.md).

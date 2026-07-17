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

Object arrows with only `source` and `target` normalize to the same AST as shorthand. Side-qualified refs and non-root container endpoints stay valid. The `root` frame is the canvas wrapper, not a connectable endpoint.

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
| `ARROW_ROOT_ENDPOINT` | Arrow references the root canvas frame |

### Warnings (non-fatal unless `strict: true` for arrow duplicates/self-loops)

| Code | Meaning |
|------|---------|
| `UNUSED_DEFAULT` | Template never referenced |
| `ORPHAN_LEAF` | Non-root leaf with no incident arrows |
| `DUPLICATE_ARROW` | Same source/target/label repeated |
| `SELF_LOOP_ARROW` | `source === target` |

With `strict: true`, `DUPLICATE_ARROW` and `SELF_LOOP_ARROW` promote to errors.

## CLI tools

From repo root after `npm --prefix packages/layout-engine run build`:

```bash
# Mermaid flowchart export (stderr = warnings)
node packages/layout-engine/scripts/export-mermaid.mjs --slug tiered-network-architecture

# Import Mermaid as canonical engine-v3 YAML
node packages/layout-engine/scripts/import-mermaid.mjs \
  --in /tmp/tiered-network.mmd --out /tmp/tiered-network.yaml

# Import D2 as canonical engine-v3 YAML
node packages/layout-engine/scripts/import-d2.mjs \
  --in /tmp/juju-process.d2 --out /tmp/juju-process.yaml

# Verify structural YAML → interchange → YAML equality
node packages/layout-engine/scripts/interchange-roundtrip.mjs \
  --in diagrams/1.input/tiered-network-architecture.yaml \
  --format mermaid --out /tmp/tiered-network.roundtrip.yaml

# Optional migration to author-v1 sugar (stdout or --out)
node packages/layout-engine/scripts/migrate-diagram-yaml.mjs \
  --in diagrams/1.input/tiered-network-architecture.yaml \
  --out diagrams/1.input/tiered-network-architecture.author-v1.yaml \
  --shorthand-arrows --extract-defaults
```

## Export limitations

### Mermaid (`exportMermaid`)

- Containers → `subgraph`; leaves → labeled nodes; multiline labels → `<br/>`
- Root layout wrapper (`page`) is omitted when it only groups children
- Lossy: padding, sizing, alignment, icons, anchor-qualified arrow refs, waypoints, arrow labels
- Invalid edges are skipped defensively when refs are missing or point at the root canvas
- Emits `MERMAID_UNSUPPORTED_*`, `MERMAID_MISSING_FRAME_REF`, and `MERMAID_ROOT_ENDPOINT_UNSUPPORTED` warnings
- Import accepts the hand-authored flowchart subset used by the Mermaid corpus:
  implicit edge endpoints, chained and labelled edges, bidirectional/open/thick/
  dotted edge downgrades, standard node-shape declarations, nested labelled
  subgraphs, comments, and large YAML frontmatter (preserving `title`)
- Non-rectangular nodes retain their id and label as rectangular frames; class,
  style, link-style, and click directives are diagnosed and dropped without
  dropping supported neighbours
- Non-flowchart Mermaid types fail once with
  `IMPORT_MERMAID_UNSUPPORTED_DIAGRAM_TYPE`; Sankey, pie, sequence, and the other
  Mermaid grammars are not converted to phantom frame diagrams
- Import CLIs refuse empty or structurally invalid output and recompile the
  serialized YAML before writing it

### D2 (`exportD2`)

```bash
node packages/layout-engine/scripts/export-d2.mjs --slug juju-bootstrap-machines-process \
  --out ../d2/juju-bootstrap-machines-process.d2
```

- Containers → nested D2 blocks; container headings/labels preserved on the block header
- Leaves → inline labels; multiline labels → quoted strings with line breaks
- Arrows → fully qualified `parent.child -> other.parent.child` paths; arrow labels exported (unlike Mermaid)
- When `meta.layout_engine` contains `elk`, emits `vars.d2-config.layout-engine: elk`
- Root layout wrapper (`page`) is omitted when it only groups children
- Lossy: padding, sizing, alignment, icons, anchor-qualified arrow refs, waypoints
- Invalid edges are skipped defensively when refs are missing or point at the root canvas
- Emits `D2_UNSUPPORTED_*`, `D2_MISSING_FRAME_REF`, and `D2_ROOT_ENDPOINT_UNSUPPORTED` warnings
- Import supports nested shape blocks, quoted/multiline labels, and dot-path connections; styles/classes/vars are diagnosed and skipped
- D2 edge attribute blocks are skipped after recovering the connection and label; singular `class:` assignments never become frame nodes
- Broader hand-authored D2 grammar support is deferred; the existing
  exporter-round-trip subset remains available and shares the empty/invalid YAML
  write guard
- The real D2 compiler golden is opt-in: a normal green suite does not prove D2
  syntax unless `D2_BIN` points to a D2 executable (for example,
  `D2_BIN="C:\Program Files\D2\d2.exe"`)

See [`specs/028-diagram-interchange-mermaid-d2/`](../specs/028-diagram-interchange-mermaid-d2/spec.md) for import parsers and round-trip fidelity matrix.
Use `--strict` on export/import CLIs to make unsupported syntax and structural
diagnostics fail the process. Mermaid's documented lossy downgrades (shapes,
styles, and edge direction/style) remain visible warnings because those
constructs are accepted by the import contract.

## Reference material

| Doc | Purpose |
|-----|---------|
| [`docs/spec-archive/022-diagram-authoring-ast/quickstart.md`](./spec-archive/022-diagram-authoring-ast/quickstart.md) | Examples |
| [`docs/spec-archive/022-diagram-authoring-ast/data-model.md`](./spec-archive/022-diagram-authoring-ast/data-model.md) | AST types |
| [`docs/spec-archive/022-diagram-authoring-ast/contracts/authoring-schema.md`](./spec-archive/022-diagram-authoring-ast/contracts/authoring-schema.md) | Normative schema |
| [`diagrams/1.input/tiered-network-architecture.author-v1.yaml`](../diagrams/1.input/tiered-network-architecture.author-v1.yaml) | Reference author-v1 fixture |

Full visual contract for boxes, tokens, and preview editing: [`DIAGRAM.md`](../DIAGRAM.md).

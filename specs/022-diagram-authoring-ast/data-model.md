# Data model: Diagram authoring AST

**Spec**: 022-diagram-authoring-ast

## Pipeline types

```text
RawYamlDocument          # parsed YAML (untrusted)
  ↓ normalizeLegacy
AuthorDocument           # new+old schema unified shape
  ↓ expandDefaults
AuthorDocumentExpanded
  ↓ validate + index
DiagramDocument          # strict AST (export + lower source of truth)
  ↓ lowerToFrameDiagram
FrameDiagram             # existing runtime (layout-engine)
```

## DiagramDocument (strict AST)

```typescript
interface DiagramDocument {
  engine: 'v3';                    // runtime engine family
  schema?: 'author-v1';          // authoring grammar version
  title: string;
  metadata?: Record<string, unknown>;
  defaults: Record<string, NodeTemplate>;
  nodes: Record<NodeId, DiagramNode>;
  groups: Record<GroupId, DiagramGroup>;
  edges: Edge[];
  layoutTree: LayoutTreeNode;
  overlays?: DiagramOverlay[];   // optional; maps to existing overlay type
  grid?: GridSpec;               // optional; maps to FrameDiagram grid fields
}

type NodeId = string;
type GroupId = string;
```

## DiagramNode

Connectable leaf — maps to `Frame` leaf (or headed container leaf semantics via lower rules).

```typescript
interface DiagramNode {
  id: NodeId;
  label: LabelSpec;              // normalized from string | string[]
  icon?: string;
  iconFill?: string;
  sizingW?: Sizing;
  sizingH?: Sizing;
  level?: number;
  variant?: string;
  role?: string;
  heading?: LineSpec;
  // layout-only hints that apply when node is sole child — lower rules document mapping
  connectable: true;             // always true for nodes
}

type LabelSpec = string[];       // one line per array element; string input → [string]
```

## DiagramGroup

Layout container — maps to `Frame` container (no direct edge attachment by default).

```typescript
interface DiagramGroup {
  id: GroupId;
  direction: 'vertical' | 'horizontal';
  padding?: number | PerSidePadding;
  align?: Align;
  justify?: Justify;
  gap?: number;
  level?: number;
  heading?: LineSpec;
  connectable?: boolean;         // default false — edges must not target unless true
  allowEmpty?: boolean;        // default false
  children: LayoutTreeNode[];
}
```

## LayoutTreeNode

Discriminated union — preserves authoring tree.

```typescript
type LayoutTreeNode =
  | { kind: 'node'; ref: NodeId }
  | { kind: 'group'; ref: GroupId };
```

## Edge

Normalized from shorthand or object form.

```typescript
interface Edge {
  source: NodeId;
  target: NodeId;
  kind: 'directed';              // reserved for undirected/bidirectional later
  id?: string;
  label?: LabelSpec;
  style?: 'solid' | 'dashed' | 'dotted';
  color?: string;
  waypoints?: [number, number][];
}
```

### Shorthand parsing

| Input | Result |
|-------|--------|
| `public_repo -> global_server` | `{ source: 'public_repo', target: 'global_server', kind: 'directed' }` |
| `{ source: a, target: b, label: sync }` | object fields merged |

Regex (informative): `^\s*([A-Za-z_][A-Za-z0-9_]*)\s*->\s*([A-Za-z_][A-Za-z0-9_]*)\s*$`

## NodeTemplate (defaults)

```typescript
interface NodeTemplate {
  label?: LabelSpec;
  icon?: string;
  iconFill?: string;
  sizingW?: Sizing;
  sizingH?: Sizing;
  level?: number;
  variant?: string;
  // partial — only listed fields apply
}
```

Expansion: for `node: client_l1` + `use: client`, shallow-merge `defaults.client` then node-local keys (node wins).

## CompileResult

```typescript
interface CompileResult {
  ast?: DiagramDocument;
  frameDiagram?: FrameDiagram;   // present when lower succeeds
  errors: CompileDiagnostic[];   // fatal
  warnings: CompileDiagnostic[];// non-fatal
  deprecations: CompileDiagnostic[];
}

interface CompileDiagnostic {
  code: string;                  // e.g. EDGE_UNKNOWN_SOURCE
  message: string;
  path?: string;                 // YAML path e.g. edges[2]
  line?: number;
}
```

## Validation error codes (minimum set)

| Code | Condition |
|------|-----------|
| `DUPLICATE_NODE_ID` | Two nodes same id |
| `DUPLICATE_GROUP_ID` | Two groups same id |
| `ID_COLLISION` | Same id in nodes and groups |
| `EDGE_UNKNOWN_SOURCE` | source not a node (or connectable group) |
| `EDGE_UNKNOWN_TARGET` | target not a node |
| `EDGE_GROUP_ENDPOINT` | endpoint is non-connectable group |
| `UNKNOWN_TEMPLATE` | `use` references missing default |
| `GROUP_EMPTY` | group without children and without `allow_empty` |
| `INVALID_LAYOUT_CHILD` | child entry not node/group |
| `EDGE_SHORTHAND_PARSE` | shorthand string malformed |
| `LEGACY_KEY_DEPRECATED` | `arrows` used instead of `edges` |

## Warning codes (minimum set)

| Code | Condition |
|------|-----------|
| `UNUSED_DEFAULT` | default template never referenced |
| `ORPHAN_NODE` | node with zero incident edges |
| `EMPTY_GROUP` | allowed empty group |
| `DUPLICATE_EDGE` | same source+target (+label) repeated |
| `MERMAID_UNSUPPORTED_*` | property not representable in Mermaid |
| `D2_UNSUPPORTED_*` | property not representable in D2 |

## Lowering: DiagramDocument → FrameDiagram

- `layoutTree` root → `Frame` root (`id: page` or preserved root id)
- Each `DiagramGroup` → `Frame` container with `children`
- Each `DiagramNode` → `Frame` leaf (label lines → `createLine` list)
- `edges` → `FrameDiagram.arrows` via `createArrow` (internal name unchanged at runtime until optional rename phase)
- `defaults` do not appear in FrameDiagram — expansion happens pre-lower only

**Note**: Runtime may keep `arrows` field name on `FrameDiagram` while authoring uses `edges`; lowering maps between them. Renaming runtime `Arrow`→`Edge` is optional follow-up (out of scope unless zero churn).

## Mermaid export model (adapter input: DiagramDocument only)

- Nodes → `nodeId["label<br/>line2"]`
- Groups → `subgraph id` with nested content
- Edges → `source --> target`
- Lossy: icons, padding, fill sizing, exact alignment, waypoint geometry

## D2 export model (adapter input: DiagramDocument only)

- Groups → D2 containers
- Nodes → D2 shapes with labels
- Edges → D2 connections
- Icons → D2 icon syntax where supported

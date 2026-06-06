# Data model: Diagram authoring AST

**Spec**: 022-diagram-authoring-ast

## Pipeline types

```text
RawYamlDocument          # parsed YAML (untrusted)
  ↓ normalizeArrowSyntax
AuthorDocument           # canonical frame YAML + additive sugar unified
  ↓ expandDefaults
AuthorDocumentExpanded
  ↓ validate + index
DiagramDocument          # strict AST (frame-tree-native)
  ↓ lowerToFrameDiagram
FrameDiagram             # existing runtime (layout-engine)
```

## DiagramDocument (strict AST)

```typescript
interface DiagramDocument {
  engine: 'v3';
  schema?: 'author-v1';
  title: string;
  metadata?: Record<string, unknown>;
  defaults: Record<string, FrameTemplate>;
  root: AuthorFrameNode;
  arrows: AuthorArrow[];
  frameIndex: Record<FrameId, FrameIndexEntry>;
  overlays?: DiagramOverlay[];
  grid?: GridSpec;
  meta?: Record<string, unknown>;
}

type FrameId = string;
```

## AuthorFrameNode

Strict AST node mirroring the canonical recursive frame YAML shape.

```typescript
interface AuthorFrameNode {
  id: FrameId;
  direction?: 'vertical' | 'horizontal';
  gap?: number;
  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  sizingW?: Sizing;
  sizingH?: Sizing;
  fillWeight?: number;
  width?: number;
  height?: number;
  minWidth?: number;
  maxWidth?: number;
  maxWidthChars?: number;
  minHeight?: number;
  maxHeight?: number;
  align?: Align;
  justify?: Justify;
  wrap?: boolean;
  fill?: FillSpec;
  border?: BorderSpec;
  level?: number;
  variant?: string;
  role?: string;
  heading?: LineSpec;
  label?: LineSpec[];
  icon?: string;
  iconFill?: string;
  position?: 'AUTO' | 'ABSOLUTE';
  x?: number;
  y?: number;
  colSpan?: number;
  use?: string;
  children: AuthorFrameNode[];
}
```

Container vs leaf is derived from `children.length > 0`, matching the current project contract.

## LineSpec

```typescript
interface LineSpec {
  text: string;
  size?: string;
  weight?: string;
  fill?: string;
  smallCaps?: boolean;
  letterSpacing?: string;
  lineStep?: number;
  fontFamily?: string;
}
```

Normalization rules:

- `"Client"` → `[{ text: "Client" }]`
- `["Tier 1", "Global server"]` → `[{ text: "Tier 1" }, { text: "Global server" }]`
- Existing object form retains authored style fields where present.

## AuthorArrow

Normalized from shorthand or object form.

```typescript
interface AuthorArrow {
  source: string;
  target: string;
  kind: 'directed';
  id?: string;
  label?: LineSpec[];
  labelGap?: number;
  style?: 'solid' | 'dashed' | 'dotted';
  color?: string;
  waypoints?: [number, number][];
}
```

### Arrow reference grammar

Arrow endpoints preserve the repo's existing string-ref contract.

| Input | Meaning |
|-------|---------|
| `public_repo` | plain frame id |
| `global_server.right` | frame id + side anchor |
| `panel_id.col.row.right` | panel/cell-style anchor ref already supported by routing code |

The compiler validates the base frame id and preserves the authored ref string.

### Shorthand parsing

| Input | Result |
|-------|--------|
| `public_repo -> global_server` | `{ source: 'public_repo', target: 'global_server', kind: 'directed' }` |
| `tier2_row.left -> group_left.right` | same shape, refs preserved verbatim |
| `{ source: a, target: b, label: sync }` | object fields merged |

## FrameTemplate (defaults)

```typescript
interface FrameTemplate {
  label?: LineSpec[];
  icon?: string;
  iconFill?: string;
  sizingW?: Sizing;
  sizingH?: Sizing;
  level?: number;
  variant?: string;
  role?: string;
  heading?: LineSpec;
  direction?: 'vertical' | 'horizontal';
  gap?: number;
  padding?: number;
}
```

Expansion: for a frame entry with `use: client`, shallow-merge `defaults.client` then frame-local keys (frame wins).

## FrameIndexEntry

```typescript
interface FrameIndexEntry {
  id: FrameId;
  parentId?: FrameId;
  isContainer: boolean;
  path: string;
}
```

## CompileResult

```typescript
interface CompileResult {
  ast?: DiagramDocument;
  frameDiagram?: FrameDiagram;
  errors: CompileDiagnostic[];
  warnings: CompileDiagnostic[];
  deprecations: CompileDiagnostic[];
}

interface CompileDiagnostic {
  code: string;
  message: string;
  path?: string;
  line?: number;
}
```

## Validation error codes (minimum set)

| Code | Condition |
|------|-----------|
| `DUPLICATE_FRAME_ID` | Two frames share the same id |
| `ARROW_UNKNOWN_SOURCE` | source base id does not exist |
| `ARROW_UNKNOWN_TARGET` | target base id does not exist |
| `ARROW_INVALID_REF` | shorthand/object ref shape is malformed |
| `UNKNOWN_TEMPLATE` | `use` references missing default |
| `INVALID_FRAME_CHILD` | child entry is not a frame mapping |
| `ARROW_SHORTHAND_PARSE` | shorthand string malformed |
| `ROOT_MISSING` | top-level `root` missing or invalid |

## Warning codes (minimum set)

| Code | Condition |
|------|-----------|
| `UNUSED_DEFAULT` | default template never referenced |
| `ORPHAN_LEAF` | leaf frame with zero incident arrows |
| `DUPLICATE_ARROW` | same source+target (+label) repeated |
| `SELF_LOOP_ARROW` | source and target are identical |
| `MERMAID_UNSUPPORTED_*` | property not representable in Mermaid |
| `D2_UNSUPPORTED_*` | property not representable in D2 |

## Lowering: DiagramDocument → FrameDiagram

- `root` → `FrameDiagram.root`
- each `AuthorFrameNode` → `Frame`
- `arrows` → `FrameDiagram.arrows` via `createArrow`, preserving authored `source` / `target` strings
- `defaults` do not appear in `FrameDiagram` — expansion happens pre-lower only

Lowering should be mechanically close to today's `frame-yaml-loader.ts`, not a lossy translation from a second structure.

## Mermaid export model (adapter input: DiagramDocument only)

- Frames → Mermaid nodes or subgraphs depending on whether they have children
- Arrows → `source --> target`
- Multi-line labels → `<br/>`
- Lossy areas: exact padding, sizing, alignment, icon placement, anchor-qualified refs, waypoint geometry

## D2 export model (adapter input: DiagramDocument only)

- Containers → D2 containers
- Leaves → D2 shapes with labels
- Arrows → D2 connections
- Lossy areas: exact padding/alignment, some icon handling, anchor-qualified refs
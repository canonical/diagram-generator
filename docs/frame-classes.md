# Frame classes

This is the testable spec for frame visual treatment. Every rendered
frame must resolve to exactly one of these classes. If a diagram
contains styling that doesn't match one of these classes, it fails
acceptance.

This document is a human-readable mirror of the runtime contract.
Behavioral authority lives in
`packages/layout-engine/src/frame-classes.ts` and
`packages/layout-engine/src/resolve-styles.ts`. If this document drifts
from runtime, runtime wins and this document must be corrected.

Wrapper (`level: 0`) is part of the fixed structural encoding, but it
is not a rendered frame class. It is an invisible layout-only grouping
used to control autolayout without adding box chrome.

## The frame classes

| Class | Level | Heading | Fill | Border | Text | Contains |
|-------|-------|---------|------|--------|------|----------|
| **Section** | 3 | bold | transparent | black 1px | black | panels, leaves |
| **Panel** | 2 | bold | `#F3F3F3` | `#F3F3F3` 1px | black | leaves |
| **Child / leaf** | 1 | regular weight | transparent | black 1px | black | nothing |
| **Annotation** | — | — | transparent | none | `#666666` | nothing |
| **Highlight** | structural level unchanged | unchanged | `#000000` | `#000000` 1px | white | unchanged |

Plus one special case that is not user-authored:

| Class | Trigger | Fill | Border | Text |
|-------|---------|------|--------|------|
| **Separator** | `role: separator` | transparent | none | — |

## Hierarchy rules

- A **section** (level 3) may contain panels (level 2) and leaves
  (level 1). It must not contain another section.
- A **panel** (level 2) may contain leaves (level 1). It must not
  contain another panel (grey-on-grey has no visible boundary).
- A headed non-leaf authored at level 1 is normalized to panel chrome for
  compatibility with arbitrary V3 YAML. The nesting safety rule still demotes
  it inside a panel, where it remains a structural container rather than a
  nested Parent box.
- A **leaf** (level 1) has no headed children.
- An **annotation** has `variant: annotation` or `border: none` and is
  a borderless text label with lighter grey text. It may appear at any
  depth.
- Layout wrappers (headingless containers, `__body`/`__heading`
  synthetics) are invisible and do not count as a tier.

## Choosing the right level

Level assignment is normally an **authoring-time** rule. The engine consumes the
explicit `level:` values it is given and only applies the existing
invalid-nesting downgrade safety net. A diagram may opt into a typed YAML
authoring profile under `meta.frame_roles`; that profile synthesizes explicit
levels during compile before style resolution. It must be generic and tested,
not fixture-keyed.

Let `D` be the maximum structural child-nesting depth across a sibling
group.

- `D = 0` -> child / leaf (`level: 1`)
- `D = 1` -> parent / panel (`level: 2`)
- `D >= 2` -> section (`level: 3`)

Siblings never mix structural tiers. Wrapper (`level: 0`), annotation,
and highlight are exempt from promotion. Highlight changes fill/text
contrast only; it does not change a node's structural level.

The rule ensures visual consistency across a row or column: siblings
never mix classes. If one item needs to be a section, all its siblings
are sections. If one item needs to be a panel, all its siblings are
panels.

## Configured Role Assignment

`meta.frame_roles.strategy: root-edge-source-section-target-parent` is a graph-aware
authoring profile for layered provider/consumer topologies. For root compounds
connected by cross-root arrows, source-side root compounds become sections
(`level: 3`) and target-side root compounds become parents (`level: 2`). Explicit
authored `level:` values still win. This profile exists for diagrams where graph
layers, not plain structural sibling depth, determine visual roles.

**Example:** Planning, Implementation, and Delivery are siblings.
Implementation wraps "Dev team" (a panel wrapping leaves) – 2-level
nesting. Therefore all three are sections, even though Planning and
Delivery only contain leaves directly.

## YAML mapping

The YAML author sets `level:` explicitly on every headed container:

```yaml
- id: my_section
  level: 3
  heading: "Section heading"     # renders bold
  children:
    - id: my_panel
      level: 2
      heading: "Panel heading"   # renders bold
      children:
        - id: my_leaf
          label: [Leaf text]     # renders regular weight
```

Leaves with headings use regular-weight text (not bold). Set `level: 1`
explicitly when a leaf has a heading and you want to be explicit, but
level 1 is the default for any frame without `level:`.

## Validation contract

A diagram is valid if and only if:

1. Structural levels use the fixed encoding:
   `0=wrapper, 1=leaf, 2=panel, 3=section`.
2. No level-3 section contains a level-3 child.
3. No level-2 panel contains a level-2 child.
4. Every resolved frame maps to exactly one class from the table above.
5. No frame uses styling that doesn't match its class (e.g. bold
   heading on a leaf, grey fill without level 2, missing border on a
   panel).

## Stroke width (trace path)

Border width is **not** per-diagram YAML. All framed classes (leaf, panel,
section, highlight) use `spacing.frame-stroke-width` (1px) via
`FRAME_CLASS_DEFS` → `resolve_styles()` → `resolvedStrokeWidth` → layout
inset and SVG `stroke-width`.

## Rendering notes

**Typography invariant.** The renderer must emit the same text contract
that layout measured: same content, same case, same font size, same
feature set, and same letter-spacing.

**Non-frame text overlays.** Any non-frame overlay that semantically acts as an
annotation, including ELK edge labels, must reuse the annotation class contract:
transparent fill, no stroke, `#666666` regular text, and annotation padding/alignment.
Do not introduce local edge-label pills, centered label boxes, or one-off fill/stroke
constants unless they are first added as a frame class and covered by tests.

**Non-container sections.** A level-3 frame with no children (e.g. a
leaf-like box with a bold label) gets section styling: black border,
transparent fill, and the same section-heading typography on the first
label line. Container heading synthesis only applies to headed
containers, so non-container sections apply the section heading token
directly to `frame.label[0]` rather than to a synthetic `__heading`
child.

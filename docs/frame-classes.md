# Frame classes

This is the testable spec for frame visual treatment. Every rendered
frame must resolve to exactly one of these classes. If a diagram
contains styling that doesn't match one of these four, it fails
acceptance.

This document is the sole authored authority for frame-class semantics.
If machine-readable derivatives exist, they are generated artifacts
only and must not be edited as an independent truth source.

## The four classes

| Class | Level | Heading | Fill | Border | Text | Contains |
|-------|-------|---------|------|--------|------|----------|
| **Section** | 3 | true small caps, bold in browser/TS; else bold sentence case | transparent | black 1px | black | panels, leaves |
| **Panel** | 2 | bold | `#F3F3F3` | `#F3F3F3` 1px | black | leaves |
| **Leaf** | 1 | regular weight | transparent | black 1px | black | nothing |
| **Annotation** | — | — | transparent | none | `#666666` | nothing |

Plus two special cases that are not user-authored:

| Class | Trigger | Fill | Border | Text |
|-------|---------|------|--------|------|
| **Highlight** | `variant: highlight` | `#000000` | `#000000` 1px | white |
| **Separator** | `role: separator` | transparent | none | — |

## Hierarchy rules

- A **section** (level 3) may contain panels (level 2) and leaves
  (level 1). It must not contain another section.
- A **panel** (level 2) may contain leaves (level 1). It must not
  contain another panel (grey-on-grey has no visible boundary).
- A **leaf** (level 1) has no headed children.
- An **annotation** has `variant: annotation` or `border: none` and is
  a borderless text label with lighter grey text. It may appear at any
  depth.
- Layout wrappers (headingless containers, `__body`/`__heading`
  synthetics) are invisible and do not count as a tier.

## Choosing the right level

Level assignment follows from the **deepest nesting among siblings**,
not from each item's own children.

1. Start with all items as leaves (level 1).
2. When any item at a given depth has children (introducing 1-level
   nesting), promote **all siblings at that depth** to panel (level 2)
   – including those without children. A childless panel is fine; it's
   a grey card.
3. When any item at a given depth contains a panel that itself contains
   children (2-level nesting), promote **all siblings at that depth**
   to section (level 3) – including those that only wrap leaves
   directly.

The rule ensures visual consistency across a row or column: siblings
never mix classes. If one item needs to be a section, all its siblings
are sections. If one item needs to be a panel, all its siblings are
panels.

**Example:** Planning, Implementation, and Delivery are siblings.
Implementation wraps "Dev team" (a panel wrapping leaves) – 2-level
nesting. Therefore all three are sections, even though Planning and
Delivery only contain leaves directly.

## YAML mapping

The YAML author sets `level:` explicitly on every headed container:

```yaml
- id: my_section
  level: 3
  heading: "Section heading"     # renders true small caps, bold in browser/TS; else bold sentence case
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

1. Every headed container has an explicit `level:` (2 or 3).
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
feature set, same letter-spacing. Faux small caps are forbidden.
Specifically, renderers must not uppercase text or shrink font size to
approximate small caps.

**Fallback rule.** Browser/TS output uses true small caps for section
headings. If another target cannot render true small caps faithfully,
section headings fall back to bold sentence case at the authored
heading size. That is a different typography token, not a "close
enough" implementation of small caps.

**Non-container sections.** A level-3 frame with no children (e.g. a
leaf-like box with a bold label) gets section styling: black border,
transparent fill, and the same section-heading typography on the first
label line. Container heading synthesis only applies to headed
containers, so non-container sections apply the section heading token
directly to `frame.label[0]` rather than to a synthetic `__heading`
child.

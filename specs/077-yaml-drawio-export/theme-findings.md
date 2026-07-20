# Draw.io Theme Findings

## Research Question

Draw.io exports opened from a dark-system editor can render with dark-mode
interpretation unless the file owns its theme behavior. The preferred outcome is
full theme control: the exported `.drawio` should define both light and dark
values for every exporter-owned color, instead of relying on diagrams.net
adaptive heuristics.

## Official Draw.io Behavior

- Draw.io supports adaptive colors for shapes, connectors, text, and page
  background. Adaptive settings are saved on each page.
- Appearance can be Light, Dark, or Automatic. Automatic follows system
  appearance.
- `defaultAdaptiveColors` supports `auto`, `simple`, and `none`.
- `enableLightDarkColors` enables CSS `light-dark(light,dark)` color values.
- Exporting while the editor is in Dark can retain a dark background unless the
  diagram explicitly controls page/background behavior.

Sources:

- https://www.drawio.com/docs/manual/editor/appearance/adaptive-colours/
- https://www.drawio.com/docs/manual/editor/appearance/dark-mode/
- https://www.drawio.com/docs/manual/editor/appearance/dark-mode-design/
- https://www.drawio.com/docs/reference/configure-diagram-editor/

## Decision

Use explicit `light-dark(...)` values and keep `adaptiveColors="none"`.

That makes the exported XML deterministic:

- Draw.io switches the declared light/dark pair.
- The exporter, not diagrams.net automatic adaptation, owns the color choices.
- Light mode remains the canonical white-page diagram.
- Dark mode gets controlled dark page/background/fill values and high-contrast
  text/stroke/icon pairs.

## Implemented Theme Pairs

| Semantic color | Light | Dark |
|----------------|-------|------|
| Page / white fill | `#FFFFFF` | `#1E1E1E` |
| Grey fill | `#F3F3F3` | `#303030` |
| Black text/stroke/highlight | `#000000` | `#F2F2F2` |
| Muted text/icon | `#666666` | `#C9C9C9` |
| Arrow orange | `#E95420` | `#FF7A45` |

Unknown concrete hex colors are wrapped as same-value light/dark pairs so they
remain deterministic without inventing semantics.

## Remaining Manual Verification

Draw.io-owned style fields are covered by XML tests. Embedded SVG icons are data
URI images, not native draw.io shape/text fields. The exporter writes
`light-dark(...)` values into the SVG attributes too, but diagrams.net manual
verification must confirm whether the editor's Light/Dark/Automatic modes honor
those values consistently inside embedded images.

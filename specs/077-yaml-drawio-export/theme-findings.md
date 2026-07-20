# Spec 077 theme findings

## Trigger

Manual diagrams.net verification on 2026-07-19 found that exported `.drawio`
files can follow the viewer/editor's dark system appearance. In that mode, the
diagram may no longer present the intended Canonical light-theme surface.

## Current exporter state

`packages/layout-engine/src/drawio/mxgraph-builder.ts` currently emits:

```xml
background="light-dark(#ffffff, #ffffff)" adaptiveColors="none"
```

This was intended to pin a white page in both modes, but the manual failure means
the editable `.drawio` open path needs proof. Do not close T021 on image-export
evidence alone.

## Official draw.io behaviour to verify

Primary references:

- <https://www.drawio.com/docs/manual/editor/appearance/adaptive-colours/>
- <https://www.drawio.com/docs/manual/editor/appearance/dark-mode/>
- <https://www.drawio.com/docs/manual/editor/appearance/>
- <https://www.drawio.com/blog/dark-mode-diagrams/>

Observed from the docs:

- Appearance can be Light, Dark, or Automatic; Automatic may follow the browser
  or operating system.
- Adaptive colours are saved per diagram page.
- Specific light and dark values can be set for shapes, connectors, text labels,
  and the page background.
- Using the same colour value for light and dark is a supported way to keep that
  colour stable across modes.
- Dark mode may apply a rendering-time colour-intensity transform, so the saved
  XML data alone is not enough unless the chosen attributes/styles are verified
  by reopening the editable `.drawio`.

## Required experiment

1. Export at least one representative ai-infra diagram.
2. Open the `.drawio` in diagrams.net with Appearance set to Light, Dark, and
   Automatic.
3. Inspect Page Setup / Adaptive Colours and save a copy after any manual
   adjustment.
4. Diff the saved XML against the generated XML to identify the exact
   `mxGraphModel` attributes or cell style fields needed.
5. Choose one contract:
   - **Pinned-light**: page background, fills, strokes, text, icons, and arrows
     remain the Canonical light palette in Light, Dark, and Automatic.
   - **Adaptive**: generated XML carries explicit paired light/dark values for
     every semantic colour, preserving contrast without losing brand intent.

## Acceptance

The final exporter change must be in TypeScript owners, covered by focused XML
tests, and manually verified by reopening the generated `.drawio` in diagrams.net
Light, Dark, and Automatic appearance.

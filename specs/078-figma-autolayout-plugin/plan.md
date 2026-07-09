# Plan: Spec 078 Figma autolayout plugin

## Approach

Start with one narrow proof slice rather than a full diagram importer:

1. **Development plugin shell** — add a Figma Design development plugin under
   `apps/figma-plugin/`, borrowing the sibling plugin's manifest and localhost
   patterns but targeting native auto-layout creation instead of FigJam asset
   placement.
2. **Local payload server** — add a tiny localhost server that serves one sample
   semantic leaf payload plus icon assets from this repo so the plugin stays off
   the Figma REST API path.
3. **Leaf mapper** — implement one canonical leaf-node import path in the plugin:
   fixed outer width `192`, `8px` padding, `48x48` icon, wrapped text column,
   top-right icon placement, stable plugin-data tags for future refresh work.
4. **Validation + docs** — document plugin import steps, localhost server usage,
   and the manual Figma verification contract for the linked test file.

## File map

| Path | Role |
|------|------|
| `apps/figma-plugin/manifest.json` | Development plugin manifest for Figma Design |
| `apps/figma-plugin/src/code.ts` | TS plugin runtime that fetches payload and builds native auto-layout |
| `apps/figma-plugin/ui.html` | Minimal UI for sample import and status reporting |
| `apps/figma-plugin/dev-data/sample-leaf.yaml` | Canonical sample fixture for US1, compiled through the layout engine |
| `apps/figma-plugin/README.md` | Import and validation instructions |
| `apps/figma-plugin/src/dev-server.ts` | Tiny localhost server for payload + icon assets |
| `package.json` | Root script entry for the local plugin server |

## Validation

- `node scripts/serve-figma-plugin-dev.mjs`
- Import `apps/figma-plugin/manifest.json` into Figma as a development plugin
- Run the sample import in the linked test file
- Confirm the inserted node is native auto-layout and matches:
  - width `192`
  - padding `8/8/8/8`
  - icon `48x48`
  - wrapped text column
  - minimum visual height `64`

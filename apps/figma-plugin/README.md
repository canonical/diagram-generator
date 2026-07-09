# Figma Autolayout Plugin

This is a local-development Figma Design plugin for spec 078.

Current scope:

- inserts one canonical leaf node as native Figma auto-layout
- imports the `ai-infra-telecom-services-stack` frame diagram as nested native
  Figma auto-layout frames
- derives both payloads from repo YAML through the local layout engine
- fetches computed payloads and icon SVG bytes from `http://localhost:3846`
- refreshes the same imported node or diagram root in place when rerun

## Run

1. Start the local server:

   ```powershell
   npm run figma-plugin:serve
   ```

2. Build the plugin runtime:

   ```powershell
   npm run figma-plugin:build
   ```

3. In Figma Desktop, import this folder's [manifest.json](./manifest.json) as a
   development plugin.
4. Open the linked test file and run either:
   - `Insert sample leaf node`
   - `Import AI-driven telecom services diagram`

## What to verify

- the sample leaf stays `192` wide with `8` padding and a `48x48` icon
- the telecom diagram imports as nested auto-layout frames rather than SVG
- section/panel wrappers preserve padding, gaps, and heading/body separation
- rerunning the same import refreshes the existing imported root in place

## Notes

- The plugin depends on the local dev server staying reachable from Figma
  Desktop.
- If you change plugin code, rebuild and reload the development plugin in
  Figma before retesting.

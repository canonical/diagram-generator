# Figma Import Plugin

This is a local-development Figma Design plugin for specs 078 and 079.

Current scope:

- imports a user-selected frame YAML file
- when a `box` component set is present in the Figma file, maps semantic boxes
  to its `Role=Child`, `Role=Parent`, and `Role=Section` variants
- inserts generated horizontal/vertical auto-layout slot containers for nested
  component children
- falls back to nested native Figma auto-layout frames only when no `box`
  component set is available
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
4. Open the linked test file, run `Select YAML to import`, and choose a
   `.yaml` or `.yml` frame diagram file.

## What to verify

- the selected diagram imports as component instances when the file contains
  the `box` component set
- section/panel wrappers preserve padding, gaps, and heading/body separation
- copied icon assets in the current Figma file are matched by stable names such
  as `Gateway.svg`, including when nested inside frames/folders
- rerunning the same import refreshes the existing imported root in place
- browser-saved YAML overrides are reflected after selecting the saved YAML file

## Notes

- The plugin depends on the local dev server staying reachable from Figma
  Desktop.
- Component-mode icon matching searches the current Figma file outside the
  `box` component set for matching icon components or `.svg`-named cloneable
  icon nodes. Missing or unapplied YAML icons fail the import; they are not
  silently redrawn as raw SVG fallback.
- If you change plugin code, rebuild and reload the development plugin in
  Figma before retesting.

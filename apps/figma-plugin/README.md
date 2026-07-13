# Figma Import Plugin

This is a local-development Figma Design plugin for specs 078 and 079.

Current scope:

- imports a user-selected frame YAML file
- when a `box` component set is present anywhere in the Figma file, maps
  semantic boxes to its `Role=Child`, `Role=Parent`, and `Role=Section`
  variants
- inserts generated horizontal/vertical auto-layout slot containers for nested
  component children into real Figma `SLOT` nodes
- inserts matched copied icons into real icon `SLOT` nodes on the mapped
  component instances
- sets title/helper text and helper/icon visibility only through exposed Figma
  component properties; it does not edit ordinary instance text/icon sublayers
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
- the `box` variants expose component-property references for title text,
  helper/body text, helper visibility, and icon visibility; missing properties
  fail component mode with a contract error
- mapped boxes remain component instances; the importer must not detach them or
  replace ordinary instance sublayers
- rerunning the same import refreshes the existing imported root in place
- browser-saved YAML overrides are reflected after selecting the saved YAML file

## Notes

- The plugin depends on the local dev server staying reachable from Figma
  Desktop.
- Component-mode icon matching loads/searches all pages in the current Figma
  file outside the `box` component set for matching icon components or
  `.svg`-named cloneable icon nodes. Matching icons are inserted into icon
  `SLOT` nodes. Missing or unapplied YAML icons fail the import; they are not
  silently redrawn as raw SVG fallback.
- Component mode discovers slots on the master `box` component and addresses
  the corresponding live instance slots by stable instance-sublayer id. It does
  not recursively traverse live component instances to find slots.
- If you change plugin code, rebuild and reload the development plugin in
  Figma before retesting.

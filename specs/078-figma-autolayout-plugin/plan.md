# Plan: Spec 078 Figma autolayout plugin

## Approach

The initial proof slice is complete enough to expose the next real problem:
Figma reconstruction fidelity for full diagrams. The plan now has two layers:
keep the sample leaf path working, then harden full-diagram import around
engine-owned payload semantics and authored auto-layout metadata.

1. **Development plugin shell** — maintain the Figma Design development plugin under
   `apps/figma-plugin/`, borrowing the sibling plugin's manifest and localhost
   patterns but targeting native auto-layout creation instead of FigJam asset
   placement.
2. **Local payload server** — keep the localhost server as the single payload
   source for both:
   - canonical sample leaf import
   - generic frame-diagram import by slug from `scripts/diagrams/frames/*.yaml`
3. **Leaf mapper** — preserve the canonical leaf contract as the smallest known
   good semantic box:
   - fixed outer width `192`
   - `8px` padding
   - `48x48` icon
   - wrapped text column
   - stable plugin-data tags
4. **Payload contract hardening** — keep the payload server attached to
   layout-engine-owned semantics for:
   - synthetic heading/body reconstruction
   - semantic kind classification
   - shared token usage
5. **Effective sizing parity** — read preview-editor/YAML auto-layout metadata
   (`sizing_w`, `sizing_h`, `direction`, `position`) from the current authored
   source, then translate it through the layout engine's effective layout result
   before Figma import:
   - consume `layoutFrameTree(...).coerced` so primary-axis HUG/FILL
     coercions become `FIXED` at measured size in the payload
   - downgrade any remaining Figma-illegal cross-axis `FILL` under a `HUG`
     parent to `FIXED` at placed size
   - serialize measured body-frame geometry when a synthetic body frame becomes
     fixed
   - make `layoutSizingHorizontal` / `layoutSizingVertical` the authoritative
     nested-frame sizing path
   - avoid pre-sizing non-`FIXED` axes before parent attachment
   - warn when real Figma rejects a requested sizing assignment
6. **Boxes-first verification** — validate full telecom hierarchy parity before
   chasing perfect text/icon polish. Missing boxes remain a higher-priority
   defect than typography drift.
7. **Validation + docs** — document plugin import steps, localhost server usage,
   and the manual Figma/MCP verification contract for the linked test file.

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
| `scripts/diagrams/frames/*.yaml` | Real frame-YAML slugs served by the local payload server |

## Validation

- `npm run figma-plugin:serve`
- `npm run figma-plugin:build`
- Import `apps/figma-plugin/manifest.json` into Figma as a development plugin
- Run the sample leaf import in the linked test file
- Confirm the inserted sample node is native auto-layout and matches:
  - width `192`
  - padding `8/8/8/8`
  - icon `48x48`
  - wrapped text column
  - minimum visual height `64`
- Run the telecom diagram import
- Confirm via Figma or MCP:
  - root matches payload width/height
  - no expected semantic box is missing
  - section/panel padding remains visible
  - nested node sizing/positioning follows effective payload metadata
  - no serialized node asks Figma for `FILL` under a `HUG` parent on either axis

## Closeout State

The live Figma sizing blocker is resolved. The closeout state is:

1. serve a known-fresh local payload that consumes `layoutFrameTree` coercions
2. apply the translated nested sizing through Figma's `layoutSizing*` API
3. fail import when Figma readback disagrees with the effective payload
4. record user/Opus confirmation and repo-owned regression coverage before
   adversarial review

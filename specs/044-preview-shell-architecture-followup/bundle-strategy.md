# Preview Bundle Strategy

Baseline and first target boundaries for spec 044.

## Baseline

- Browser payload file: `packages/layout-engine/dist/layout-engine.iife.js`
- Current size: 3,961,907 bytes
- Current shape: one browser IIFE carrying core runtime, preview shell, bridge helpers, and engine/browser exports together

## Constraints

1. The standalone repo must stay easy to run locally.
2. The shell is output-only; no compatibility panes should drive bundle shape.
3. Bundle work must not force a one-shot browser rewrite.
4. Spec 038 seams must remain intact.

## Target boundaries

### Bundle A — core runtime

Contents:

- frame model
- layout/text/tokens/style runtime
- serialization primitives
- shared engine-neutral runtime helpers

Consumers:

- `previewBridge`
- render/export paths
- engine adapters

### Bundle B — preview shell host

Contents:

- output-only preview shell helpers
- inspector, interaction, grid/tree/constraint UI helpers
- bootstrap/save/nav/SSE shell services

Consumers:

- `editor.js`

### Bundle C — local preview bridge

Contents:

- local relayout bridge bootstrap
- override normalization
- fresh rerender path
- SVG patch/render bridge helpers that are still browser-side

Consumers:

- `layout-bridge.js`

### Bundle D — engine/browser adapters

Contents:

- ELK browser controller/debug helpers
- future engine-owned browser adapters

Consumers:

- generic shell engine hook path

## First safe split points

1. Separate ELK debug/raw-view helpers from the core local-relayout bridge path.
2. Stop making `browser-entry.ts` the only browser entry surface; introduce concern-owned entry surfaces before physical splitting.
3. Treat `layout-bridge.js` helpers as bridge-owned even before they move files; ownership has to become explicit before bundling can improve.

## Success markers

1. Browser consumers stop importing behavior through one flat entry bag.
2. Engine/browser helpers become optional by concern rather than always resident.
3. `layout-bridge.js` can consume a bridge entry surface without paying for full preview-shell host exports.

## What not to do

- Do not split by arbitrary byte targets alone.
- Do not create a second monolithic browser entry file that just renames the problem.
- Do not pull shell code back into 043 to make the bundle strategy “easier”.

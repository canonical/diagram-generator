# Text Edit Flow

Pipeline:

1. YAML frame text is authored as `heading` and/or `label` in `scripts/diagrams/frames/*.yaml`
2. Layout engine resolves frame-owned text blocks in `packages/layout-engine/src/resolved-spec-typography.ts`
3. SVG render emits one `<text>` per semantic block in `packages/layout-engine/src/svg-render.ts`
4. Preview relayout rebuilds matching DOM text blocks in `scripts/preview/layout-bridge.js`
5. Double-click hit-testing in `scripts/preview/editor.js` targets the clicked text block
6. Inline edit writes back to preview overrides as `text.heading` or `text.label`
7. Save persists those overrides back into YAML via `apps/preview/src/persistence/frame-diagram.ts`

Key files:

- `packages/layout-engine/src/resolved-spec-typography.ts`
- `packages/layout-engine/src/svg-render.ts`
- `scripts/preview/layout-bridge.js`
- `scripts/preview/editor.js`
- `apps/preview/src/persistence/frame-diagram.ts`

Tests to run:

- `npm --prefix packages/layout-engine test -- resolved-spec-typography.test.ts`
- `npm --prefix packages/layout-engine test -- arrow-render.test.ts`
- `npm --prefix packages/layout-engine test`
- `npm --prefix apps/preview test`
- `node scripts/check_no_new_python.mjs`

Known limits:

- Preview text editing is still browser-script code, not a typed module with DOM unit tests.
- Render metadata identifies semantic blocks, but there is still no rich text or per-line semantic editing.
- Selection/depth logic remains component-first for non-text interactions; only text editing now short-circuits to block targeting.

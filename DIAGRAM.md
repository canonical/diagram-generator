# Diagram rules

Thin index for the current TS renderer contract. Do not restate the
frame-class table or level-promotion rule here.

Runtime authority:

- `packages/layout-engine/src/tokens.ts`
- `packages/layout-engine/src/frame-classes.ts`
- `packages/layout-engine/src/resolve-styles.ts`
- `packages/layout-engine/src/svg-render.ts`

Authoring and reference sources:

- `docs/frame-classes.md`
- `.github/skills/level-assignment/SKILL.md`

## Core values

- 8px grid
- 24px structural gutter
- 18px text with 24px line step
- 192px default box width
- 48px icon
- 64px minimum height for bordered leaves

## Box anatomy

- Text: top-left, left-aligned
- Icon: top-right, `48x48`
- No centered labels
- No icon-above-text variants

## Arrows

- Orange `#E95420` only
- 1px shaft with filled head
- Orthogonal routing
- Keep arrows out of box fills and box borders

## Authoring

- Author diagrams in `diagrams/1.input/*.yaml`
- Keep styling semantic: `level`, `variant`, structure, spacing
- Do not encode renderer behavior in ad hoc prose or token catalogs
- For the fixed `level:` encoding, frame-class table, and sibling-promotion
  rule, read `docs/frame-classes.md`.
- For the authoring workflow that applies those levels in YAML, read
  `.github/skills/level-assignment/SKILL.md`.

## Verify

```bash
npm --prefix packages/layout-engine test
npm run preview
```

Default: tests + preview URL. **Do not take Playwright or browser screenshots unless the user explicitly asks.** If they ask, crop to the diagram region (not full viewport).

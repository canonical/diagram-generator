# Implementation Plan: Text-block inline editing for preview

**Branch**: `feat/041-text-block-inline-editing` | **Date**: 2026-06-13 | **Spec**: [spec.md](spec.md)

## Goal

Align preview interaction with render semantics so text editing targets a specific rendered text block rather than a whole component.

## Design

### 1. Promote text blocks to a render contract

- Add stable metadata to each frame-owned `<text>` block during SVG render.
- Reuse the same role mapping in the browser patcher so initial render and relayout stay consistent.

### 2. Switch interaction from component-scoped to block-scoped

- Detect a text block directly from the double-click target.
- Start inline editing for that one block only.
- Keep non-clicked blocks rendered and visible.

### 3. Preserve semantic ownership on commit

- Heading edit updates only `text.heading`.
- Body edit updates only `text.label`.
- Merge with any existing text override rather than replacing the whole text override object blindly.

### 4. Make the editor surface theme-safe

- Use the frame fill as the base editor surface when available.
- Preserve rendered text color and caret contrast.

## Files

- `packages/layout-engine/src/resolved-spec-typography.ts`
- `packages/layout-engine/src/svg-render.ts`
- `packages/layout-engine/src/index.ts`
- `packages/layout-engine/src/browser-entry.ts`
- `scripts/preview/layout-bridge.js`
- `scripts/preview/editor.js`
- `scripts/preview/editor.css`
- `packages/layout-engine/tests/*.test.ts`

## Validation

- `npm --prefix packages/layout-engine test -- resolved-spec-typography.test.ts`
- `npm --prefix packages/layout-engine test -- arrow-render.test.ts`
- `npm --prefix packages/layout-engine test`
- `npm --prefix packages/layout-engine run build:browser`
- `npm --prefix apps/preview test`
- `node scripts/check_no_new_python.mjs`

## Risks

- Preview interaction still lives in a large browser script; regressions can hide in selection/depth behavior.
- Render metadata must stay in sync between server-rendered SVG and browser relayout patches.
- Browser-only behavior lacks a dedicated DOM test harness, so contract tests must be selective and high-value.


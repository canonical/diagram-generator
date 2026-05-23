import { describe, it, expect, vi } from 'vitest';
import { CanvasTextAdapter } from '../src/canvas-text-adapter.js';

// ---------------------------------------------------------------------------
// Minimal mock for CanvasRenderingContext2D — just enough to test the adapter
// without a real DOM.  We inject it via the `ctx` constructor option.
// ---------------------------------------------------------------------------

function createMockCtx(measureReturn = 42) {
  return {
    font: '',
    measureText: vi.fn(() => ({ width: measureReturn })),
  } as unknown as CanvasRenderingContext2D;
}

describe('CanvasTextAdapter', () => {
  it('sets the font string and calls measureText', () => {
    const ctx = createMockCtx(99.5);
    const adapter = new CanvasTextAdapter({ ctx });

    const w = adapter.measureTextWidth('Hello world', 18);

    expect(ctx.font).toBe("400 18px 'Ubuntu Sans', sans-serif");
    expect(ctx.measureText).toHaveBeenCalledWith('Hello world');
    expect(w).toBe(99.5);
  });

  it('uses custom font family and weight', () => {
    const ctx = createMockCtx(50);
    const adapter = new CanvasTextAdapter({
      ctx,
      fontFamily: "'Courier New', monospace",
      weight: 700,
    });

    adapter.measureTextWidth('test', 24);

    expect(ctx.font).toBe("700 24px 'Courier New', monospace");
  });

  it('defaults to weight 400 and Ubuntu Sans', () => {
    const ctx = createMockCtx(10);
    const adapter = new CanvasTextAdapter({ ctx });

    adapter.measureTextWidth('x', 12);

    expect(ctx.font).toBe("400 12px 'Ubuntu Sans', sans-serif");
  });

  it('handles empty string', () => {
    const ctx = createMockCtx(0);
    const adapter = new CanvasTextAdapter({ ctx });

    const w = adapter.measureTextWidth('', 18);

    expect(ctx.measureText).toHaveBeenCalledWith('');
    expect(w).toBe(0);
  });

  it('works with the TextMeasureAdapter interface', () => {
    // Verify structural compatibility — the adapter satisfies the interface
    const ctx = createMockCtx(100);
    const adapter = new CanvasTextAdapter({ ctx });

    // The layout engine passes (text, fontSize) — confirm it works
    const width: number = adapter.measureTextWidth('Layout engine call', 14);
    expect(typeof width).toBe('number');
    expect(width).toBe(100);
  });

  it('varies font string per call when fontSize changes', () => {
    const ctx = createMockCtx(0);
    const adapter = new CanvasTextAdapter({ ctx });

    adapter.measureTextWidth('a', 12);
    expect(ctx.font).toBe("400 12px 'Ubuntu Sans', sans-serif");

    adapter.measureTextWidth('a', 24);
    expect(ctx.font).toBe("400 24px 'Ubuntu Sans', sans-serif");

    adapter.measureTextWidth('a', 18);
    expect(ctx.font).toBe("400 18px 'Ubuntu Sans', sans-serif");
  });
});

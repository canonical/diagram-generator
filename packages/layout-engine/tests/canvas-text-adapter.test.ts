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

    const w = adapter.measureTextWidth({ text: 'Hello world', fontSize: 18 });

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

    adapter.measureTextWidth({ text: 'test', fontSize: 24 });

    expect(ctx.font).toBe("700 24px 'Courier New', monospace");
  });

  it('defaults to weight 400 and Ubuntu Sans', () => {
    const ctx = createMockCtx(10);
    const adapter = new CanvasTextAdapter({ ctx });

    adapter.measureTextWidth({ text: 'x', fontSize: 12 });

    expect(ctx.font).toBe("400 12px 'Ubuntu Sans', sans-serif");
  });

  it('handles empty string', () => {
    const ctx = createMockCtx(0);
    const adapter = new CanvasTextAdapter({ ctx });

    const w = adapter.measureTextWidth({ text: '', fontSize: 18 });

    expect(ctx.measureText).toHaveBeenCalledWith('');
    expect(w).toBe(0);
  });

  it('works with the TextMeasureAdapter interface', () => {
    // Verify structural compatibility — the adapter satisfies the interface
    const ctx = createMockCtx(100);
    const adapter = new CanvasTextAdapter({ ctx });

    const width: number = adapter.measureTextWidth({ text: 'Layout engine call', fontSize: 14 });
    expect(typeof width).toBe('number');
    expect(width).toBe(100);
    expect(adapter.measurementBackend).toBe('canvas');
  });

  it('varies font string per call when fontSize changes', () => {
    const ctx = createMockCtx(0);
    const adapter = new CanvasTextAdapter({ ctx });

    adapter.measureTextWidth({ text: 'a', fontSize: 12 });
    expect(ctx.font).toBe("400 12px 'Ubuntu Sans', sans-serif");

    adapter.measureTextWidth({ text: 'a', fontSize: 24 });
    expect(ctx.font).toBe("400 24px 'Ubuntu Sans', sans-serif");

    adapter.measureTextWidth({ text: 'a', fontSize: 18 });
    expect(ctx.font).toBe("400 18px 'Ubuntu Sans', sans-serif");
  });

  it('uses per-call weight when provided', () => {
    const ctx = createMockCtx(50);
    const adapter = new CanvasTextAdapter({ ctx, weight: 400 });

    adapter.measureTextWidth({ text: 'bold text', fontSize: 18, weight: 700 });
    expect(ctx.font).toBe("700 18px 'Ubuntu Sans', sans-serif");
  });

  it('falls back to construction weight when per-call weight is omitted', () => {
    const ctx = createMockCtx(50);
    const adapter = new CanvasTextAdapter({ ctx, weight: 600 });

    adapter.measureTextWidth({ text: 'semi-bold', fontSize: 18 });
    expect(ctx.font).toBe("600 18px 'Ubuntu Sans', sans-serif");
  });

  it('includes explicit letter spacing in measured width', () => {
    const ctx = createMockCtx(20);
    const adapter = new CanvasTextAdapter({ ctx });

    const width = adapter.measureTextWidth({
      text: 'TEST',
      fontSize: 10,
      letterSpacing: '0.1em',
    });

    expect(width).toBeCloseTo(23, 6);
  });
});

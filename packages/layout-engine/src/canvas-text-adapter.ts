/// <reference lib="dom" />

/**
 * Browser Canvas text measurement adapter.
 *
 * Uses Canvas.measureText() with Ubuntu Sans Variable for real glyph-width
 * measurement in the browser.  Mirrors the measurement pattern already used
 * in editor.js but packaged as a TextMeasureAdapter for the layout engine.
 *
 * The font must be loaded (via CSS @font-face or the FontFace API) before
 * measurements are accurate.  Call `await adapter.ensureFontsReady()` once
 * after construction, or rely on the page's own font-loading guarantee.
 */

import type { TextMeasureAdapter } from './text-measure.js';

export interface CanvasTextAdapterOptions {
  /** CSS font-family string.  Default: `"'Ubuntu Sans', sans-serif"`. */
  fontFamily?: string;
  /** Font weight for measurement.  Default: `400`. */
  weight?: number;
  /** Provide an existing 2D context to reuse.  Otherwise one is created. */
  ctx?: CanvasRenderingContext2D;
}

export class CanvasTextAdapter implements TextMeasureAdapter {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly fontFamily: string;
  private readonly weight: number;

  constructor(options?: CanvasTextAdapterOptions) {
    this.fontFamily = options?.fontFamily ?? "'Ubuntu Sans', sans-serif";
    this.weight = options?.weight ?? 400;

    if (options?.ctx) {
      this.ctx = options.ctx;
    } else {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context not available');
      }
      this.ctx = ctx;
    }
  }

  measureTextWidth(text: string, fontSize: number): number {
    this.ctx.font = `${this.weight} ${fontSize}px ${this.fontFamily}`;
    return this.ctx.measureText(text).width;
  }

  /**
   * Wait for the configured font family to finish loading.
   * Call once after construction to guarantee accurate measurements.
   * Safe to call multiple times or skip if the page already loads fonts.
   */
  async ensureFontsReady(): Promise<void> {
    await document.fonts.ready;
  }
}

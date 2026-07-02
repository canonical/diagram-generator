import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  fitPreviewRenderNodeSvg,
  mountPreviewRenderNode,
} from '../src/preview-shell/preview-render-node.js';

function createFitSvgHarness() {
  const attributes: Record<string, string> = {};
  const backgroundAttributes: Record<string, string> = {};
  const background = {
    setAttribute(name: string, value: string) {
      backgroundAttributes[name] = value;
    },
  };
  const styledLayer = {
    getBBox() {
      return {
        x: 12.2,
        y: 18.7,
        width: 100.4,
        height: 40.1,
      };
    },
  };
  const svg = {
    querySelector(selector: string) {
      if (selector === '#dg-styled-layer') {
        return styledLayer;
      }
      if (selector === ':scope > rect:first-of-type') {
        return background;
      }
      return null;
    },
    setAttribute(name: string, value: string) {
      attributes[name] = value;
    },
    getAttribute(name: string) {
      return attributes[name] ?? null;
    },
  };
  return {
    svg,
    attributes,
    backgroundAttributes,
  };
}

function listSourceFiles(rootDir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const nextPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(nextPath));
      continue;
    }
    if (entry.isFile() && nextPath.endsWith('.ts')) {
      files.push(nextPath);
    }
  }
  return files.sort();
}

describe('preview render node', () => {
  it('mounts a fitted stage and refreshes the scene', () => {
    const orderedCalls: string[] = [];

    const mounted = mountPreviewRenderNode({
      stage: {
        replaceChildren(child: { tagName?: string }) {
          orderedCalls.push(`replace:${child.tagName ?? 'svg'}`);
        },
      },
      renderResult: {
        svg: { tagName: 'svg' },
        width: 640,
        height: 480,
      },
      fitSvgToContent: ({ minWidth, minHeight }) => {
        orderedCalls.push(`fit:${minWidth}x${minHeight}`);
      },
      refreshScene: () => {
        orderedCalls.push('refreshScene');
      },
    });

    expect(mounted).toBe(true);
    expect(orderedCalls).toEqual([
      'fit:640x480',
      'replace:svg',
      'refreshScene',
    ]);
  });

  it('is a no-op when the stage is missing', () => {
    const mounted = mountPreviewRenderNode({
      stage: null,
      renderResult: {
        svg: { tagName: 'svg' },
        width: 320,
        height: 200,
      },
      fitSvgToContent: () => {
        throw new Error('fit should not run without a stage');
      },
      refreshScene: () => {
        throw new Error('refresh should not run without a stage');
      },
    });

    expect(mounted).toBe(false);
  });

  it('keeps fitted viewBox idempotent across repeated fit calls', () => {
    const harness = createFitSvgHarness();

    const first = fitPreviewRenderNodeSvg({
      svg: harness.svg as never,
      minWidth: 90,
      minHeight: 50,
    });
    const firstViewBox = harness.attributes.viewBox;
    const firstWidth = harness.attributes.width;
    const firstHeight = harness.attributes.height;

    const second = fitPreviewRenderNodeSvg({
      svg: harness.svg as never,
      minWidth: 90,
      minHeight: 50,
    });

    expect(first).toEqual(second);
    expect(harness.attributes.viewBox).toBe(firstViewBox);
    expect(harness.attributes.width).toBe(firstWidth);
    expect(harness.attributes.height).toBe(firstHeight);
    expect(harness.backgroundAttributes.width).toBe(firstWidth);
    expect(harness.backgroundAttributes.height).toBe(firstHeight);
  });

  it('keeps stage replaceChildren ownership inside the render node across preview-shell source', () => {
    const repoRoot = path.resolve(import.meta.dirname, '..');
    const previewShellRoot = path.join(repoRoot, 'src', 'preview-shell');
    const stageMountPattern = /\b(?:stage|options\.stage)\.replaceChildren\(/;
    const offenders = listSourceFiles(previewShellRoot)
      .filter((sourceFile) => !sourceFile.endsWith(path.join('preview-shell', 'preview-render-node.ts')))
      .filter((sourceFile) => stageMountPattern.test(fs.readFileSync(sourceFile, 'utf8')))
      .map((sourceFile) => path.relative(repoRoot, sourceFile).replace(/\\/g, '/'));

    expect(offenders).toEqual([]);

    const renderNodeSource = fs.readFileSync(
      path.join(repoRoot, 'src', 'preview-shell', 'preview-render-node.ts'),
      'utf8',
    );
    expect(renderNodeSource).toContain('options.stage.replaceChildren(options.renderResult.svg);');
  });
});

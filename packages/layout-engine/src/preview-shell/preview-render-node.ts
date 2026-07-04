import {
  fitPreviewSvgToRenderedContent,
  type FitPreviewSvgToRenderedContentOptions,
} from './app-frame-svg.js';

export interface PreviewRenderNodeRenderResult<TSvg = unknown> {
  svg: TSvg;
  width: number;
  height: number;
}

export interface PreviewRenderNodeStageLike<TSvg = unknown> {
  replaceChildren: (...children: TSvg[]) => void;
}

export interface PreviewRenderNodeFitOptions<TSvg = unknown> {
  svg: TSvg;
  minWidth: number;
  minHeight: number;
}

export interface MountPreviewRenderNodeOptions<TSvg = unknown> {
  stage?: PreviewRenderNodeStageLike<TSvg> | null;
  renderResult: PreviewRenderNodeRenderResult<TSvg>;
  fitSvgToContent: (options: PreviewRenderNodeFitOptions<TSvg>) => unknown;
  refreshScene?: (() => void) | null;
}

export function fitPreviewRenderNodeSvg(
  options: FitPreviewSvgToRenderedContentOptions,
): ReturnType<typeof fitPreviewSvgToRenderedContent> {
  return fitPreviewSvgToRenderedContent(options);
}

export function mountPreviewRenderNode<TSvg = unknown>(
  options: MountPreviewRenderNodeOptions<TSvg>,
): boolean {
  if (!options.stage) {
    return false;
  }

  // Fit after the node is mounted so browser geometry includes the live stage
  // context; detached SVG fitting can under-measure right/bottom canvas padding.
  options.stage.replaceChildren(options.renderResult.svg);
  options.fitSvgToContent({
    svg: options.renderResult.svg,
    minWidth: options.renderResult.width,
    minHeight: options.renderResult.height,
  });
  options.refreshScene?.();
  return true;
}

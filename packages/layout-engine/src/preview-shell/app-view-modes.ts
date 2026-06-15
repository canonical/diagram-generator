/**
 * Preview input/output mode helpers (spec 043 shell coordinator slice I).
 *
 * These helpers own the lightweight split-view tab behavior so editor.js no
 * longer keeps an inline IIFE for preview mode state.
 */

export type PreviewViewMode = 'input' | 'output' | 'both';
export type PreviewSplitDirection = 'vertical' | 'horizontal';

export interface PreviewViewModesInitOptions {
  document: Document;
  slug: string;
  hasReference: boolean;
}

export function normalizePreviewViewMode(
  value: string | null | undefined,
): PreviewViewMode {
  return value === 'input' || value === 'both' || value === 'output'
    ? value
    : 'output';
}

export function normalizePreviewSplitDirection(
  value: string | null | undefined,
): PreviewSplitDirection {
  return value === 'horizontal' ? 'horizontal' : 'vertical';
}

export function applyPreviewViewModeState(
  stageShell: HTMLElement,
  tabs: Element[],
  mode: string | null | undefined,
): PreviewViewMode {
  const nextMode = normalizePreviewViewMode(mode);
  stageShell.dataset.viewMode = nextMode;
  tabs.forEach((tab) => {
    const isActive = tab instanceof HTMLElement && tab.dataset.viewMode === nextMode;
    tab.setAttribute('aria-selected', String(isActive));
    (tab as HTMLElement).tabIndex = isActive ? 0 : -1;
  });
  return nextMode;
}

export function applyPreviewSplitDirectionState(
  stageShell: HTMLElement,
  splitToggle: HTMLElement,
  direction: string | null | undefined,
): PreviewSplitDirection {
  const nextDirection = normalizePreviewSplitDirection(direction);
  const ariaLabel = nextDirection === 'horizontal'
    ? 'Switch to vertical split'
    : 'Switch to horizontal split';
  stageShell.dataset.splitDirection = nextDirection;
  splitToggle.setAttribute('aria-label', ariaLabel);
  splitToggle.title = ariaLabel;
  return nextDirection;
}

export function applyPreviewReferenceImageState(
  image: HTMLImageElement,
  slug: string,
  hasReference: boolean,
): void {
  if (hasReference) {
    image.src = `/reference/${slug}`;
    return;
  }

  image.alt = 'No reference sketch available';
  image.removeAttribute('src');
  const wrap = image.closest('.dg-reference-img-wrap');
  if (wrap) {
    wrap.innerHTML = '<p class="dg-empty-message">No reference sketch for this diagram.</p>';
  }
}

function isHTMLElement(value: Element | null): value is HTMLElement {
  return value instanceof HTMLElement;
}

function isHtmlImageElement(value: Element | null): value is HTMLImageElement {
  return value instanceof HTMLImageElement;
}

export function initPreviewViewModes(options: PreviewViewModesInitOptions): void {
  const stageShell = options.document.getElementById('stage-shell');
  const stageLayout = options.document.getElementById('stage-layout');
  const viewControls = options.document.getElementById('view-controls');
  const inputPane = options.document.getElementById('input-pane');
  const outputPane = options.document.getElementById('output-pane');
  const image = options.document.getElementById('reference-img');
  const tabs = Array.from(options.document.querySelectorAll('.dg-view-tab'));

  if (
    !isHTMLElement(stageShell)
    || !stageLayout
    || !viewControls
    || !inputPane
    || !outputPane
    || !isHtmlImageElement(image)
    || tabs.length === 0
  ) {
    return;
  }

  let preferredSplitDirection: PreviewSplitDirection = 'vertical';
  let preferredViewMode: PreviewViewMode = 'output';

  void stageLayout;
  void inputPane;
  void outputPane;

  viewControls.hidden = false;
  applyPreviewReferenceImageState(image, options.slug, options.hasReference);

  const splitToggle = options.document.getElementById('split-toggle');
  const setViewModeWithToggle = (mode: string | null | undefined) => {
    preferredViewMode = applyPreviewViewModeState(stageShell, tabs, mode);
    if (splitToggle instanceof HTMLElement) {
      splitToggle.style.display = preferredViewMode === 'both' ? '' : 'none';
    }
  };

  if (splitToggle instanceof HTMLElement) {
    splitToggle.addEventListener('click', () => {
      preferredSplitDirection = applyPreviewSplitDirectionState(
        stageShell,
        splitToggle,
        preferredSplitDirection === 'horizontal' ? 'vertical' : 'horizontal',
      );
    });
    preferredSplitDirection = applyPreviewSplitDirectionState(
      stageShell,
      splitToggle,
      preferredSplitDirection,
    );
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const mode = tab instanceof HTMLElement ? tab.dataset.viewMode : null;
      setViewModeWithToggle(mode);
    });
  });

  setViewModeWithToggle(preferredViewMode);
}

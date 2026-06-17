/**
 * Preview shell resize helpers (spec 043 shell coordinator slice A).
 *
 * These helpers own the shared width persistence and resize-handle wiring for
 * the preview shell while the legacy browser script remains a thin DOM
 * bootstrapper.
 */

export interface PreviewShellResizeBindingOptions {
  application: HTMLElement;
  handle: HTMLElement;
  resizingClass: string;
  storageKey: string;
  widthProperty: string;
  legacyWidthProperty: string;
  minWidthProperty: string;
  maxWidthProperty: string;
  fallbackWidth: string;
  fallbackMinWidth: string;
  fallbackMaxWidth: string;
  isEnabled: () => boolean;
  measureWidth: () => number;
  pointerWidthFromEvent: (shellRect: DOMRect, moveEvent: PointerEvent) => number;
  ariaLabel: string;
}

export interface PreviewShellResizeBindingsInitOptions {
  application: Element | null;
  navigation?: Element | null;
  navigationHandle?: Element | null;
  aside?: Element | null;
  asideHandle?: Element | null;
  desktopMedia?: MediaQueryList | null;
}

const volatileShellWidthState = new Map<string, string>();

function isHtmlElement(value: Element | null | undefined): value is HTMLElement {
  return typeof HTMLElement !== 'undefined' && value instanceof HTMLElement;
}

function getElementWindow(element: HTMLElement): Window {
  return element.ownerDocument.defaultView ?? window;
}

function getElementComputedStyle(element: HTMLElement): CSSStyleDeclaration {
  return getElementWindow(element).getComputedStyle(element);
}

export function resolvePreviewShellCssLengthPx(
  context: HTMLElement,
  cssValue: string | null | undefined,
  fallbackPx: number,
): number {
  const trimmedValue = typeof cssValue === 'string' ? cssValue.trim() : '';
  if (!trimmedValue) {
    return fallbackPx;
  }

  const probe = context.ownerDocument.createElement('div');
  probe.style.border = '0';
  probe.style.inlineSize = trimmedValue;
  probe.style.margin = '0';
  probe.style.opacity = '0';
  probe.style.padding = '0';
  probe.style.pointerEvents = 'none';
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  context.appendChild(probe);
  const resolvedPx = probe.getBoundingClientRect().width;
  probe.remove();

  return Number.isFinite(resolvedPx) && resolvedPx > 0 ? resolvedPx : fallbackPx;
}

export function previewShellWidthToRem(context: HTMLElement, widthPx: number): string {
  const rootFontSizePx = Number.parseFloat(
    getElementComputedStyle(context.ownerDocument.documentElement as HTMLElement).fontSize || '16',
  );
  const safeRootFontSizePx = Number.isFinite(rootFontSizePx) && rootFontSizePx > 0
    ? rootFontSizePx
    : 16;
  const widthRem = Math.round((widthPx / safeRootFontSizePx) * 1000) / 1000;
  return `${widthRem}rem`;
}

export function clampPreviewShellWidth(value: number, minPx: number, maxPx: number): number {
  return Math.max(minPx, Math.min(maxPx, value));
}

export function readPreviewShellWidth(
  application: HTMLElement,
  storageKey: string,
): number | null {
  const rawValue = volatileShellWidthState.get(storageKey);
  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    return null;
  }

  const trimmedValue = rawValue.trim();
  const parsedWidth = Number.parseFloat(trimmedValue);
  if (!Number.isFinite(parsedWidth)) {
    return null;
  }

  if (/^-?\d+(\.\d+)?$/.test(trimmedValue)) {
    return parsedWidth;
  }

  const resolvedWidthPx = resolvePreviewShellCssLengthPx(application, trimmedValue, -1);
  return Number.isFinite(resolvedWidthPx) && resolvedWidthPx > 0 ? resolvedWidthPx : null;
}

export function writePreviewShellWidth(
  application: HTMLElement,
  storageKey: string,
  widthPx: number,
): void {
  volatileShellWidthState.set(storageKey, previewShellWidthToRem(application, widthPx));
}

export function clearPreviewShellWidth(storageKey: string): void {
  volatileShellWidthState.delete(storageKey);
}

export function bindPreviewShellResize(
  options: PreviewShellResizeBindingOptions,
): () => void {
  const documentRoot = options.application.ownerDocument.documentElement as HTMLElement;
  const shellWindow = getElementWindow(options.application);

  function getBounds() {
    const computedStyle = getElementComputedStyle(options.application);
    const minPx = resolvePreviewShellCssLengthPx(
      options.application,
      computedStyle.getPropertyValue(options.minWidthProperty) || options.fallbackMinWidth,
      resolvePreviewShellCssLengthPx(options.application, options.fallbackMinWidth, 160),
    );
    const maxPx = resolvePreviewShellCssLengthPx(
      options.application,
      computedStyle.getPropertyValue(options.maxWidthProperty) || options.fallbackMaxWidth,
      resolvePreviewShellCssLengthPx(options.application, options.fallbackMaxWidth, 320),
    );

    return {
      minPx,
      maxPx: Math.max(minPx, maxPx),
    };
  }

  function getCurrentWidthPx() {
    const measuredWidth = options.measureWidth();
    if (measuredWidth > 0) {
      return measuredWidth;
    }

    const computedStyle = getElementComputedStyle(options.application);
    return resolvePreviewShellCssLengthPx(
      options.application,
      computedStyle.getPropertyValue(options.widthProperty)
        || computedStyle.getPropertyValue(options.legacyWidthProperty)
        || options.fallbackWidth,
      resolvePreviewShellCssLengthPx(options.application, options.fallbackWidth, 240),
    );
  }

  function updateHandleA11y(widthPx = getCurrentWidthPx()) {
    if (!options.handle.hasAttribute('role')) {
      options.handle.setAttribute('role', 'separator');
    }

    if (!options.handle.hasAttribute('aria-orientation')) {
      options.handle.setAttribute('aria-orientation', 'vertical');
    }

    if (!options.handle.hasAttribute('aria-label')) {
      options.handle.setAttribute('aria-label', options.ariaLabel);
    }

    const enabled = options.isEnabled();
    options.handle.setAttribute('aria-disabled', String(!enabled));
    options.handle.tabIndex = enabled ? 0 : -1;

    if (!enabled) {
      return;
    }

    const { minPx, maxPx } = getBounds();
    options.handle.setAttribute('aria-valuemin', String(Math.round(minPx)));
    options.handle.setAttribute('aria-valuemax', String(Math.round(maxPx)));
    options.handle.setAttribute(
      'aria-valuenow',
      String(Math.round(clampPreviewShellWidth(widthPx, minPx, maxPx))),
    );
  }

  function applyWidth(widthPx: number, persist: boolean) {
    const { minPx, maxPx } = getBounds();
    const nextWidthPx = clampPreviewShellWidth(widthPx, minPx, maxPx);
    const nextWidthCss = previewShellWidthToRem(documentRoot, nextWidthPx);
    options.application.style.setProperty(options.widthProperty, nextWidthCss);
    options.application.style.setProperty(options.legacyWidthProperty, nextWidthCss);
    updateHandleA11y(nextWidthPx);

    if (persist) {
      writePreviewShellWidth(options.application, options.storageKey, nextWidthPx);
    }

    return nextWidthPx;
  }

  function resetWidth() {
    options.application.style.removeProperty(options.widthProperty);
    options.application.style.removeProperty(options.legacyWidthProperty);
    clearPreviewShellWidth(options.storageKey);
    updateHandleA11y();
  }

  const persistedWidth = readPreviewShellWidth(options.application, options.storageKey);
  if (persistedWidth !== null) {
    applyWidth(persistedWidth, false);
  } else {
    updateHandleA11y();
  }

  const onDoubleClick = () => {
    resetWidth();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!options.isEnabled()) {
      return;
    }

    const currentWidthPx = getCurrentWidthPx();
    const stepPx = resolvePreviewShellCssLengthPx(options.application, '1rem', 16);
    const adjustedStepPx = event.shiftKey ? stepPx * 3 : stepPx;
    const { minPx, maxPx } = getBounds();

    if (event.key === 'ArrowLeft') {
      applyWidth(currentWidthPx - adjustedStepPx, true);
      event.preventDefault();
      return;
    }

    if (event.key === 'ArrowRight') {
      applyWidth(currentWidthPx + adjustedStepPx, true);
      event.preventDefault();
      return;
    }

    if (event.key === 'Home') {
      applyWidth(minPx, true);
      event.preventDefault();
      return;
    }

    if (event.key === 'End') {
      applyWidth(maxPx, true);
      event.preventDefault();
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !options.isEnabled()) {
      return;
    }

    event.preventDefault();
    const shellRect = options.application.getBoundingClientRect();
    options.application.classList.add(options.resizingClass);
    options.handle.setPointerCapture(event.pointerId);
    let finished = false;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const nextWidthPx = options.pointerWidthFromEvent(shellRect, moveEvent);
      applyWidth(nextWidthPx, false);
    };

    const finishResize = () => {
      if (finished) {
        return;
      }

      finished = true;
      options.application.classList.remove(options.resizingClass);
      applyWidth(getCurrentWidthPx(), true);
      options.handle.removeEventListener('pointermove', onPointerMove);
      options.handle.removeEventListener('pointerup', finishResize);
      options.handle.removeEventListener('pointercancel', finishResize);
      options.handle.removeEventListener('lostpointercapture', finishResize);
      shellWindow.removeEventListener('pointermove', onPointerMove);
      shellWindow.removeEventListener('pointerup', finishResize);
      shellWindow.removeEventListener('pointercancel', finishResize);

      if (options.handle.hasPointerCapture(event.pointerId)) {
        options.handle.releasePointerCapture(event.pointerId);
      }
    };

    options.handle.addEventListener('pointermove', onPointerMove);
    options.handle.addEventListener('pointerup', finishResize, { once: true });
    options.handle.addEventListener('pointercancel', finishResize, { once: true });
    options.handle.addEventListener('lostpointercapture', finishResize, { once: true });
    shellWindow.addEventListener('pointermove', onPointerMove);
    shellWindow.addEventListener('pointerup', finishResize, { once: true });
    shellWindow.addEventListener('pointercancel', finishResize, { once: true });
  };

  const onWindowResize = () => {
    if (options.isEnabled()) {
      applyWidth(getCurrentWidthPx(), false);
      return;
    }

    updateHandleA11y();
  };

  options.handle.addEventListener('dblclick', onDoubleClick);
  options.handle.addEventListener('keydown', onKeyDown);
  options.handle.addEventListener('pointerdown', onPointerDown);
  shellWindow.addEventListener('resize', onWindowResize);

  return () => {
    options.handle.removeEventListener('dblclick', onDoubleClick);
    options.handle.removeEventListener('keydown', onKeyDown);
    options.handle.removeEventListener('pointerdown', onPointerDown);
    shellWindow.removeEventListener('resize', onWindowResize);
  };
}

export function initPreviewShellResizeBindings(
  options: PreviewShellResizeBindingsInitOptions,
): () => void {
  if (!isHtmlElement(options.application)) {
    return () => {};
  }

  const teardowns: Array<() => void> = [];

  if (isHtmlElement(options.navigation) && isHtmlElement(options.navigationHandle)) {
    const navigation = options.navigation;
    teardowns.push(bindPreviewShellResize({
      application: options.application,
      handle: options.navigationHandle,
      resizingClass: 'is-resizing-navigation',
      storageKey: 'diagram-generator:preview-navigation-width',
      widthProperty: '--bf-application-navigation-width',
      legacyWidthProperty: '--bf-app-navigation-width',
      minWidthProperty: '--dg-component-nav-width-min',
      maxWidthProperty: '--dg-component-nav-width-max',
      fallbackWidth: '12rem',
      fallbackMinWidth: '10rem',
      fallbackMaxWidth: '16rem',
      isEnabled: () => !navigation.classList.contains('is-collapsed')
        && (options.desktopMedia ? options.desktopMedia.matches : true),
      measureWidth: () => navigation.getBoundingClientRect().width,
      pointerWidthFromEvent: (shellRect, moveEvent) => moveEvent.clientX - shellRect.left,
      ariaLabel: 'Resize components panel',
    }));
  }

  if (isHtmlElement(options.aside) && isHtmlElement(options.asideHandle)) {
    const aside = options.aside;
    teardowns.push(bindPreviewShellResize({
      application: options.application,
      handle: options.asideHandle,
      resizingClass: 'is-resizing-aside',
      storageKey: 'diagram-generator:preview-aside-width',
      widthProperty: '--bf-application-aside-width',
      legacyWidthProperty: '--bf-app-aside-width',
      minWidthProperty: '--dg-preview-aside-width-min',
      maxWidthProperty: '--dg-preview-aside-width-max',
      fallbackWidth: '22rem',
      fallbackMinWidth: '18rem',
      fallbackMaxWidth: '36rem',
      isEnabled: () => !aside.classList.contains('is-collapsed')
        && !aside.classList.contains('is-overlay')
        && !aside.classList.contains('is-drawer'),
      measureWidth: () => aside.getBoundingClientRect().width,
      pointerWidthFromEvent: (shellRect, moveEvent) => shellRect.right - moveEvent.clientX,
      ariaLabel: 'Resize inspector panel',
    }));
  }

  return () => {
    teardowns.forEach((teardown) => teardown());
  };
}

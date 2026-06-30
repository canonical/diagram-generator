/**
 * Preview diagram navigation helpers (spec 043 app slice G).
 *
 * These helpers own picker option extraction, browse-link sync, and picker
 * stepping so editor.js stays focused on shell wiring and fetch callbacks.
 */

export interface PreviewDiagramOptionEntry {
  value: string;
  label: string;
}

export interface PreviewDiagramNavigationInitOptions {
  picker: HTMLSelectElement;
  prevButton?: Element | null;
  nextButton?: Element | null;
  browseLinks?: Element[] | null;
  getCurrentPath: () => string;
  syncBrowseNav: () => void;
  fetchIndexHtml: () => Promise<string | null>;
  attemptNavigation: (nextUrl: string | null | undefined, syncUi: () => void) => boolean;
  requestAnimationFrameFn?: ((callback: FrameRequestCallback) => number) | null;
  addPageshowListener?: ((handler: () => void) => void) | null;
}

function optionAt(picker: HTMLSelectElement, index: number): HTMLOptionElement | null {
  return index >= 0 && index < picker.options.length ? picker.options[index]! : null;
}

export function normalizePreviewDiagramPath(
  nextUrl: string | null | undefined,
  origin: string,
): string {
  try {
    return canonicalizePreviewDiagramPath(new URL(String(nextUrl || ''), origin).pathname);
  } catch {
    return '';
  }
}

export function canonicalizePreviewDiagramPath(path: string | null | undefined): string {
  return String(path || '');
}

export function extractPreviewDiagramOptionEntries(
  links: Array<{ href: string | null | undefined; label: string | null | undefined }>,
): PreviewDiagramOptionEntry[] {
  const entries: PreviewDiagramOptionEntry[] = [];
  const seen = new Set<string>();

  for (const link of links) {
    const href = String(link.href || '');
    if (!href || seen.has(href)) {
      continue;
    }
    seen.add(href);
    entries.push({
      value: href,
      label: String(link.label || '').trim()
        || href.replace('/force/view/', '').replace('/view/', ''),
    });
  }

  return entries;
}

export function syncPreviewDiagramPickerToPath(
  picker: HTMLSelectElement,
  currentPath: string,
): boolean {
  let matched = false;
  const canonicalCurrentPath = canonicalizePreviewDiagramPath(currentPath);
  for (let index = 0; index < picker.options.length; index += 1) {
    const option = optionAt(picker, index);
    if (!option) {
      continue;
    }
    const isMatch = canonicalizePreviewDiagramPath(option.value) === canonicalCurrentPath;
    option.selected = isMatch;
    if (isMatch) {
      picker.selectedIndex = index;
      picker.value = option.value;
      matched = true;
    }
  }

  if (!matched) {
    picker.value = canonicalCurrentPath;
  }

  return matched;
}

export function resolveSteppedPreviewDiagramUrl(
  picker: HTMLSelectElement,
  delta: number,
): string {
  if (picker.options.length === 0) {
    return '';
  }
  const nextIndex = picker.selectedIndex + delta;
  const option = optionAt(picker, nextIndex);
  return option ? option.value || '' : '';
}

export function syncPreviewBrowseLinksToPath(
  browseLinks: Element[],
  currentPath: string,
): void {
  const canonicalCurrentPath = canonicalizePreviewDiagramPath(currentPath);
  browseLinks.forEach((link) => {
    const active = canonicalizePreviewDiagramPath(link.getAttribute('href')) === canonicalCurrentPath;
    link.classList.toggle('is-active', active);
    if (active) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function isPrimaryPlainLeftClick(event: MouseEvent): boolean {
  return !event.defaultPrevented
    && event.button === 0
    && !event.metaKey
    && !event.ctrlKey
    && !event.shiftKey
    && !event.altKey;
}

export function initPreviewDiagramNavigation(
  options: PreviewDiagramNavigationInitOptions,
): void {
  const browseLinks = options.browseLinks ?? [];

  const syncNavToLocation = () => {
    syncPreviewDiagramPickerToPath(options.picker, options.getCurrentPath());
    options.syncBrowseNav();
  };

  const populateDiagramOptions = async () => {
    if (options.picker.options.length > 0) {
      syncNavToLocation();
      return;
    }

    try {
      const html = await options.fetchIndexHtml();
      if (!html) {
        return;
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const links = Array.from(doc.querySelectorAll('a[href^="/view/"], a[href^="/force/view/"]')).map((link) => ({
        href: link.getAttribute('href'),
        label: link.textContent,
      }));
      const entries = extractPreviewDiagramOptionEntries(links);
      entries.forEach((entry) => {
        const option = options.picker.ownerDocument.createElement('option');
        option.value = entry.value;
        option.textContent = entry.label;
        options.picker.append(option);
      });
      syncNavToLocation();
    } catch {
      // Leave the picker empty if the index cannot be fetched.
    }
  };

  options.picker.addEventListener('change', () => {
    options.attemptNavigation(options.picker.value, syncNavToLocation);
  });

  if (options.prevButton) {
    options.prevButton.addEventListener('click', () => {
      const nextUrl = resolveSteppedPreviewDiagramUrl(options.picker, -1);
      if (nextUrl) {
        options.attemptNavigation(nextUrl, syncNavToLocation);
      }
    });
  }

  if (options.nextButton) {
    options.nextButton.addEventListener('click', () => {
      const nextUrl = resolveSteppedPreviewDiagramUrl(options.picker, 1);
      if (nextUrl) {
        options.attemptNavigation(nextUrl, syncNavToLocation);
      }
    });
  }

  browseLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      if (!(event instanceof MouseEvent) || !isPrimaryPlainLeftClick(event)) {
        return;
      }
      event.preventDefault();
      options.attemptNavigation(link.getAttribute('href'), syncNavToLocation);
    });
  });

  syncNavToLocation();
  options.requestAnimationFrameFn?.(syncNavToLocation);
  options.addPageshowListener?.(syncNavToLocation);
  void populateDiagramOptions();
}

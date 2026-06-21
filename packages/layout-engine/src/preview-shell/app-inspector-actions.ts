export interface PreviewInspectorActionElement {
  dataset?: Record<string, string | undefined>;
  value?: string;
  checked?: boolean;
  closest?: (selector: string) => unknown;
  getAttribute?: (name: string) => string | null;
  blur?: () => void;
}

export interface PreviewInspectorActionEventLike {
  target?: unknown;
  key?: string;
  preventDefault?: () => void;
  stopPropagation?: () => void;
}

export interface PreviewInspectorActionHost {
  addEventListener: (
    type: 'click' | 'change' | 'input' | 'keydown',
    listener: (event: PreviewInspectorActionEventLike) => void,
  ) => void;
}

export interface BindPreviewInspectorActionsOptions {
  inspector?: PreviewInspectorActionHost | null;
  alreadyBound?: boolean;
  warnUnknownAction: (kind: 'click' | 'change' | 'input', action: string, actionEl: unknown) => void;
  setFrameAlign: (cid: string | undefined, align: string | undefined) => void;
  clearOverride: (cid: string | undefined) => void;
  alignSelection: (mode: string | undefined) => void;
  distributeSelection: (axis: string | undefined) => void;
  setMultiFrameAlign: (align: string | undefined) => void;
  applyStyleOverride: (cid: string | undefined, value: unknown) => void;
  setFrameProp: (cid: string | undefined, prop: string | undefined, value: unknown) => void;
  setFrameSize: (cid: string | undefined, dimension: string | undefined, value: unknown) => void;
  setWidthUnit: (value: unknown, cid?: string | undefined) => void;
  setHeightUnit: (value: unknown, cid?: string | undefined) => void;
  applyMultiStyleOverride: (value: unknown) => void;
  setMultiFrameProp: (prop: string | undefined, value: unknown) => void;
  setMultiFrameSize: (dimension: string | undefined, value: unknown) => void;
  setMultiActionGap: (value: string | undefined) => void;
}

function dataValue(element: PreviewInspectorActionElement | null | undefined, key: string): string {
  const value = element?.dataset?.[key];
  return typeof value === 'string' ? value : '';
}

export function resolvePreviewInspectorActionElement(
  event: PreviewInspectorActionEventLike | null | undefined,
  attrName: string,
): PreviewInspectorActionElement | null {
  const target = event?.target;
  if (!target || typeof target !== 'object') return null;
  const actionTarget = target as PreviewInspectorActionElement;
  if (typeof actionTarget.closest !== 'function') return null;
  const match = actionTarget.closest(`[${attrName}]`);
  return match && typeof match === 'object' ? (match as PreviewInspectorActionElement) : null;
}

export function readPreviewInspectorActionValue(control: PreviewInspectorActionElement | null | undefined): unknown {
  const valueType = dataValue(control, 'dgValueType');
  if (valueType === 'checked') return Boolean(control?.checked);
  if (valueType === 'int') return Number.parseInt(control?.value ?? '', 10);
  if (valueType === 'float') return Number.parseFloat(control?.value ?? '');
  return control?.value;
}

export function dispatchPreviewInspectorClickAction(
  actionEl: PreviewInspectorActionElement,
  options: BindPreviewInspectorActionsOptions,
): void {
  const action = dataValue(actionEl, 'dgClickAction');
  if (action === 'single-align') {
    options.setFrameAlign(dataValue(actionEl, 'dgCid'), dataValue(actionEl, 'dgAlign'));
    return;
  }
  if (action === 'clear-override') {
    options.clearOverride(dataValue(actionEl, 'dgCid'));
    return;
  }
  if (action === 'align-selection') {
    options.alignSelection(dataValue(actionEl, 'dgMode'));
    return;
  }
  if (action === 'distribute-selection') {
    options.distributeSelection(dataValue(actionEl, 'dgAxis'));
    return;
  }
  if (action === 'multi-align') {
    options.setMultiFrameAlign(dataValue(actionEl, 'dgAlign'));
    return;
  }
  options.warnUnknownAction('click', action, actionEl);
}

export function dispatchPreviewInspectorChangeAction(
  actionEl: PreviewInspectorActionElement,
  options: BindPreviewInspectorActionsOptions,
): void {
  const action = dataValue(actionEl, 'dgChangeAction');
  const value = readPreviewInspectorActionValue(actionEl);
  if (action === 'single-style') {
    options.applyStyleOverride(dataValue(actionEl, 'dgCid'), value);
    return;
  }
  if (action === 'single-prop') {
    options.setFrameProp(dataValue(actionEl, 'dgCid'), dataValue(actionEl, 'dgProp'), value);
    return;
  }
  if (action === 'single-size') {
    options.setFrameSize(dataValue(actionEl, 'dgCid'), dataValue(actionEl, 'dgDimension'), value);
    return;
  }
  if (action === 'single-width-unit') {
    options.setWidthUnit(value, dataValue(actionEl, 'dgCid'));
    return;
  }
  if (action === 'single-height-unit') {
    options.setHeightUnit(value, dataValue(actionEl, 'dgCid'));
    return;
  }
  if (action === 'multi-style') {
    options.applyMultiStyleOverride(value);
    return;
  }
  if (action === 'multi-prop') {
    options.setMultiFrameProp(dataValue(actionEl, 'dgProp'), value);
    return;
  }
  if (action === 'multi-size') {
    options.setMultiFrameSize(dataValue(actionEl, 'dgDimension'), value);
    return;
  }
  if (action === 'multi-width-unit') {
    options.setWidthUnit(value);
    return;
  }
  if (action === 'multi-height-unit') {
    options.setHeightUnit(value);
    return;
  }
  options.warnUnknownAction('change', action, actionEl);
}

export function dispatchPreviewInspectorInputAction(
  actionEl: PreviewInspectorActionElement,
  options: BindPreviewInspectorActionsOptions,
): void {
  const action = dataValue(actionEl, 'dgInputAction');
  if (action === 'multi-gap') {
    options.setMultiActionGap(actionEl.value);
    return;
  }
  options.warnUnknownAction('input', action, actionEl);
}

export function bindPreviewInspectorActions(options: BindPreviewInspectorActionsOptions): boolean {
  if (!options.inspector || options.alreadyBound) {
    return Boolean(options.alreadyBound);
  }

  options.inspector.addEventListener('click', (event) => {
    const actionEl = resolvePreviewInspectorActionElement(event, 'data-dg-click-action');
    if (!actionEl) return;
    dispatchPreviewInspectorClickAction(actionEl, options);
  });

  options.inspector.addEventListener('change', (event) => {
    const actionEl = resolvePreviewInspectorActionElement(event, 'data-dg-change-action');
    if (!actionEl) return;
    dispatchPreviewInspectorChangeAction(actionEl, options);
  });

  options.inspector.addEventListener('input', (event) => {
    const actionEl = resolvePreviewInspectorActionElement(event, 'data-dg-input-action');
    if (!actionEl) return;
    dispatchPreviewInspectorInputAction(actionEl, options);
  });

  options.inspector.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    const actionEl = resolvePreviewInspectorActionElement(event, 'data-dg-enter-commit');
    if (!actionEl || actionEl.getAttribute?.('data-dg-enter-commit') !== '1') return;
    event.preventDefault?.();
    event.stopPropagation?.();
    actionEl.blur?.();
  });

  return true;
}

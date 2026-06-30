import type {
  PreviewControlKind,
  PreviewControlSpec,
  PreviewControlVisibilityRule,
  PreviewPersistNamespace,
} from './types.js';

export interface PreviewParamSpec {
  key: string;
  label: string;
  group: string;
  kind: PreviewControlKind;
  defaultValue: string;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  enumValues?: ReadonlyArray<{ readonly value: string; readonly label: string }>;
  visibleWhen?: ReadonlyArray<PreviewControlVisibilityRule>;
}

export function paramSpecToPreviewControl(
  spec: PreviewParamSpec,
  persistNamespace: PreviewPersistNamespace,
): PreviewControlSpec {
  return {
    key: spec.key,
    label: spec.label,
    group: spec.group,
    kind: spec.kind,
    defaultValue: spec.defaultValue,
    description: spec.description,
    min: spec.min,
    max: spec.max,
    step: spec.step,
    enumValues: spec.enumValues,
    visibleWhen: spec.visibleWhen,
    persistNamespace,
  };
}

function asRuleValues(value: string | ReadonlyArray<string> | undefined): string[] {
  if (Array.isArray(value)) {
    return [...value];
  }
  return typeof value === 'string' ? [value] : [];
}

export function previewControlVisibilityMatches(
  values: Record<string, unknown>,
  rule: PreviewControlVisibilityRule,
): boolean {
  const currentValue = String(values[rule.key] ?? '');
  const equals = asRuleValues(rule.equals);
  if (equals.length > 0 && !equals.includes(currentValue)) {
    return false;
  }
  const notEquals = asRuleValues(rule.notEquals);
  if (notEquals.length > 0 && notEquals.includes(currentValue)) {
    return false;
  }
  return true;
}

export function visiblePreviewControlSpecs(
  specs: readonly PreviewControlSpec[],
  values: Record<string, unknown>,
): PreviewControlSpec[] {
  return specs.filter((spec) => (
    !spec.visibleWhen
    || spec.visibleWhen.every((rule) => previewControlVisibilityMatches(values, rule))
  ));
}

export function previewControlDisplayValues(
  merged: Record<string, unknown>,
  specs: readonly PreviewControlSpec[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const spec of specs) {
    const raw = merged[spec.key];
    out[spec.key] = raw != null && String(raw) !== '' ? String(raw) : spec.defaultValue;
  }
  return out;
}

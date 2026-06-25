import type {
  PreviewControlKind,
  PreviewControlSpec,
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
    persistNamespace,
  };
}

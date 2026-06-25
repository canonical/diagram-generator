import type { ElkParamSpec } from '@diagram-generator/graph-layout-elk';
import { ELK_FORCE_PARAM_SPECS, ELK_LAYERED_PARAM_SPECS } from '@diagram-generator/graph-layout-elk';
import type { PreviewControlSpec } from './types.js';
import { paramSpecToPreviewControl } from './control-specs.js';

export function elkParamToPreviewControl(spec: ElkParamSpec): PreviewControlSpec {
  return paramSpecToPreviewControl(spec, 'meta.elk');
}

export function elkLayeredPreviewControlSpecs(): PreviewControlSpec[] {
  return ELK_LAYERED_PARAM_SPECS.map(elkParamToPreviewControl);
}

export function elkForcePreviewControlSpecs(): PreviewControlSpec[] {
  return ELK_FORCE_PARAM_SPECS.map(elkParamToPreviewControl);
}

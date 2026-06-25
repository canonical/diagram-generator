import { DAGRE_PARAM_SPECS, type DagreParamSpec } from '@diagram-generator/graph-layout-dagre';
import { paramSpecToPreviewControl } from './control-specs.js';
import type { PreviewControlSpec } from './types.js';

export function dagreParamToPreviewControl(spec: DagreParamSpec): PreviewControlSpec {
  return paramSpecToPreviewControl(spec, 'meta.dagre');
}

export function dagrePreviewControlSpecs(): PreviewControlSpec[] {
  return DAGRE_PARAM_SPECS.map(dagreParamToPreviewControl);
}

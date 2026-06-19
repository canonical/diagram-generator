import { BUILTIN_PREVIEW_ENGINES } from './builtins.js';
import { BUILTIN_PREVIEW_FRAME_DIAGRAM_RENDER_ADAPTERS } from './builtin-render-adapters.js';
import { registerPreviewEngine } from './registry.js';
import { registerPreviewFrameDiagramRenderAdapter } from './render.js';

let builtinPreviewEngineRuntimeInstalled = false;

export function installBuiltinPreviewEngineRuntime(): void {
  if (builtinPreviewEngineRuntimeInstalled) {
    return;
  }
  builtinPreviewEngineRuntimeInstalled = true;

  for (const manifest of BUILTIN_PREVIEW_ENGINES) {
    registerPreviewEngine(manifest);
  }
  for (const entry of BUILTIN_PREVIEW_FRAME_DIAGRAM_RENDER_ADAPTERS) {
    registerPreviewFrameDiagramRenderAdapter(entry.renderFamily, entry.adapter);
  }
}

installBuiltinPreviewEngineRuntime();

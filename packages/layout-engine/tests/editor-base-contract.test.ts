import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

describe('editor-base browser contract accessors', () => {
  beforeAll(async () => {
    const g = globalThis as unknown as Record<string, unknown>;
    if (!g.window) {
      g.window = g;
    }
    await import('../../../scripts/preview/editor-base.js');
  });

  beforeEach(() => {
    const win = window as unknown as Record<string, unknown>;
    win.LayoutEngine = {
      previewBridge: {
        relayout: { relayout: 'contract' },
        render: { render: 'contract' },
        host: { host: 'contract' },
      },
      core: { token: 'core' },
      previewEngines: {
        elk: { elk: 'contract' },
      },
      previewShell: {
        scene: { scene: 'contract' },
        inspector: { inspector: 'contract' },
        interaction: { interaction: 'contract' },
        bootstrap: { bootstrap: 'contract' },
      },
    } as unknown;
    delete win.__DG_previewBridgeRenderHost;
    delete win.__DG_previewBridgeHostRuntime;
  });

  it('returns each required contract from __DG_ accessors', () => {
    const win = window as unknown as Record<string, unknown>;
    const getRelayout = (win.__DG_getPreviewBridgeRelayoutContract as () => unknown)();
    const getBundleRender = (win.__DG_getPreviewBridgeBundleRenderContract as () => unknown)();
    const getCore = (win.__DG_getPreviewCoreContract as () => unknown)();
    const getElk = (win.__DG_getPreviewElkEngineContract as () => unknown)();
    const getScene = (win.__DG_getPreviewShellSceneContract as () => unknown)();
    const getInspector = (win.__DG_getPreviewShellInspectorContract as () => unknown)();
    const getInteraction = (win.__DG_getPreviewShellInteractionContract as () => unknown)();
    const getBootstrap = (win.__DG_getPreviewShellBootstrapContract as () => unknown)();

    expect(getRelayout).toEqual({ relayout: 'contract' });
    expect(getBundleRender).toEqual({ render: 'contract' });
    expect(getCore).toEqual({ token: 'core' });
    expect(getElk).toEqual({ elk: 'contract' });
    expect(getScene).toEqual({ scene: 'contract' });
    expect(getInspector).toEqual({ inspector: 'contract' });
    expect(getInteraction).toEqual({ interaction: 'contract' });
    expect(getBootstrap).toEqual({ bootstrap: 'contract' });
  });

  it('merges editor host override for bridge render and host contracts', () => {
    const win = window as unknown as Record<string, unknown>;
    const renderContract = win.__DG_getPreviewBridgeRenderContract as () => {
      [key: string]: unknown;
    };
    const hostContract = win.__DG_getPreviewBridgeHostContract as () => {
      [key: string]: unknown;
    };

    win.__DG_previewBridgeRenderHost = { host: true, render: 'host-render' };
    win.__DG_previewBridgeHostRuntime = { host: true, hostRuntime: 'yes' };

    const mergedRender = renderContract();
    const mergedHost = hostContract();

    expect(mergedRender).toEqual({ render: 'host-render', host: true });
    expect(mergedHost).toEqual({ host: true, hostRuntime: 'yes' });
  });
});

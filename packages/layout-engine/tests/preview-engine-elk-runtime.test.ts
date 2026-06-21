import { describe, expect, it, vi } from 'vitest';
import { createPreviewElkLayoutControlsRuntime } from '../src/preview-engine/elk-layout-controls.js';
import { createPreviewElkShellControllerRuntime } from '../src/preview-engine/elk-shell-controller.js';

describe('elk preview runtimes', () => {
  it('builds the ELK controls panel from registered engine metadata', () => {
    const section = {
      hidden: true,
      querySelector() {
        return null;
      },
    };
    const container = {
      innerHTML: '%ELK_LAYOUT_CONTROLS_HTML%',
      textContent: '',
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
    };
    const runtime = createPreviewElkLayoutControlsRuntime({
      document: {
        getElementById(id: string) {
          if (id === 'elk-layout-section') return section as never;
          if (id === 'elk-layout-controls') return container as never;
          return null;
        },
      },
      previewWindow: {
        __DG_CONFIG: {},
      },
      layoutEngineRoot: {
        previewEngines: {
          registry: {
            resolvePreviewEngine({ layoutEngine }) {
              return layoutEngine === 'elk-layered'
                ? { id: 'synthetic-layered', hostView: { sidebarSections: ['elk-layout'] } } as never
                : null;
            },
            listPreviewEnginesBySidebarSection(sectionName) {
              if (sectionName !== 'elk-layout') return [];
              return [
                {
                  id: 'synthetic-layered',
                  hostView: { sidebarSections: ['elk-layout'] },
                  controlSpecs: [
                    {
                      key: 'elk.spacing.nodeNode',
                      label: 'Node spacing',
                      group: 'Spacing',
                      kind: 'number',
                      defaultValue: '24',
                      step: 8,
                    },
                  ],
                } as never,
              ];
            },
          },
          elk: {
            elkParamGroups() {
              return [
                {
                  group: 'Spacing',
                  specs: [
                    {
                      key: 'elk.spacing.nodeNode',
                      label: 'Node spacing',
                      group: 'Spacing',
                      kind: 'number',
                      defaultValue: '24',
                      step: 8,
                    },
                  ],
                },
              ];
            },
          },
        },
      },
    });

    runtime.buildPanel({ layoutEngine: 'elk-layered', elkLayout: {} });

    expect(section.hidden).toBe(false);
    expect(container.innerHTML).toContain('Node spacing');
  });

  it('resolves ELK activity and relayout through generic layout callbacks', async () => {
    const requestLayoutRelayout = vi.fn(async () => undefined);
    const previewEngineLayoutControls = {
      init() {},
      refresh() {},
      collectOverrides: () => ({ 'elk.spacing.nodeNode': '32' }),
    };
    const runtime = createPreviewElkShellControllerRuntime({
      document: {
        getElementById() {
          return { hasAttribute: () => true };
        },
      },
      previewWindow: {
        __DG_CONFIG: {},
        PreviewEngineLayoutControls: previewEngineLayoutControls,
        ElkLayoutControls: previewEngineLayoutControls,
      },
      layoutEngineRoot: {
        previewEngines: {
          registry: {
            resolvePreviewEngine({ layoutEngine }) {
              return layoutEngine === 'elk-layered'
                ? { id: 'synthetic-layered', hostView: { sidebarSections: ['elk-layout'] } } as never
                : null;
            },
          },
        },
      },
      getFrameTreeJson: () => ({ layoutEngine: 'elk-layered' }),
    });

    const setLayoutOverrides = vi.fn();
    runtime.init({
      getLayoutOverrides: () => ({ existing: true }),
      setLayoutOverrides,
      getRootId: () => 'root',
      requestLayoutRelayout,
    });

    expect(runtime.isElkLayeredDiagram({ layoutEngine: 'elk-layered' })).toBe(true);
    runtime.wirePanel();
    expect(runtime.collectPersistedPayload({ ok: true }, { layoutOverrides: {} })).toEqual({
      ok: true,
      engine_layout_overrides: {
        'meta.elk': { 'elk.spacing.nodeNode': '32' },
      },
      elk_layout_overrides: { 'elk.spacing.nodeNode': '32' },
    });

    await runtime.requestRelayout();

    expect(setLayoutOverrides).toHaveBeenCalled();
    expect(requestLayoutRelayout).toHaveBeenCalledWith('root');
  });
});

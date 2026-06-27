import { describe, expect, it, vi } from 'vitest';
import {
  createPreviewElkLayoutControlsRuntime,
  createPreviewEngineLayoutControlsRuntime,
} from '../src/preview-engine/elk-layout-controls.js';
import {
  createPreviewElkShellControllerRuntime,
  createPreviewEngineShellControllerRuntime,
} from '../src/preview-engine/elk-shell-controller.js';

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
                ? {
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
                  } as never
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

  it('builds controls from the active ELK-family engine', () => {
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
              if (layoutEngine === 'elk-force') {
                return {
                  id: 'elk-force',
                  hostView: { sidebarSections: ['elk-layout'] },
                  controlSpecs: [
                    {
                      key: 'elk.randomSeed',
                      label: 'Random seed',
                      group: 'Graph',
                      kind: 'number',
                      defaultValue: '0',
                    },
                  ],
                } as never;
              }
              return null;
            },
            listPreviewEnginesBySidebarSection(sectionName) {
              if (sectionName !== 'elk-layout') return [];
              return [];
            },
          },
        },
      },
    });

    runtime.buildPanel({ layoutEngine: 'elk-force', elkLayout: {} });

    expect(section.hidden).toBe(false);
    expect(container.innerHTML).toContain('Random seed');
    expect(container.innerHTML).not.toContain('Layer gap');
  });

  it('builds generic graph controls for Dagre from the active manifest namespace', () => {
    const section = {
      hidden: true,
      querySelector() {
        return null;
      },
    };
    const controls = new Map<string, {
      id: string;
      value: string;
      checked?: boolean;
      dataset: Record<string, string>;
      addEventListener: () => void;
    }>();
    const container = {
      innerHTML: '%ELK_LAYOUT_CONTROLS_HTML%',
      textContent: '',
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [...controls.values()];
      },
    };
    const runtime = createPreviewEngineLayoutControlsRuntime({
      document: {
        getElementById(id: string) {
          if (id === 'graph-layout-section') return section as never;
          if (id === 'graph-layout-controls') return container as never;
          return (controls.get(id) as never) ?? null;
        },
      },
      previewWindow: {
        __DG_CONFIG: {},
      },
      layoutEngineRoot: {
        previewEngines: {
          registry: {
            resolvePreviewEngine({ layoutEngine }) {
              if (layoutEngine === 'dagre') {
                return {
                  id: 'dagre',
                  hostView: { sidebarSections: ['graph-layout'] },
                  controlSpecs: [
                    {
                      key: 'dagre.rankdir',
                      label: 'Direction',
                      group: 'Graph',
                      kind: 'enum',
                      defaultValue: 'TB',
                      persistNamespace: 'meta.dagre',
                      enumValues: [
                        { value: 'TB', label: 'Top to bottom' },
                        { value: 'LR', label: 'Left to right' },
                      ],
                    },
                    {
                      key: 'dagre.ranksep',
                      label: 'Rank gap',
                      group: 'Spacing',
                      kind: 'number',
                      defaultValue: '96',
                      persistNamespace: 'meta.dagre',
                    },
                  ],
                } as never;
              }
              return null;
            },
            listPreviewEnginesBySidebarSection(sectionName) {
              if (sectionName !== 'graph-layout') return [];
              return [];
            },
          },
        },
      },
      getFrameTreeJson: () => ({
        layoutEngine: 'dagre',
        engineLayout: {
          'meta.dagre': {
            'dagre.rankdir': 'LR',
          },
        },
      }),
      sidebarSectionId: 'graph-layout',
      sectionId: 'graph-layout-section',
      containerId: 'graph-layout-controls',
      controlIdPrefix: 'graph-layout',
      defaultPersistNamespace: 'meta.dagre',
      enableElkViewToggles: false,
    });

    runtime.buildPanel({
      layoutEngine: 'dagre',
      engineLayout: {
        'meta.dagre': {
          'dagre.rankdir': 'LR',
        },
      },
    });
    controls.set('graph-layout-dagre-rankdir', {
      id: 'graph-layout-dagre-rankdir',
      value: 'LR',
      dataset: { dgEngineLayoutKey: 'dagre.rankdir', dgPersistNamespace: 'meta.dagre' },
      addEventListener: () => {},
    });
    controls.set('graph-layout-dagre-ranksep', {
      id: 'graph-layout-dagre-ranksep',
      value: '128',
      dataset: { dgEngineLayoutKey: 'dagre.ranksep', dgPersistNamespace: 'meta.dagre' },
      addEventListener: () => {},
    });

    expect(section.hidden).toBe(false);
    expect(container.innerHTML).toContain('Direction');
    expect(container.innerHTML).toContain('Rank gap');
    expect(container.innerHTML).not.toContain('elk-raw-view-toggle');
    expect(runtime.collectNamespacedOverrides()).toEqual({
      'meta.dagre': {
        'dagre.rankdir': 'LR',
        'dagre.ranksep': '128',
      },
    });
  });

  it('hides and disables stale ELK controls when the active engine is not ELK', () => {
    const controlAttrs = new Map<string, string>();
    const staleControl = {
      id: 'elk-spacing-nodeNode',
      value: '64',
      disabled: false,
      hasAttribute(name: string) {
        return controlAttrs.has(name);
      },
      getAttribute(name: string) {
        return controlAttrs.get(name) ?? null;
      },
      setAttribute(name: string, value: string) {
        controlAttrs.set(name, value);
      },
      removeAttribute(name: string) {
        controlAttrs.delete(name);
      },
    };
    const sectionAttrs = new Map<string, string>();
    const section = {
      hidden: false,
      inert: false,
      setAttribute(name: string, value: string) {
        sectionAttrs.set(name, value);
      },
      removeAttribute(name: string) {
        sectionAttrs.delete(name);
      },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [staleControl];
      },
    };
    const container = {
      innerHTML: '<input id="elk-spacing-nodeNode" data-elk-key="elk.spacing.nodeNode" value="64">',
      textContent: '',
      querySelector(selector: string) {
        return selector === '[data-elk-key]' ? staleControl : null;
      },
      querySelectorAll() {
        return [staleControl];
      },
    };
    const runtime = createPreviewElkLayoutControlsRuntime({
      document: {
        getElementById(id: string) {
          if (id === 'elk-layout-section') return section as never;
          if (id === 'elk-layout-controls') return container as never;
          if (id === 'elk-spacing-nodeNode') return staleControl as never;
          return null;
        },
      },
      previewWindow: {
        __DG_CONFIG: { layout_engine: 'v3' },
      },
      layoutEngineRoot: {
        previewEngines: {
          registry: {
            resolvePreviewEngine({ layoutEngine }) {
              return layoutEngine === 'elk-layered'
                ? { id: 'synthetic-layered', hostView: { sidebarSections: ['elk-layout'] } } as never
                : { id: 'v3', hostView: { sidebarSections: [] } } as never;
            },
            listPreviewEnginesBySidebarSection() {
              return [];
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
      getFrameTreeJson: () => ({ layoutEngine: 'v3' }),
    });

    runtime.buildPanel({ layoutEngine: 'v3' });

    expect(section.hidden).toBe(true);
    expect(section.inert).toBe(true);
    expect(sectionAttrs.get('aria-hidden')).toBe('true');
    expect(staleControl.disabled).toBe(true);
    expect(controlAttrs.get('tabindex')).toBe('-1');
    expect(runtime.collectOverrides()).toEqual({});
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

  it('persists generic graph layout controls under the active engine namespace', () => {
    const previewEngineLayoutControls = {
      init() {},
      refresh() {},
      collectOverrides: () => ({ 'dagre.rankdir': 'LR' }),
      collectNamespacedOverrides: () => ({
        'meta.dagre': { 'dagre.rankdir': 'LR' },
      }),
    };
    const runtime = createPreviewEngineShellControllerRuntime({
      document: {
        getElementById() {
          return { hasAttribute: () => true };
        },
      },
      previewWindow: {
        __DG_CONFIG: {},
        PreviewEngineLayoutControls: previewEngineLayoutControls,
      },
      layoutEngineRoot: {
        previewEngines: {
          registry: {
            resolvePreviewEngine({ layoutEngine }) {
              return layoutEngine === 'dagre'
                ? {
                    id: 'dagre',
                    hostView: { sidebarSections: ['graph-layout'] },
                    controlSpecs: [
                      {
                        key: 'dagre.rankdir',
                        label: 'Direction',
                        group: 'Graph',
                        kind: 'enum',
                        defaultValue: 'TB',
                        persistNamespace: 'meta.dagre',
                      },
                    ],
                  } as never
                : null;
            },
          },
        },
      },
      getFrameTreeJson: () => ({ layoutEngine: 'dagre' }),
      sidebarSectionId: 'graph-layout',
      defaultPersistNamespace: 'meta.dagre',
    });

    runtime.init({
      getLayoutOverrides: () => ({}),
      setLayoutOverrides: () => {},
      getRootId: () => 'root',
      requestLayoutRelayout: () => undefined,
    });

    expect(runtime.isActiveLayoutEngine({ layoutEngine: 'dagre' })).toBe(true);
    expect(runtime.collectPersistedPayload({ ok: true }, { layoutOverrides: {} })).toEqual({
      ok: true,
      engine_layout_overrides: {
        'meta.dagre': { 'dagre.rankdir': 'LR' },
      },
    });
  });
});

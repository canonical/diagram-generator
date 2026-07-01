import { describe, expect, it, vi } from 'vitest';
import {
  createPreviewEngineLayoutControlsRuntime,
  createPreviewEngineShellControllerRuntime,
} from '../src/preview-engine/index.js';
import { readLayoutOperatorOverrideState } from '../src/preview-shell/layout-operator-overrides.js';

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
    const runtime = createPreviewEngineLayoutControlsRuntime({
      document: {
        getElementById(id: string) {
          if (id === 'layout-params-section') return section as never;
          if (id === 'layout-params-controls') return container as never;
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
                    hostView: { sidebarSections: ['layout-params'] },
                    capabilities: { rawDebugView: true },
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
              if (sectionName !== 'layout-params') return [];
              return [
                {
                  id: 'synthetic-layered',
                  hostView: { sidebarSections: ['layout-params'] },
                  capabilities: { rawDebugView: true },
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
    expect(container.innerHTML).toContain('elk-raw-view-toggle');
    expect(container.innerHTML).not.toContain('Replaces BF styling');
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
    const runtime = createPreviewEngineLayoutControlsRuntime({
      document: {
        getElementById(id: string) {
          if (id === 'layout-params-section') return section as never;
          if (id === 'layout-params-controls') return container as never;
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
                  hostView: { sidebarSections: ['layout-params'] },
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
              if (sectionName !== 'layout-params') return [];
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

  it('rebuilds existing controls against the current active ELK-family engine', () => {
    const section = {
      hidden: true,
      querySelector() {
        return null;
      },
    };
    const forceControl = {
      id: 'layout-params-elk-randomSeed',
      value: '12',
      dataset: { dgEngineLayoutKey: 'elk.randomSeed', dgPersistNamespace: 'meta.elk' },
      addEventListener: () => {},
    };
    const container = {
      innerHTML: '<input id="layout-params-elk-randomSeed" data-dg-engine-layout-key="elk.randomSeed">',
      textContent: '',
      querySelector(selector: string) {
        return selector === '[data-dg-engine-layout-key], [data-elk-key]' ? forceControl : null;
      },
      querySelectorAll() {
        return [forceControl];
      },
    };
    const runtime = createPreviewEngineLayoutControlsRuntime({
      document: {
        getElementById(id: string) {
          if (id === 'layout-params-section') return section as never;
          if (id === 'layout-params-controls') return container as never;
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
              if (layoutEngine === 'elk-layered') {
                return {
                  id: 'elk-layered',
                    hostView: { sidebarSections: ['layout-params'] },
                  controlSpecs: [
                    {
                      key: 'elk.layered.layering.strategy',
                      label: 'Layering strategy',
                      group: 'Layering',
                      kind: 'enum',
                      defaultValue: 'NETWORK_SIMPLEX',
                      enumValues: [{ value: 'NETWORK_SIMPLEX', label: 'Network simplex' }],
                    },
                  ],
                } as never;
              }
              return null;
            },
            listPreviewEnginesBySidebarSection() {
              return [];
            },
          },
        },
      },
      getFrameTreeJson: () => ({
        layoutEngine: 'elk-layered',
        elkLayout: {},
      }),
    });

    runtime.buildPanel();

    expect(section.hidden).toBe(false);
    expect(container.innerHTML).toContain('Layering strategy');
    expect(container.innerHTML).toContain('layout-params-elk-layered-layering-strategy');
    expect(container.innerHTML).not.toContain('elk.randomSeed');
  });

  it('filters shared ELK grouping metadata to the active algorithm specs', () => {
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
    const runtime = createPreviewEngineLayoutControlsRuntime({
      document: {
        getElementById(id: string) {
          if (id === 'layout-params-section') return section as never;
          if (id === 'layout-params-controls') return container as never;
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
              if (layoutEngine === 'elk-radial') {
                return {
                  id: 'elk-radial',
                  hostView: { sidebarSections: ['layout-params'] },
                  controlSpecs: [
                    {
                      key: 'elk.spacing.nodeNode',
                      label: 'Node spacing',
                      group: 'Spacing',
                      kind: 'number',
                      defaultValue: '24',
                    },
                  ],
                } as never;
              }
              return null;
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
                    },
                  ],
                },
                {
                  group: 'Layering',
                  specs: [
                    {
                      key: 'elk.layered.layering.strategy',
                      label: 'Layering strategy',
                      group: 'Layering',
                      kind: 'enum',
                      defaultValue: 'NETWORK_SIMPLEX',
                      enumValues: [{ value: 'NETWORK_SIMPLEX', label: 'Network simplex' }],
                    },
                  ],
                },
              ];
            },
          },
        },
      },
    });

    runtime.buildPanel({ layoutEngine: 'elk-radial', elkLayout: {} });

    expect(section.hidden).toBe(false);
    expect(container.innerHTML).toContain('Node spacing');
    expect(container.innerHTML).not.toContain('Layering strategy');
    expect(container.innerHTML).not.toContain('elk-elk-layered-layering-strategy');
  });

  it('filters dependency-gated controls from registry metadata without engine-specific UI branching', () => {
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
    let sessionOverrides: Record<string, unknown> = {};
    const runtime = createPreviewEngineLayoutControlsRuntime({
      document: {
        getElementById(id: string) {
          if (id === 'layout-params-section') return section as never;
          if (id === 'layout-params-controls') return container as never;
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
                  hostView: { sidebarSections: ['layout-params'] },
                  controlSpecs: [
                    {
                      key: 'elk.force.model',
                      label: 'Force model',
                      group: 'Graph',
                      kind: 'enum',
                      defaultValue: 'FRUCHTERMAN_REINGOLD',
                      enumValues: [
                        { value: 'FRUCHTERMAN_REINGOLD', label: 'Fruchterman-Reingold' },
                        { value: 'EADES', label: 'Eades' },
                      ],
                    },
                    {
                      key: 'elk.force.temperature',
                      label: 'FR temperature',
                      group: 'Graph',
                      kind: 'number',
                      defaultValue: '0.001',
                      visibleWhen: [{ key: 'elk.force.model', equals: 'FRUCHTERMAN_REINGOLD' }],
                    },
                    {
                      key: 'elk.force.repulsion',
                      label: 'Eades repulsion',
                      group: 'Graph',
                      kind: 'number',
                      defaultValue: '5',
                      visibleWhen: [{ key: 'elk.force.model', equals: 'EADES' }],
                    },
                  ],
                } as never;
              }
              return null;
            },
            listPreviewEnginesBySidebarSection() {
              return [];
            },
          },
        },
      },
      getFrameTreeJson: () => ({
        layoutEngine: 'elk-force',
        engineLayout: {
          'meta.elk': {},
        },
      }),
    });

    runtime.init({
      getOverrides: () => sessionOverrides,
      setOverrides: (next) => {
        sessionOverrides = next;
      },
    });

    runtime.buildPanel({ layoutEngine: 'elk-force', engineLayout: { 'meta.elk': {} } });
    expect(container.innerHTML).toContain('FR temperature');
    expect(container.innerHTML).not.toContain('Eades repulsion');

    sessionOverrides = { 'elk.force.model': 'EADES' };
    runtime.buildPanel({ layoutEngine: 'elk-force', engineLayout: { 'meta.elk': {} } });
    expect(container.innerHTML).not.toContain('FR temperature');
    expect(container.innerHTML).toContain('Eades repulsion');
  });

  it('prunes hidden dependency-gated overrides from session state when the driver control changes', () => {
    const section = {
      hidden: true,
      querySelector() {
        return null;
      },
    };
    const listeners = new Map<string, () => void>();
    const controls = new Map<string, {
      id: string;
      value: string;
      checked?: boolean;
      dataset: Record<string, string>;
      addEventListener: (type: string, listener: () => void) => void;
    }>();
    const container = {
      innerHTML: '%ELK_LAYOUT_CONTROLS_HTML%',
      textContent: '',
      querySelector(selector: string) {
        return selector === '[data-dg-engine-layout-key], [data-elk-key]'
          ? controls.values().next().value ?? null
          : null;
      },
      querySelectorAll() {
        return [...controls.values()];
      },
    };
    let sessionOverrides: Record<string, unknown> = {
      'elk.force.model': 'FRUCHTERMAN_REINGOLD',
      'elk.force.temperature': 0.02,
    };
    const previewWindow: {
      __DG_CONFIG: Record<string, unknown>;
      __DG_lastEditorMutationTransactionResult?: unknown;
    } = {
      __DG_CONFIG: {},
    };
    const runtime = createPreviewEngineLayoutControlsRuntime({
      document: {
        getElementById(id: string) {
          if (id === 'layout-params-section') return section as never;
          if (id === 'layout-params-controls') return container as never;
          return (controls.get(id) as never) ?? null;
        },
      },
      previewWindow,
      layoutEngineRoot: {
        previewEngines: {
          registry: {
            resolvePreviewEngine({ layoutEngine }) {
              if (layoutEngine === 'elk-force') {
                return {
                  id: 'elk-force',
                  hostView: { sidebarSections: ['layout-params'] },
                  controlSpecs: [
                    {
                      key: 'elk.force.model',
                      label: 'Force model',
                      group: 'Graph',
                      kind: 'enum',
                      defaultValue: 'FRUCHTERMAN_REINGOLD',
                      enumValues: [
                        { value: 'FRUCHTERMAN_REINGOLD', label: 'Fruchterman-Reingold' },
                        { value: 'EADES', label: 'Eades' },
                      ],
                    },
                    {
                      key: 'elk.force.temperature',
                      label: 'FR temperature',
                      group: 'Graph',
                      kind: 'number',
                      defaultValue: '0.001',
                      visibleWhen: [{ key: 'elk.force.model', equals: 'FRUCHTERMAN_REINGOLD' }],
                    },
                    {
                      key: 'elk.force.repulsion',
                      label: 'Eades repulsion',
                      group: 'Graph',
                      kind: 'number',
                      defaultValue: '5',
                      visibleWhen: [{ key: 'elk.force.model', equals: 'EADES' }],
                    },
                  ],
                } as never;
              }
              return null;
            },
            listPreviewEnginesBySidebarSection() {
              return [];
            },
          },
        },
      },
      getFrameTreeJson: () => ({
        layoutEngine: 'elk-force',
        engineLayout: {
          'meta.elk': {},
        },
      }),
    });

    runtime.init({
      getOverrides: () => sessionOverrides,
      setOverrides: (next) => {
        sessionOverrides = next;
      },
    });

    controls.set('layout-params-elk-force-model', {
      id: 'layout-params-elk-force-model',
      value: 'FRUCHTERMAN_REINGOLD',
      dataset: { dgEngineLayoutKey: 'elk.force.model', dgPersistNamespace: 'meta.elk' },
      addEventListener(type, listener) {
        listeners.set(`elk.force.model:${type}`, listener);
      },
    });
    controls.set('layout-params-elk-force-temperature', {
      id: 'layout-params-elk-force-temperature',
      value: '0.02',
      dataset: { dgEngineLayoutKey: 'elk.force.temperature', dgPersistNamespace: 'meta.elk' },
      addEventListener(type, listener) {
        listeners.set(`elk.force.temperature:${type}`, listener);
      },
    });

    runtime.buildPanel({ layoutEngine: 'elk-force', engineLayout: { 'meta.elk': {} } });

    controls.get('layout-params-elk-force-model')!.value = 'EADES';
    listeners.get('elk.force.model:change')?.();

    expect(sessionOverrides).toEqual({
      'elk.force.model': 'EADES',
    });
    expect(previewWindow.__DG_lastEditorMutationTransactionResult).toEqual(
      expect.objectContaining({
        kind: 'committed',
        mutationKind: 'engine-option',
        sourceControl: 'layout-params-controls',
        relayoutPolicy: 'engine',
        dirtyPolicy: 'mark-dirty',
        undoPolicy: 'none',
        persistenceDelta: {
          layoutOverridesChanged: true,
          savePayloadChanged: true,
        },
      }),
    );
    expect(runtime.collectOverrides()).toEqual({
      'elk.force.model': 'EADES',
    });
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
          if (id === 'layout-params-section') return section as never;
          if (id === 'layout-params-controls') return container as never;
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
                  hostView: { sidebarSections: ['layout-params'] },
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
              if (sectionName !== 'layout-params') return [];
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
      sidebarSectionId: 'layout-params',
      sectionId: 'layout-params-section',
      containerId: 'layout-params-controls',
      controlIdPrefix: 'layout-params',
      defaultPersistNamespace: 'meta.dagre',
      enableRawViewToggles: false,
    });

    runtime.buildPanel({
      layoutEngine: 'dagre',
      engineLayout: {
        'meta.dagre': {
          'dagre.rankdir': 'LR',
        },
      },
    });
    controls.set('layout-params-dagre-rankdir', {
      id: 'layout-params-dagre-rankdir',
      value: 'LR',
      dataset: { dgEngineLayoutKey: 'dagre.rankdir', dgPersistNamespace: 'meta.dagre' },
      addEventListener: () => {},
    });
    controls.set('layout-params-dagre-ranksep', {
      id: 'layout-params-dagre-ranksep',
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
        'dagre.ranksep': 128,
      },
    });
  });

  it('hides and clears stale ELK controls when the active engine is not ELK', () => {
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
      style: { display: '' },
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
    const runtime = createPreviewEngineLayoutControlsRuntime({
      document: {
        getElementById(id: string) {
          if (id === 'layout-params-section') return section as never;
          if (id === 'layout-params-controls') return container as never;
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
                ? { id: 'synthetic-layered', hostView: { sidebarSections: ['layout-params'] } } as never
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
    expect(section.style.display).toBe('none');
    expect(sectionAttrs.get('aria-hidden')).toBe('true');
    expect(container.innerHTML).toBe('');
    expect(runtime.collectOverrides()).toEqual({});
  });

  it('resolves ELK activity and relayout through generic layout callbacks', async () => {
    const requestLayoutRelayout = vi.fn(async () => undefined);
    const previewEngineLayoutControls = {
      init() {},
      refresh() {},
      collectOverrides: () => ({ 'elk.spacing.nodeNode': '32' }),
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
              return layoutEngine === 'elk-layered'
                ? { id: 'synthetic-layered', hostView: { sidebarSections: ['layout-params'] } } as never
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

    expect(runtime.isActiveLayoutEngine({ layoutEngine: 'elk-layered' })).toBe(true);
    runtime.wirePanel();
    expect(runtime.collectPersistedPayload({ ok: true }, { layoutOverrides: {} })).toEqual({
      ok: true,
      engine_layout_overrides: {
        'meta.elk': { 'elk.spacing.nodeNode': '32' },
      },
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
                    hostView: { sidebarSections: ['layout-params'] },
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
      sidebarSectionId: 'layout-params',
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

  it('does not re-merge stale flat override keys into persisted engine namespaces', () => {
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
                    hostView: { sidebarSections: ['layout-params'] },
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
      sidebarSectionId: 'layout-params',
      defaultPersistNamespace: 'meta.dagre',
    });

    runtime.init({
      getLayoutOverrides: () => ({ stale: true }),
      setLayoutOverrides: () => {},
      getRootId: () => 'root',
      requestLayoutRelayout: () => undefined,
    });

    const model = {
      layoutOverrides: { stale: true },
      layoutOverrideNamespace: 'meta.dagre',
    };
    expect(runtime.collectPersistedPayload({ ok: true }, model)).toEqual({
      ok: true,
      engine_layout_overrides: {
        'meta.dagre': { 'dagre.rankdir': 'LR' },
      },
    });
    expect(model).toMatchObject({
      layoutOverrides: { 'dagre.rankdir': 'LR' },
      layoutOverrideNamespace: 'meta.dagre',
      previewInterpreterActiveNodeId: 'dagre',
      previewInterpreterNodeRegistry: {
        paramsByNodeId: {
          dagre: { 'dagre.rankdir': 'LR' },
        },
      },
    });
    expect(readLayoutOperatorOverrideState(model)).toEqual({
      activeOperatorKey: 'dagre',
      byOperator: {
        dagre: { 'dagre.rankdir': 'LR' },
      },
    });
  });
});

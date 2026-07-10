import { describe, expect, it } from 'vitest';

import { loadFrameYamlFromString } from '../src/frame-yaml-loader.js';

function findFrameById(frame: { id: string; children: Array<any> }, id: string): any | null {
  if (frame.id === id) return frame;
  for (const child of frame.children) {
    const found = findFrameById(child, id);
    if (found) return found;
  }
  return null;
}

describe('configured frame role assignment', () => {
  it('assigns root source compounds as sections and target compounds as parents', () => {
    const diagram = loadFrameYamlFromString([
      'engine: v3',
      'title: role profile',
      'meta:',
      '  frame_roles:',
      '    strategy: root-edge-source-section-target-parent',
      'arrows:',
      '  - source: provider_leaf',
      '    target: consumer_leaf',
      '  - source: provider_leaf',
      '    target: endpoint_leaf',
      'root:',
      '  id: page',
      '  children:',
      '    - id: provider',
      '      heading: Provider',
      '      children:',
      '        - id: provider_leaf',
      '          label: [Provider leaf]',
      '    - id: consumer',
      '      heading: Consumer',
      '      children:',
      '        - id: consumer_leaf',
      '          label: [Consumer leaf]',
      '    - id: endpoint',
      '      heading: Endpoint',
      '      children:',
      '        - id: endpoint_leaf',
      '          label: [Endpoint leaf]',
      '',
    ].join('\n'));

    expect(findFrameById(diagram.root, 'provider')?.level).toBe(3);
    expect(findFrameById(diagram.root, 'provider')?.resolvedFill).toBe('transparent');
    expect(findFrameById(diagram.root, 'consumer')?.level).toBe(2);
    expect(findFrameById(diagram.root, 'consumer')?.resolvedFill).toBe('#F3F3F3');
    expect(findFrameById(diagram.root, 'endpoint')?.level).toBe(2);
    expect(findFrameById(diagram.root, 'endpoint')?.resolvedFill).toBe('#F3F3F3');
  });

  it('does not override explicit authored levels', () => {
    const diagram = loadFrameYamlFromString([
      'engine: v3',
      'title: explicit level wins',
      'meta:',
      '  frame_roles:',
      '    strategy: root-edge-source-section-target-parent',
      'arrows:',
      '  - source: provider_leaf',
      '    target: consumer_leaf',
      'root:',
      '  id: page',
      '  children:',
      '    - id: provider',
      '      level: 2',
      '      heading: Provider',
      '      children:',
      '        - id: provider_leaf',
      '          label: [Provider leaf]',
      '    - id: consumer',
      '      heading: Consumer',
      '      children:',
      '        - id: consumer_leaf',
      '          label: [Consumer leaf]',
      '',
    ].join('\n'));

    expect(findFrameById(diagram.root, 'provider')?.level).toBe(2);
    expect(findFrameById(diagram.root, 'provider')?.resolvedFill).toBe('#F3F3F3');
    expect(findFrameById(diagram.root, 'consumer')?.level).toBe(2);
  });
});

import { describe, expect, it } from 'vitest';

import { findCommonAncestor, type TreeData } from '../src/index.js';

function treeData(parentById: TreeData['parentById']): TreeData {
  return {
    parentById,
    childrenById: {
      root: ['cluster_a', 'cluster_b'],
      cluster_a: ['leaf_a1', 'leaf_a2'],
      cluster_b: ['leaf_b1'],
    },
  };
}

describe('findCommonAncestor', () => {
  it('returns the shared parent for siblings', () => {
    expect(findCommonAncestor('leaf_a1', 'leaf_a2', treeData({
      cluster_a: 'root',
      cluster_b: 'root',
      leaf_a1: 'cluster_a',
      leaf_a2: 'cluster_a',
      leaf_b1: 'cluster_b',
    }))).toBe('cluster_a');
  });

  it('returns the ancestor when one node contains the other', () => {
    expect(findCommonAncestor('leaf_a1', 'cluster_a', treeData({
      cluster_a: 'root',
      leaf_a1: 'cluster_a',
    }))).toBe('cluster_a');
  });

  it('returns the lowest shared ancestor across branches', () => {
    expect(findCommonAncestor('leaf_a1', 'leaf_b1', treeData({
      cluster_a: 'root',
      cluster_b: 'root',
      leaf_a1: 'cluster_a',
      leaf_b1: 'cluster_b',
    }))).toBe('root');
  });

  it('returns the parent for self-edges', () => {
    expect(findCommonAncestor('leaf_a1', 'leaf_a1', treeData({
      cluster_a: 'root',
      leaf_a1: 'cluster_a',
    }))).toBe('cluster_a');
  });

  it('falls back to root when parentage is missing', () => {
    expect(findCommonAncestor('orphan_a', 'orphan_b', treeData({}))).toBe('root');
  });
});
